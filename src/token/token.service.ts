import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TokenEntity, TokenPriceHistory } from './token.entity';
import { DataSource, LessThan, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationDto } from '@app/email/email.dto';
import { EmailService } from '@app/email/email.service';
import axios from 'axios';
import * as https from 'https';
import { UserService } from '@app/user/user.service';
import { UserEntity } from '@app/user/user.entity';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  constructor(
    private readonly emailService: EmailService,
    private readonly userService: UserService,
    private readonly connection: DataSource,

    @InjectRepository(TokenEntity)
    private readonly tokenRipo: Repository<TokenEntity>,
  ) {}

  private async featchData() {
    const web3ApiKey =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6IjYwZmJlZjg5LWM4NTItNGNhYS1iMmNiLWYzYzEyYTNjNGI2OSIsIm9yZ0lkIjoiNDE3OTI2IiwidXNlcklkIjoiNDI5Nzc2IiwidHlwZUlkIjoiOTYwZDY0NjYtMjBiYS00ZTMyLThjZmMtM2MxNTUyODU3MjJkIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3MzI1MjY3MDIsImV4cCI6NDg4ODI4NjcwMn0.JsMkF-Vku8tlcQzcef4hoF7BQf2l6o7DpWSHFbmiarY';
    const headers = { accept: 'application/json', 'X-API-Key': web3ApiKey };
    const networkData = [
      {
        name: 'Ethereum',
        id: '0x1',
        wrappedTokenAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      },
      {
        name: 'Polygon',
        id: '0x89',
        wrappedTokenAddress: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      },
      // {"name":"Binance","id":"0x38","wrappedTokenAddress":"0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"},
      // {"name":"Avalanche","id":"0xa86a","wrappedTokenAddress":"0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7"},
      // {"name":"Fantom","id":"0xfa","wrappedTokenAddress":"0x21be370D5312f44cB42ce377BC9b8a0cEF1A4C83"},
      // {"name":"Cronos","id":"0x19","wrappedTokenAddress":"0x5C7F8A570d578ED84E63fdFA7b1eE72dEae1AE23"}
    ];

    const httpsAgent = new https.Agent({
      rejectUnauthorized: false, // Use `true` with a valid CA
    });

    try {
      const resultPromises: any = networkData.map(async (network) => {
        return await axios
          .get(
            'https://deep-index.moralis.io/api/v2/erc20/' +
              network.wrappedTokenAddress +
              '/price?chain=' +
              network.id,
            { headers, httpsAgent },
          )
          .then((response) => ({
            usdPrice: response.data.usdPrice,
            tokenAddress: response.data.tokenAddress,
            tokenName: response.data.tokenName,
            tokenSymbol: response.data.tokenSymbol,
          }));
      });

      const result: any = await Promise.all(resultPromises);
      return result;
    } catch (error) {
      console.error('Error fetching data:', error);
      return [];
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCron() {
    const tokenResponse = await this.featchData();
    if (tokenResponse && tokenResponse.length > 0) {
      tokenResponse.forEach(async (token) => {
        try {
          //validate
          if (
            !token.tokenAddress ||
            !token.tokenName ||
            !token.tokenSymbol ||
            token.usdPrice == null
          ) {
            throw new Error(`Invalid token data: ${JSON.stringify(token)}`);
          }

          let tokenEntity = await this.tokenRipo.findOne({
            where: { tokenAddress: token.tokenAddress },
          });

          if (tokenEntity) {
            // Update existing token
            console.log(`update existing token`);
            await this.connection.transaction(async (manager) => {
              //Use Transactions to Ensure Atomicity
              const tokenRepo = manager.getRepository(TokenEntity);
              const historyRepo = manager.getRepository(TokenPriceHistory);

              // Update token price
              await tokenRepo.update(
                { id: tokenEntity.id },
                {
                  tokenName: token.tokenName,
                  usdPrice: token.usdPrice,
                },
              );

              // Save historical price
              let history = new TokenPriceHistory();
              history.token = tokenEntity;
              history.usdPrice = token.usdPrice;
              await historyRepo.save(history);
            });

            // Calculate the price change
            await this.checkPriceIncrease(tokenEntity);
          } else {
            // Create new token entry
            console.log(`Create new token entry`);
            await this.connection.transaction(async (manager) => {
              //Use Transactions to Ensure Atomicity
              const tokenRepo = manager.getRepository(TokenEntity);
              const historyRepo = manager.getRepository(TokenPriceHistory);

              let newTokenEntity = new TokenEntity();
              newTokenEntity.tokenAddress = token.tokenAddress;
              newTokenEntity.tokenName = token.tokenName;
              newTokenEntity.tokenSymbol = token.tokenSymbol;
              newTokenEntity.usdPrice = token.usdPrice;

              // Save token entity
              let newToken = await tokenRepo.save(newTokenEntity);

              // Save token price history
              let history = new TokenPriceHistory();
              history.usdPrice = newToken.usdPrice;
              history.token = newToken;
              await historyRepo.save(history);
            });
          }
        } catch (error) {
          this.logger.error(
            `Failed to process token: ${token.tokenName}`,
            error.stack,
          );
        }
      });
    }
  }

  private async checkPriceIncrease(tokenEntity: TokenEntity) {
    console.log(`checkPriceIncrease`);
    try {
      // Calculate one hour ago timestamp
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      // Find the price from one hour ago in the token's history
      const historicalPriceRecord = tokenEntity.token_history.find(
        (history) => new Date(history.timestamp) <= oneHourAgo,
      );

      if (!historicalPriceRecord) {
        console.log('No historical price available from one hour ago.');
        return;
      }

      // Parse the historical price and current price
      const historicalPrice = parseFloat(
        String(historicalPriceRecord.usdPrice),
      );
      const currentPrice = parseFloat(String(tokenEntity.usdPrice));

      // Calculate the percentage increase
      const priceIncreasePercentage =
        ((currentPrice - historicalPrice) / historicalPrice) * 100;

      // email if the price increase exceeds 3%
      if (priceIncreasePercentage > 3) {
        console.log(
          `Price increased by ${priceIncreasePercentage.toFixed(2)}% for token ${tokenEntity.tokenName} (${tokenEntity.tokenSymbol})`,
        );
        console.log('Historical Price =>', historicalPrice);
        console.log('Current Price =>', currentPrice);

        await this.notifyPriceIncrease(
          tokenEntity.tokenName,
          priceIncreasePercentage.toFixed(2),
          tokenEntity.tokenSymbol,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to process checkPriceIncrease token: ${tokenEntity.tokenName}`,
        error.stack,
      );
    }
  }

  private async notifyPriceIncrease(
    token: string,
    newPrice: string,
    tokenSymbol: string,
  ) {
    try {
      const users = await this.userService.getAllUsers();
      for (const user of users) {
        const email: NotificationDto = {
          to: user.email,
          subject: `${token} ${tokenSymbol} price has risen by 3%`,
          text: `
         Hello ${user.email || ''}, 
          
          We have an exciting update! The price of ${token} (${tokenSymbol}) has increased by 3% in the past hour and is now ${newPrice}.
          
          Details:
          - Token: ${token} (${tokenSymbol})
          - Price: ${newPrice}
          - Change: +3% (in the last 1 hour)
          
          Additional Information:
          - Assignment completed by: melaku.girma.fr@gmail.com
          -Assignment URL: https://hyperhire.notion.site/Blockchain-Node-js-52e737665c7a42cabf6e8c38ad868d26
          - Status: Actively looking for job opportunities (Open to work)
          - GitHub Repository: [Blockchain Price Tracker Assignment](https://github.com/MelakuGirma13/Blockchain-price-tracker-Assignment)
          
          Best regards,  
          Melaku.G
          `,
        };

        await this.emailService.notifyEmail(email);
        console.log(`Email sent to ${user.email}.`);
      }

      console.log('All notification emails sent.');
    } catch (error) {
      this.logger.error(
        `Failed to send email: ${token}, ${tokenSymbol}`,
        error.stack,
      );
    }
  }

  async getByTokenSymbole(tokenSymbol: string): Promise<TokenEntity> {
    return await this.tokenRipo.findOne({
      where: { tokenSymbol: tokenSymbol },
    });
  }
  async getToken(tokenId: number): Promise<TokenEntity> {
    return await this.tokenRipo.findOne({
      where: { id: tokenId },
    });
  }

  async getPriceOfEachHour(): Promise<any> {
    const now = new Date();
    const past24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let tokenEntities2 = await this.tokenRipo
      .createQueryBuilder('token')
      .leftJoinAndSelect('token.token_history', 'history')
      .select([
        // 'token.id',
        // 'token.tokenAddress',
        'token.tokenName',
        'token.tokenSymbol',
        'AVG(history.usdPrice) as avgPrice',
        "DATE_TRUNC('hour', history.timestamp) as hour",
      ])
      .where('history.timestamp >= :past24Hours', {
        past24Hours: past24Hours.toISOString(),
      })
      .groupBy('token.id, hour') // Group by token and truncated hour
      .orderBy('hour', 'ASC')
      .getRawMany();

    return tokenEntities2;
  }
}

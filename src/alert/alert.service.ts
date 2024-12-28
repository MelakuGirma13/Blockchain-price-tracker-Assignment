import { Injectable, Logger } from '@nestjs/common';
import { AlertEntity } from '@app/alert/alert.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserService } from '@app/user/user.service';
import { TokenService } from '@app/token/token.service';
import { EmailService } from '@app/email/email.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationDto } from '@app/email/email.dto';
import { AlertResponseInterface } from './alert.dto';

@Injectable()
export class AlertService {
  private readonly logger = new Logger(AlertService.name);
  constructor(
    @InjectRepository(AlertEntity)
    private readonly alertRipo: Repository<AlertEntity>,

    private readonly userSvc: UserService,
    private readonly tokenSvc: TokenService,
    private readonly emailSvc: EmailService,
  ) {}

  async SetAlert(query: any): Promise<AlertEntity> {
    try {
      let user = await this.userSvc.findByEmail(query.email);
      let token = await this.tokenSvc.getByTokenSymbole(query.chain);

      let newAlert = new AlertEntity();
      newAlert.triggerType = 0; //increase
      newAlert.triggerPrice = query.dollar;
      newAlert.user = user;
      newAlert.token = token;

      return await this.alertRipo.save(newAlert);
    } catch (error) {
      this.logger.error(
        `Failed to process create Alert: ${query.chain} , ${query.email}, ${query.dollar}`,
        error.stack,
      );
    }
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkPriceIncrease() {
    try {
      const alerts = await this.alertRipo.find({
        relations: ['user', 'token'], 
      });

      for (const alert of alerts) {
        const currentPrice = (await this.tokenSvc.getToken(alert.token.id))
          .usdPrice; 

        if (alert.triggerType === 0 && currentPrice >= alert.triggerPrice) {
          // Trigger alert if the price has increased to or beyond the target
          const emailContent = `
           Hello,
           
          The price of ${alert.token.tokenName} has reached $${currentPrice},
           which is above your set alert price of $${alert.triggerPrice}.
          
        Additional Information:
        - Assignment completed by: melaku.girma.fr@gmail.com
        - Status: Actively looking for job opportunities (Open to work)
        - GitHub Repository: [Blockchain Price Tracker Assignment](https://github.com/MelakuGirma13/Blockchain-price-tracker-Assignment)
        
        Best regards,  
        Melaku.G
           `;

          const email: NotificationDto = {
            to: alert.user.email,
            subject: `The price of ${alert.token.tokenName} has reached $${currentPrice}`,
            text: emailContent,
          };
          await this.emailSvc.notifyEmail(email);

          this.logger.log(
            `Alert triggered for user ${alert.user.email} for token ${alert.token.tokenName}. Current Price: ${currentPrice}`,
          );

          // Remove or deactivate alert after sending email
          await this.alertRipo.remove(alert);
        }
      }
    } catch (error) {
      this.logger.error(
        'Error while checking price increase alerts',
        error.stack,
      );
    }
  }

  buildAlertResponse(alret: AlertEntity): AlertResponseInterface {
    return {
      alert: { ...alret },
    };
  }
}

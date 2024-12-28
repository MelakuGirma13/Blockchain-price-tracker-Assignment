import {  Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenController } from './token.controller';
import { TokenService } from '@app/token/token.service';
import { TokenEntity, TokenPriceHistory } from './token.entity';
import { HttpModule } from '@nestjs/axios';
import { EmailModule } from '@app/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TokenEntity, TokenPriceHistory]),
    HttpModule,
    EmailModule,
  ],
  controllers: [TokenController],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}

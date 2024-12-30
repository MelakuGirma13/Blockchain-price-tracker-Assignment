import {  Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenController } from './token.controller';
import { TokenService } from '@app/token/token.service';
import { TokenEntity, TokenPriceHistory } from './token.entity';
import { HttpModule } from '@nestjs/axios';
import { EmailModule } from '@app/email/email.module';
import { UserModule } from '@app/user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TokenEntity, TokenPriceHistory]),
    HttpModule,
    EmailModule,
    UserModule
  ],
  controllers: [TokenController],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}

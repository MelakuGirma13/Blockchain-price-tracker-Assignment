import { forwardRef, Module } from '@nestjs/common';
import { AlertService } from '@app/alert/alert.service';
import { AlertController } from './alert.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AlertEntity } from '@app/alert/alert.entity';
import { UserEntity } from 'src/user/user.entity';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserService } from '@app/user/user.service';
import { UserModule } from '@app/user/user.module';
import { TokenModule } from '@app/token/token.module';
import { EmailModule } from '@app/email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AlertEntity]),
    ConfigModule,
    UserModule,
    TokenModule,
    EmailModule
  ],
  controllers: [AlertController],
  providers: [AlertService],
  exports:[AlertService]
})
export class AlertModule {}

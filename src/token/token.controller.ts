import { NotificationDto } from '@app/email/email.dto';
import { Controller, Get } from '@nestjs/common';
import { TokenService } from './token.service';
import { EmailService } from '@app/email/email.service';

@Controller('token')
export class TokenController {
  constructor(
    private readonly tokenSvc: TokenService,
    private readonly emailSvc: EmailService,
  ) {}

  @Get()
  async nofify() {
    const email: NotificationDto = {
      to: 'melaku.girma.fr@gmail.com',
      subject: 'blockchain Price tracker notification',
      text: '',
    };
    return this.emailSvc.notifyEmail(email);
  }

  @Get('getPriceOfEachHour')
  async getPriceOfEachHour() {
    return this.tokenSvc.getPriceOfEachHour();
  }
}

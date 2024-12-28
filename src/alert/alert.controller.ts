import { Controller, Get, Query } from '@nestjs/common';
import { AlertService } from './alert.service';

@Controller('alert')
export class AlertController {
  constructor(private readonly alertSvc: AlertService) {}

  @Get('setAlert')
  async setAlert(
    @Query() query: any, //@Query() to get everything after questionmark(?) in url query parameter //you can select specific param too.
  ): Promise<any> {
    // chain, dollar, email
    //{{APIURL}}/alert/setAlert/?chain=Tether USD&dollar=1.000179176714438300&email=melaku.girma.fr@gmail.com
    const alertEntity =  await this.alertSvc.SetAlert(query);
   return this.alertSvc.buildAlertResponse(alertEntity);
  }
}

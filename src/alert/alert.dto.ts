import { AlertEntity } from './alert.entity';

export class SetAlertDto {
  chain: string;
  dollar: number;
  email: string;
}

export interface AlertResponseInterface {
  alert: AlertType;
}
export type AlertType = Omit<AlertEntity, 'triggerPrice'>;

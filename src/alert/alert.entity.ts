import { TokenEntity } from 'src/token/token.entity';
import { UserEntity } from 'src/user/user.entity';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity({name:'alerts'})
export class AlertEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('decimal', { precision: 36, scale: 18, nullable: false })
  triggerPrice: number;

  @Column()
  triggerType: number; //>= 0, <= 1, == 2

  @OneToOne(() => TokenEntity)
  @JoinColumn()
  token: TokenEntity;

  @ManyToOne(() => UserEntity, (user) => user.alerts, { eager: true })
  user: UserEntity;
}

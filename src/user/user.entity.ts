import { AlertEntity } from 'src/alert/alert.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'users' })
export class UserEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  email: string;

  @OneToMany(() => AlertEntity, (alert) => alert.user)
  alerts: AlertEntity[];
}

import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'tokens' })
export class TokenEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, unique: true })
  tokenAddress: string; // Make unique if applicable

  @Column({ nullable: false })
  tokenName: string;

  @Column({ nullable: false })
  tokenSymbol: string;

  @Column('decimal', { precision: 36, scale: 18, nullable: false })
  usdPrice: number;

  @OneToMany(() => TokenPriceHistory, (th)=>th.token,{eager:true})
  token_history: TokenPriceHistory[];
}



@Entity({ name: 'token_price_history' })
export class TokenPriceHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => TokenEntity, (token) => token.token_history, {onDelete: 'CASCADE' })
  token: TokenEntity;

  @Column('decimal', { precision: 36, scale: 18 })
  usdPrice: number;

  @CreateDateColumn()
  timestamp: Date;
}

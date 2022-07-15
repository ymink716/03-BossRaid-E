import { ApiProperty } from '@nestjs/swagger';
import { User } from 'src/user/entities/user.entity';
import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity()
export class RaidRecord {
  @ApiProperty({ description: '레이드 기록의 고유 id', example: 1 })
  @PrimaryGeneratedColumn('increment')
  id: number;

  @ApiProperty({ description: '레이드 시작 시간', example: '2022-07-15 11:06:16.890525000' })
  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  enterTime: Date;

  @ApiProperty({ description: '레이드 종료 시간', example: '2022-07-15 11:07:23' })
  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP(6)',
  })
  endTime: Date;

  @ApiProperty({ description: '레이드를 통해 얻은 점수', example: '47' })
  @Column()
  score: number;

  @ApiProperty({ description: '보스의 레벨', example: '1' })
  @Column()
  level: number;

  @ApiProperty({ description: '유저', example: 'User{}' })
  @ManyToOne(() => User, user => user.raids, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  user: User;
}

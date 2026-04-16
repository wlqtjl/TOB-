import { Module } from '@nestjs/common';
import { GameEngineService } from './game-engine.service';
import { GameEngineController } from './game-engine.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  providers: [GameEngineService],
  controllers: [GameEngineController],
  exports: [GameEngineService],
})
export class GameEngineModule {}

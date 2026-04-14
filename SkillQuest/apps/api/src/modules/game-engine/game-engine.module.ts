import { Module } from '@nestjs/common';
import { GameEngineService } from './game-engine.service';
import { GameEngineController } from './game-engine.controller';

@Module({
  providers: [GameEngineService],
  controllers: [GameEngineController],
  exports: [GameEngineService],
})
export class GameEngineModule {}

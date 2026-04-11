import { Controller, Get, Post, Param, Body } from '@nestjs/common';
import { GameEngineService } from './game-engine.service';

@Controller('game')
export class GameEngineController {
  constructor(private readonly gameEngine: GameEngineService) {}

  @Get('map/:courseId')
  getMapData(@Param('courseId') courseId: string) {
    return this.gameEngine.getMapData(courseId);
  }

  @Post('level/:courseId/:levelId/start')
  startLevel(
    @Param('courseId') courseId: string,
    @Param('levelId') levelId: string,
  ) {
    return { started: this.gameEngine.startLevel(courseId, levelId) };
  }

  @Post('level/:courseId/:levelId/submit')
  submitResult(
    @Param('courseId') courseId: string,
    @Param('levelId') levelId: string,
    @Body()
    body: {
      correctCount: number;
      totalCount: number;
      timeRemainingSec: number;
      timeLimitSec: number;
      maxCombo: number;
    },
  ) {
    return this.gameEngine.submitResult(
      courseId,
      levelId,
      body.correctCount,
      body.totalCount,
      body.timeRemainingSec,
      body.timeLimitSec,
      body.maxCombo,
    );
  }
}

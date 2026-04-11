/**
 * Leaderboard Gateway — WebSocket 实时排行榜推送
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { LeaderboardService } from './leaderboard.service';

@WebSocketGateway({ cors: true, namespace: '/leaderboard' })
export class LeaderboardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(LeaderboardGateway.name);

  constructor(private readonly leaderboard: LeaderboardService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(client: Socket, courseId: string) {
    await client.join(`course:${courseId}`);
    const data = await this.leaderboard.getLeaderboard(courseId);
    client.emit('leaderboard', data);
  }

  @SubscribeMessage('unsubscribe')
  async handleUnsubscribe(client: Socket, courseId: string) {
    await client.leave(`course:${courseId}`);
  }

  /** 广播排行榜更新 */
  async broadcastUpdate(courseId: string) {
    const data = await this.leaderboard.getLeaderboard(courseId);
    this.server.to(`course:${courseId}`).emit('leaderboard', data);
  }
}

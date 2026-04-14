/**
 * Tenant Context Middleware — 从 JWT 中提取 tenantId 注入到 AsyncLocalStorage
 *
 * 所有经过 AuthGuard 的请求都会自动设置租户上下文，
 * PrismaService 中间件会读取此上下文进行租户隔离。
 */

import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { requestContextStorage, RequestContext } from '../../prisma.service';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.slice(7);
        const payload = jwt.decode(token) as { sub?: string; tenantId?: string } | null;

        if (payload?.tenantId && payload?.sub) {
          const ctx: RequestContext = {
            tenantId: payload.tenantId,
            userId: payload.sub,
          };
          requestContextStorage.run(ctx, () => next());
          return;
        }
      } catch {
        // Token 解码失败，继续无上下文
      }
    }

    next();
  }
}

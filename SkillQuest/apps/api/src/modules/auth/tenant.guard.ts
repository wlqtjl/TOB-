/**
 * Tenant Guard — 租户隔离守卫
 *
 * 在 AuthGuard 之后运行，从 JWT payload 中提取 tenantId
 * 并附加到 request.tenantId，供下游服务进行租户隔离查询。
 *
 * 使用方法:
 *   @UseGuards(AuthGuard, TenantGuard)
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { tenantId?: string } | undefined;

    if (!user?.tenantId) {
      throw new ForbiddenException('JWT 缺少租户信息 (tenantId)');
    }

    // 将 tenantId 附加到 request 上，方便下游直接使用
    request.tenantId = user.tenantId;
    return true;
  }
}

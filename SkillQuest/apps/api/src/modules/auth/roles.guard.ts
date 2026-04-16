/**
 * Roles Guard — 角色权限守卫
 *
 * 使用方法:
 *   @UseGuards(AuthGuard, RolesGuard)
 *   @Roles('ADMIN', 'TRAINER')
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

/** 角色元数据 key */
export const ROLES_KEY = 'roles';

/** 声明端点所需角色的装饰器 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // 未设置 @Roles() 则不做角色检查，允许通过
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: string } | undefined;

    if (!user?.role) {
      throw new ForbiddenException('用户角色信息缺失');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(
        `需要以下角色之一: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}

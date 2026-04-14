/**
 * Auth Controller — 注册 / 登录 / 刷新Token / 获取当前用户
 *
 * 注册: 不再接受 tenantId，通过邀请码关联租户
 * 登录: 带账户锁定保护
 * 新增: POST /refresh — 刷新 Token
 */

import { Controller, Post, Get, Body, Req } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../../common/decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 3600000 } }) // 5 次/小时
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 次/分钟
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  @Public()
  @Post('refresh')
  refreshToken(@Body() body: { refreshToken: string }) {
    return this.auth.refreshToken(body.refreshToken);
  }

  @Get('me')
  getProfile(@Req() req: { user: { sub: string } }) {
    return this.auth.getProfile(req.user.sub);
  }
}

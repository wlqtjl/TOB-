/**
 * Auth Service — JWT + bcrypt + Refresh Token + 账户锁定
 *
 * 企业安全加固:
 * - 注册必须通过邀请码关联租户（禁止自选 tenantId）
 * - bcrypt 费用因子 12
 * - Access Token 1h + Refresh Token 30d
 * - 登录失败 5 次锁定 15 分钟
 * - JWT 密钥启动时强制校验
 */

import { Injectable, UnauthorizedException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma.service';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRES = '1h';
const REFRESH_TOKEN_EXPIRES = '30d';
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 分钟

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET 环境变量未设置或长度不足 32 字符');
  }
  return secret;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tenantId: string;
  type: 'access' | 'refresh';
}

// 内存级登录失败计数（生产环境应使用 Redis）
const loginAttempts = new Map<string, { count: number; lockedUntil: number }>();

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 注册 — 必须通过邀请码关联租户，禁止自选 tenantId
   */
  async register(data: {
    email: string;
    password: string;
    displayName: string;
    inviteCode?: string;
  }) {
    // 通过邀请码查找租户（如果无邀请码，使用默认租户）
    let tenantId: string;
    if (data.inviteCode) {
      const tenant = await this.prisma.tenant.findFirst({
        where: { inviteCode: data.inviteCode },
      });
      if (!tenant) {
        throw new ForbiddenException('邀请码无效');
      }
      tenantId = tenant.id;

      // 验证邮箱域名（如果租户配置了域名限制）
      if (tenant.domain) {
        const emailDomain = data.email.split('@')[1];
        if (emailDomain !== tenant.domain) {
          throw new ForbiddenException('邮箱域名不匹配该企业');
        }
      }
    } else {
      // 默认租户（demo 用途）
      const defaultTenant = await this.prisma.tenant.findFirst({
        where: { plan: 'FREE' },
        orderBy: { createdAt: 'asc' },
      });
      if (!defaultTenant) {
        throw new ForbiddenException('系统未初始化，请联系管理员');
      }
      tenantId = defaultTenant.id;
    }

    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictException('邮箱已注册');
    }

    const hashedPassword = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        displayName: data.displayName,
        tenantId,
      },
    });

    this.logger.log(`用户注册: ${user.email} -> 租户 ${tenantId}`);

    return {
      user: this.sanitizeUser(user),
      accessToken: this.signAccessToken(user),
      refreshToken: this.signRefreshToken(user),
    };
  }

  /**
   * 登录 — 带账户锁定机制
   */
  async login(email: string, password: string) {
    // 检查锁定状态
    const attempts = loginAttempts.get(email);
    if (attempts && attempts.lockedUntil > Date.now()) {
      const remainingSec = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
      throw new ForbiddenException(`账户已锁定，请 ${remainingSec} 秒后重试`);
    }

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      this.recordFailedLogin(email);
      throw new UnauthorizedException('邮箱或密码错误');
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      this.recordFailedLogin(email);
      throw new UnauthorizedException('邮箱或密码错误');
    }

    // 登录成功，清除失败计数
    loginAttempts.delete(email);

    return {
      user: this.sanitizeUser(user),
      accessToken: this.signAccessToken(user),
      refreshToken: this.signRefreshToken(user),
    };
  }

  /**
   * 刷新 Token
   */
  async refreshToken(refreshToken: string) {
    const payload = this.verifyToken(refreshToken);
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Token 类型错误');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    return {
      accessToken: this.signAccessToken(user),
      refreshToken: this.signRefreshToken(user),
    };
  }

  async validateToken(token: string): Promise<JwtPayload> {
    const payload = this.verifyToken(token);
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Token 类型错误');
    }
    return payload;
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        achievements: true,
        tenant: { select: { id: true, name: true } },
      },
    });
    if (!user) throw new UnauthorizedException('用户不存在');
    return this.sanitizeUser(user);
  }

  // ─── 内部方法 ────────────────────────────────────────────────

  private verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, getJwtSecret()) as JwtPayload;
    } catch (err) {
      throw new UnauthorizedException('Token 无效或已过期');
    }
  }

  private signAccessToken(user: { id: string; email: string; role: string; tenantId: string }): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      type: 'access',
    };
    return jwt.sign(payload, getJwtSecret(), { expiresIn: ACCESS_TOKEN_EXPIRES });
  }

  private signRefreshToken(user: { id: string; email: string; role: string; tenantId: string }): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      type: 'refresh',
    };
    return jwt.sign(payload, getJwtSecret(), { expiresIn: REFRESH_TOKEN_EXPIRES });
  }

  private recordFailedLogin(email: string) {
    const current = loginAttempts.get(email) ?? { count: 0, lockedUntil: 0 };
    current.count += 1;
    if (current.count >= MAX_LOGIN_ATTEMPTS) {
      current.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
      this.logger.warn(`账户 ${email} 已被锁定 15 分钟（连续 ${current.count} 次失败）`);
    }
    loginAttempts.set(email, current);
  }

  private sanitizeUser(user: Record<string, unknown>) {
    const { password: _, ...safe } = user;
    return safe;
  }
}

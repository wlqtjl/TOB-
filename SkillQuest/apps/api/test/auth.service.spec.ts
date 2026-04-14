/**
 * Auth Service Unit Tests
 *
 * 测试注册/登录/刷新 Token 的核心业务逻辑。
 */
import { AuthService } from '../src/modules/auth/auth.service';
import { UnauthorizedException, ForbiddenException, BadRequestException } from '@nestjs/common';

process.env.JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-characters-long';

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      tenant: { findFirst: jest.fn() },
      user: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new AuthService(mockPrisma);
  });

  describe('register', () => {
    it('should throw BadRequestException when invite code is invalid', async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue(null);

      await expect(
        service.register('user@test.com', 'Password1', 'BAD_CODE'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for duplicate email', async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue({
        id: 'tenant-1',
        inviteCode: 'VALID',
        allowedDomains: '',
      });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.register('existing@test.com', 'Password1', 'VALID'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create user and return tokens for valid registration', async () => {
      mockPrisma.tenant.findFirst.mockResolvedValue({
        id: 'tenant-1',
        inviteCode: 'VALID',
        allowedDomains: '',
      });
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue({
        id: 'new-user',
        email: 'new@test.com',
        tenantId: 'tenant-1',
        role: 'LEARNER',
      });

      const result = await service.register('new@test.com', 'Password1', 'VALID');

      expect(result).toHaveProperty('access_token');
      expect(result).toHaveProperty('refresh_token');
      expect(mockPrisma.user.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException for non-existent user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login('nobody@test.com', 'password'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});

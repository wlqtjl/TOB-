# SkillQuest Security Guide

> Comprehensive security architecture, policies, and best practices for the SkillQuest platform.

---

## Table of Contents

1. [Authentication](#authentication)
2. [Authorization](#authorization)
3. [Data Protection](#data-protection)
4. [API Security](#api-security)
5. [Audit Logging](#audit-logging)
6. [Session Management](#session-management)
7. [Infrastructure Security](#infrastructure-security)
8. [Vulnerability Management](#vulnerability-management)
9. [Security Incident Response](#security-incident-response)

---

## Authentication

### JWT Token Authentication

SkillQuest uses **JSON Web Tokens (JWT)** as the primary authentication mechanism for API access.

| Parameter           | Value          | Description                        |
| ------------------- | -------------- | ---------------------------------- |
| Algorithm           | RS256          | RSA signature with SHA-256         |
| Access Token Expiry | 7 days         | Short-lived access token           |
| Refresh Token Expiry| 30 days        | Long-lived refresh token           |
| Issuer              | `skillquest`   | Token issuer claim                 |
| Audience            | `skillquest-api` | Token audience claim             |

#### Token Structure

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "usr_abc123",
    "iss": "skillquest",
    "aud": "skillquest-api",
    "iat": 1705312200,
    "exp": 1705917000,
    "role": "TRAINER",
    "tenantId": "tenant_001",
    "permissions": ["course:read", "course:write", "learner:read"]
  }
}
```

#### Token Lifecycle

1. User authenticates via login or SSO.
2. Server issues access token (7 days) and refresh token (30 days).
3. Client includes the access token in the `Authorization: Bearer <token>` header.
4. When the access token expires, the client uses the refresh token to obtain a new pair.
5. Refresh tokens are rotated on each use (one-time use).
6. On logout, both tokens are added to a Redis-backed deny list.

### Password Security

| Aspect              | Implementation                           |
| ------------------- | ---------------------------------------- |
| Hashing algorithm   | bcrypt with cost factor 12               |
| Minimum length      | 8 characters                             |
| Complexity          | At least 1 uppercase, 1 lowercase, 1 digit |
| Breached check      | Checked against HaveIBeenPwned (k-anonymity) |
| Max attempts        | 5 failed attempts → 15 min lockout       |
| Password history    | Last 5 passwords cannot be reused        |

```typescript
// Password hashing example (NestJS)
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS);
}

async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}
```

### Single Sign-On (SSO) Integration

SkillQuest supports multiple SSO providers for enterprise integration.

| Provider         | Protocol       | Configuration                     |
| ---------------- | -------------- | --------------------------------- |
| WeChat Work      | OAuth 2.0      | Corp ID, Agent ID, Secret         |
| Feishu (Lark)    | OAuth 2.0      | App ID, App Secret                |
| Okta             | OIDC           | Client ID, Client Secret, Issuer  |
| Azure AD         | OIDC           | Tenant ID, Client ID, Secret      |
| Generic SAML 2.0 | SAML           | Metadata URL, Certificate         |

#### SSO Login Flow

```
┌──────────┐     ┌──────────────┐     ┌────────────┐
│  Browser  │────▶│  SkillQuest  │────▶│  IdP (SSO) │
│           │◀────│  API Server  │◀────│            │
└──────────┘     └──────────────┘     └────────────┘
     │                  │
     │  1. Click SSO    │
     │─────────────────▶│
     │  2. Redirect URL │
     │◀─────────────────│
     │  3. Redirect to IdP
     │─────────────────────────────────▶│
     │  4. User authenticates at IdP    │
     │◀─────────────────────────────────│
     │  5. Callback with code           │
     │─────────────────▶│
     │                  │  6. Exchange code for IdP token
     │                  │─────────────────────────────▶│
     │                  │  7. User profile              │
     │                  │◀─────────────────────────────│
     │  8. JWT issued   │
     │◀─────────────────│
```

#### WeChat Work Configuration

```typescript
// config/wechat-work.ts
export const wechatWorkConfig = {
  corpId: process.env.WECHAT_WORK_CORP_ID,
  agentId: process.env.WECHAT_WORK_AGENT_ID,
  secret: process.env.WECHAT_WORK_SECRET,
  callbackUrl: `${process.env.NEXT_PUBLIC_API_URL}/auth/wechat-work/callback`,
};
```

#### Feishu Configuration

```typescript
// config/feishu.ts
export const feishuConfig = {
  appId: process.env.FEISHU_APP_ID,
  appSecret: process.env.FEISHU_APP_SECRET,
  callbackUrl: `${process.env.NEXT_PUBLIC_API_URL}/auth/feishu/callback`,
};
```

---

## Authorization

### Role-Based Access Control (RBAC)

SkillQuest implements a three-tier RBAC model.

| Role       | Description                                       |
| ---------- | ------------------------------------------------- |
| `ADMIN`    | Full system access, user management, tenant config|
| `TRAINER`  | Create/manage courses, view learner progress       |
| `LEARNER`  | Access assigned courses, take assessments          |

### Permission Matrix

| Resource / Action            | ADMIN | TRAINER | LEARNER |
| ---------------------------- | ----- | ------- | ------- |
| **Users**                    |       |         |         |
| Create users                 | ✅    | ❌      | ❌      |
| List all users               | ✅    | ❌      | ❌      |
| View own profile             | ✅    | ✅      | ✅      |
| Update own profile           | ✅    | ✅      | ✅      |
| Delete users                 | ✅    | ❌      | ❌      |
| Assign roles                 | ✅    | ❌      | ❌      |
| **Courses**                  |       |         |         |
| Create courses               | ✅    | ✅      | ❌      |
| Edit courses                 | ✅    | ✅ (own)| ❌      |
| Delete courses               | ✅    | ✅ (own)| ❌      |
| View courses                 | ✅    | ✅      | ✅ (assigned) |
| Publish courses              | ✅    | ✅ (own)| ❌      |
| **Assessments**              |       |         |         |
| Create assessments           | ✅    | ✅      | ❌      |
| Take assessments             | ✅    | ✅      | ✅      |
| View all results             | ✅    | ✅ (own courses) | ❌ |
| View own results             | ✅    | ✅      | ✅      |
| **AI Generation**            |       |         |         |
| Generate questions           | ✅    | ✅      | ❌      |
| Configure AI models          | ✅    | ❌      | ❌      |
| **Reports & Analytics**      |       |         |         |
| View org-wide analytics      | ✅    | ❌      | ❌      |
| View course analytics        | ✅    | ✅ (own)| ❌      |
| Export data                  | ✅    | ✅ (own)| ❌      |
| **System**                   |       |         |         |
| Manage tenant settings       | ✅    | ❌      | ❌      |
| View audit logs              | ✅    | ❌      | ❌      |
| Manage integrations          | ✅    | ❌      | ❌      |

### Multi-Tenant Isolation

- Every database record includes a `tenantId` foreign key.
- All queries are scoped to the authenticated user's tenant via Prisma middleware.
- Tenant data is **logically isolated** within the same database.
- Cross-tenant access is impossible through the application layer.

```typescript
// prisma/middleware/tenant-isolation.ts
prisma.$use(async (params, next) => {
  const tenantId = getCurrentTenantId();

  if (params.action === 'findMany' || params.action === 'findFirst') {
    params.args.where = { ...params.args.where, tenantId };
  }

  if (params.action === 'create') {
    params.args.data = { ...params.args.data, tenantId };
  }

  return next(params);
});
```

---

## Data Protection

### PII Classification

| Classification | Examples                              | Storage          | Access              |
| -------------- | ------------------------------------- | ---------------- | ------------------- |
| **Public**     | Course titles, public leaderboards    | Standard         | Unauthenticated OK  |
| **Internal**   | Usernames, email addresses            | Encrypted at rest| Authenticated users |
| **Confidential** | Password hashes, SSO tokens        | Encrypted, restricted | System only     |
| **Restricted** | Government IDs, payment info          | AES-256, separate store | Compliance team |

### Encryption at Rest

| Component    | Method                        | Key Management         |
| ------------ | ----------------------------- | ---------------------- |
| PostgreSQL   | AES-256 (Transparent Data Encryption) | AWS KMS / Vault |
| Redis        | In-memory (no persistence for PII) | N/A              |
| File storage | AES-256-GCM                   | AWS KMS / Vault        |
| Backups      | AES-256-CBC                   | Separate backup key    |

### Encryption in Transit

| Connection           | Protocol   | Minimum Version |
| -------------------- | ---------- | --------------- |
| Client ↔ Nginx       | TLS        | 1.3             |
| Nginx ↔ API          | TLS        | 1.2             |
| API ↔ PostgreSQL     | TLS        | 1.2             |
| API ↔ Redis          | TLS        | 1.2             |
| API ↔ AI Service     | TLS        | 1.2             |
| API ↔ External SSO   | TLS        | 1.3             |

### Data Minimization

- Collect only data necessary for platform functionality.
- PII fields are clearly marked in the Prisma schema with `@map` annotations.
- Personal data is pseudonymized in analytics pipelines.
- Deleted user data is hard-deleted after 30 days (soft-delete → hard-delete).

---

## API Security

### Rate Limiting

Rate limits are enforced per IP address and per authenticated user using a Redis-backed sliding window.

| Endpoint Category       | Anonymous         | Authenticated     |
| ----------------------- | ----------------- | ----------------- |
| Authentication (`/auth`)| 10 req/min        | N/A               |
| General API             | 30 req/min        | 100 req/min       |
| AI Generation           | N/A               | 10 req/min        |
| File Upload             | N/A               | 5 req/min         |
| WebSocket Connections   | N/A               | 5 connections     |

```typescript
// Rate limiting middleware (NestJS)
@UseGuards(ThrottlerGuard)
@Throttle({ default: { limit: 100, ttl: 60000 } })
@Controller('api/v1')
export class AppController {}
```

### CSRF Protection

- All state-changing API requests require a valid CSRF token.
- CSRF tokens are issued via a `GET /api/csrf-token` endpoint.
- The token is validated via the `X-CSRF-Token` header.
- SameSite=Strict cookies provide additional protection.

### Input Validation

All API inputs are validated using **class-validator** decorators and **Zod** schemas.

```typescript
// Example: Course creation DTO
import { IsString, IsNotEmpty, MaxLength, IsOptional, IsEnum } from 'class-validator';

export class CreateCourseDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsOptional()
  @MaxLength(5000)
  description?: string;

  @IsEnum(CourseLevel)
  level: CourseLevel;
}
```

### SQL Injection Prevention

- **Prisma ORM** is used exclusively for database access.
- All queries use parameterized statements by default.
- Raw SQL queries are prohibited in application code.
- Database user permissions follow the principle of least privilege.

```typescript
// Safe: Prisma parameterized query
const users = await prisma.user.findMany({
  where: { email: { contains: searchTerm } },
});

// PROHIBITED: Raw SQL with string interpolation
// const users = await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE email LIKE '%${searchTerm}%'`);
```

### Additional API Security Headers

```typescript
// Helmet middleware configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", process.env.NEXT_PUBLIC_API_URL],
    },
  },
  hsts: { maxAge: 63072000, includeSubDomains: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

---

## Audit Logging

### What Is Logged

All security-relevant actions are captured in an immutable audit log.

| Event Category      | Events Logged                                    |
| ------------------- | ------------------------------------------------ |
| Authentication      | Login, logout, failed login, password change, SSO|
| Authorization       | Role change, permission denied, token refresh    |
| Data Access         | PII read, bulk export, report generation         |
| Data Modification   | Create, update, delete of any entity             |
| Administration      | User management, tenant config, system settings  |
| AI Operations       | AI generation requests, model changes            |

### Audit Log Schema

```json
{
  "id": "audit_abc123",
  "timestamp": "2024-01-15T10:30:00.123Z",
  "actor": {
    "userId": "usr_abc123",
    "role": "TRAINER",
    "ip": "192.168.1.100",
    "userAgent": "Mozilla/5.0..."
  },
  "action": "course.update",
  "resource": {
    "type": "Course",
    "id": "course_xyz789"
  },
  "tenantId": "tenant_001",
  "changes": {
    "title": { "from": "Old Title", "to": "New Title" }
  },
  "result": "success",
  "metadata": {
    "traceId": "trace_def456"
  }
}
```

### Retention Policy

| Log Type          | Retention Period | Storage             |
| ----------------- | ---------------- | ------------------- |
| Audit logs        | 90 days (online) | PostgreSQL          |
| Audit logs        | 7 years (archive)| Object storage (S3) |
| Application logs  | 30 days          | ELK / Loki          |
| Access logs       | 90 days          | ELK / Loki          |

### Audit Log Queries

```sql
-- Find all actions by a specific user in the last 24 hours
SELECT * FROM audit_logs
WHERE actor_user_id = 'usr_abc123'
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC;

-- Find all failed login attempts
SELECT * FROM audit_logs
WHERE action = 'auth.login'
  AND result = 'failure'
  AND timestamp > NOW() - INTERVAL '7 days'
ORDER BY timestamp DESC;

-- Find all data exports
SELECT * FROM audit_logs
WHERE action LIKE 'data.export%'
ORDER BY timestamp DESC
LIMIT 100;
```

---

## Session Management

### Session Configuration

| Parameter              | Value          | Description                           |
| ---------------------- | -------------- | ------------------------------------- |
| Idle timeout           | 30 minutes     | Session expires after inactivity      |
| Absolute timeout       | 24 hours       | Maximum session lifetime              |
| Concurrent sessions    | 3 per user     | Max simultaneous sessions             |
| Session storage        | Redis          | Server-side session state             |

### IP Whitelist

Administrators can configure an IP whitelist to restrict access to the management interface.

```typescript
// IP whitelist configuration
const ipWhitelist = {
  enabled: true,
  adminPanel: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16'],
  api: [], // Empty = allow all
};
```

### Session Invalidation

Sessions are invalidated under the following conditions:

- User explicitly logs out.
- Password is changed (all sessions invalidated).
- Role or permissions are modified.
- Account is suspended or deleted.
- IP address changes (optional, configurable).
- Idle timeout exceeded.

---

## Infrastructure Security

### Network Segmentation

```
┌─────────────────────────────────────────────────────┐
│                    Public Zone                        │
│  ┌─────────┐                                         │
│  │  Nginx  │  (ports 80, 443 only)                   │
│  └────┬────┘                                         │
├───────┼─────────────────────────────────────────────┤
│       │           Application Zone                    │
│  ┌────▼────┐  ┌──────────┐  ┌──────────┐            │
│  │   API   │  │   Web    │  │    AI    │             │
│  └────┬────┘  └──────────┘  └──────────┘            │
├───────┼─────────────────────────────────────────────┤
│       │              Data Zone                        │
│  ┌────▼──────┐  ┌──────────┐                         │
│  │ PostgreSQL│  │  Redis   │                          │
│  └───────────┘  └──────────┘                         │
└─────────────────────────────────────────────────────┘
```

### Container Security

- All container images are scanned with **Trivy** before deployment.
- Containers run as non-root users.
- Read-only root filesystems where possible.
- Resource limits enforced on all containers.
- No privileged containers.

### Secret Management

- Secrets are stored in **HashiCorp Vault** or **Kubernetes Secrets** (encrypted with KMS).
- Secrets are injected as environment variables at runtime.
- Secrets are **never** hardcoded or committed to version control.
- Secret rotation is automated where supported.

---

## Vulnerability Management

### Dependency Scanning

```bash
# Run dependency audit
pnpm audit

# Check for known vulnerabilities in Python dependencies
pip-audit -r requirements.txt

# Scan Docker images
trivy image skillquest/api:latest
```

### Security Update Policy

| Severity  | Response Time       | Action                        |
| --------- | ------------------- | ----------------------------- |
| Critical  | 24 hours            | Immediate patch and deploy    |
| High      | 72 hours            | Patch in next release         |
| Medium    | 2 weeks             | Schedule in sprint            |
| Low       | Next release cycle  | Include in regular updates    |

---

## Security Incident Response

### Incident Classification

| Severity | Examples                                     | Response Time |
| -------- | -------------------------------------------- | ------------- |
| P1       | Data breach, unauthorized access             | 15 minutes    |
| P2       | Credential leak, vulnerability exploited     | 1 hour        |
| P3       | Suspicious activity, failed attack           | 4 hours       |

### Response Steps

1. **Contain**: Isolate affected systems, revoke compromised credentials.
2. **Assess**: Determine scope and impact.
3. **Eradicate**: Remove the threat.
4. **Recover**: Restore services from clean backups.
5. **Notify**: Inform affected users and authorities (GDPR: 72 hours).
6. **Review**: Conduct post-mortem and update procedures.

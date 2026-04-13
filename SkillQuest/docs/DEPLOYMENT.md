# SkillQuest Deployment Guide

> Complete guide for deploying SkillQuest across development, staging, and production environments.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Variables](#environment-variables)
3. [Development Setup](#development-setup)
4. [Docker Compose Production Deployment](#docker-compose-production-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Database Initialization and Migration](#database-initialization-and-migration)
7. [Health Check Endpoints](#health-check-endpoints)
8. [Capacity Requirements](#capacity-requirements)
9. [SSL/TLS Configuration](#ssltls-configuration)
10. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

Ensure the following software is installed and available on your target machines before proceeding.

| Software       | Minimum Version | Purpose                          |
| -------------- | --------------- | -------------------------------- |
| Node.js        | 20.x LTS       | Runtime for Next.js and NestJS   |
| pnpm           | 9.x            | Package manager (workspace-aware)|
| PostgreSQL     | 16.x           | Primary relational database      |
| Redis          | 7.x            | Caching, sessions, queues        |
| Python         | 3.11            | AI service and data pipelines    |
| Docker         | 24.x           | Container runtime (production)   |
| Docker Compose | 2.20+          | Multi-container orchestration    |
| kubectl        | 1.28+          | Kubernetes CLI (K8s deployments) |
| Helm           | 3.13+          | Kubernetes package manager       |

### System Requirements (Development)

- **OS**: macOS 13+, Ubuntu 22.04+, or Windows 11 with WSL2
- **RAM**: 8 GB minimum, 16 GB recommended
- **Disk**: 20 GB free space
- **CPU**: 4 cores minimum

---

## Environment Variables

Create a `.env` file in the project root. **Never commit this file to version control.**

| Variable                 | Required | Example                                      | Description                              |
| ------------------------ | -------- | -------------------------------------------- | ---------------------------------------- |
| `DATABASE_URL`           | Yes      | `postgresql://user:pass@localhost:5432/skillquest` | PostgreSQL connection string        |
| `REDIS_URL`              | Yes      | `redis://localhost:6379/0`                   | Redis connection string                  |
| `OPENAI_API_KEY`         | Yes      | `sk-proj-xxxxxxxxxxxx`                       | OpenAI API key for AI features           |
| `JWT_SECRET`             | Yes      | `a-random-64-char-hex-string`               | Secret for signing JWT tokens            |
| `NEXT_PUBLIC_API_URL`    | Yes      | `https://api.skillquest.example.com`         | Public API base URL for the frontend     |
| `WECHAT_WORK_CORP_ID`   | No       | `ww1234567890abcdef`                         | WeChat Work corporation ID               |
| `WECHAT_WORK_AGENT_ID`  | No       | `1000002`                                    | WeChat Work agent ID                     |
| `WECHAT_WORK_SECRET`    | No       | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`   | WeChat Work agent secret                 |
| `FEISHU_APP_ID`          | No       | `cli_xxxxxxxxxxxxxxxxx`                      | Feishu (Lark) application ID             |
| `FEISHU_APP_SECRET`      | No       | `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`           | Feishu (Lark) application secret         |

### Additional Optional Variables

| Variable                 | Default       | Description                                  |
| ------------------------ | ------------- | -------------------------------------------- |
| `NODE_ENV`               | `development` | Runtime environment                          |
| `PORT`                   | `3000`        | API server port                              |
| `WEB_PORT`               | `3001`        | Next.js frontend port                        |
| `LOG_LEVEL`              | `info`        | Logging verbosity (debug/info/warn/error)    |
| `AI_MODEL`               | `gpt-4o`      | Default AI model for question generation     |
| `AI_TIMEOUT_MS`          | `30000`       | AI API request timeout in milliseconds       |
| `SESSION_IDLE_TIMEOUT`   | `1800`        | Session idle timeout in seconds              |
| `RATE_LIMIT_WINDOW_MS`  | `60000`       | Rate limit sliding window                    |
| `RATE_LIMIT_MAX`         | `100`         | Max requests per window per IP               |

### Generating Secrets

```bash
# Generate a secure JWT_SECRET
openssl rand -hex 64

# Generate a secure session key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Development Setup

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/skillquest.git
cd skillquest
```

### Step 2: Install Dependencies

```bash
# Install pnpm if not already installed
corepack enable
corepack prepare pnpm@latest --activate

# Install all workspace dependencies
pnpm install
```

### Step 3: Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit with your local values
nano .env
```

### Step 4: Initialize the Database

```bash
# Run Prisma migrations to create the schema
pnpm db:migrate

# Seed the database with initial data (admin user, sample courses, etc.)
pnpm db:seed
```

### Step 5: Start the Development Server

```bash
# Start all services in development mode with hot reload
pnpm dev
```

This starts:
- **Next.js frontend** at `http://localhost:3001`
- **NestJS API server** at `http://localhost:3000`
- **AI service** at `http://localhost:8000`

### Step 6: Verify the Setup

```bash
# Check API health
curl http://localhost:3000/health

# Check frontend
open http://localhost:3001

# Run the test suite
pnpm test
```

---

## Docker Compose Production Deployment

The `infra/` directory contains all Docker Compose configuration for production deployment.

### Directory Structure

```
infra/
├── docker-compose.yml          # Main compose file
├── docker-compose.override.yml # Development overrides
├── docker-compose.prod.yml     # Production overrides
├── nginx/
│   ├── nginx.conf              # Nginx main configuration
│   └── ssl/                    # TLS certificates
├── postgres/
│   ├── init.sql                # Database initialization
│   └── postgresql.conf         # PostgreSQL tuning
├── redis/
│   └── redis.conf              # Redis configuration
└── .env.production             # Production environment variables
```

### Services Overview

| Service      | Image                   | Ports         | Description                   |
| ------------ | ----------------------- | ------------- | ----------------------------- |
| `postgres`   | `postgres:16-alpine`    | 5432          | Primary database              |
| `redis`      | `redis:7-alpine`        | 6379          | Cache and message broker      |
| `api`        | `skillquest/api:latest` | 3000          | NestJS API server             |
| `web`        | `skillquest/web:latest` | 3001          | Next.js frontend (SSR)        |
| `ai`         | `skillquest/ai:latest`  | 8000          | Python AI service             |
| `nginx`      | `nginx:1.25-alpine`     | 80, 443       | Reverse proxy and TLS termination |

### Deploy with Docker Compose

```bash
cd infra/

# Pull the latest images
docker compose -f docker-compose.yml -f docker-compose.prod.yml pull

# Start all services in detached mode
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Verify all services are running
docker compose ps

# View logs
docker compose logs -f --tail=100
```

### Docker Compose Configuration Example

```yaml
# docker-compose.yml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: skillquest
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    command: redis-server /usr/local/etc/redis/redis.conf
    volumes:
      - redis_data:/data
      - ./redis/redis.conf:/usr/local/etc/redis/redis.conf
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    image: skillquest/api:latest
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@postgres:5432/skillquest
      REDIS_URL: redis://redis:6379/0
    ports:
      - "3000:3000"

  web:
    image: skillquest/web:latest
    restart: unless-stopped
    depends_on:
      - api
    environment:
      NEXT_PUBLIC_API_URL: ${NEXT_PUBLIC_API_URL}
    ports:
      - "3001:3001"

  ai:
    image: skillquest/ai:latest
    restart: unless-stopped
    depends_on:
      - redis
    environment:
      OPENAI_API_KEY: ${OPENAI_API_KEY}
      REDIS_URL: redis://redis:6379/1
    ports:
      - "8000:8000"

  nginx:
    image: nginx:1.25-alpine
    restart: unless-stopped
    depends_on:
      - api
      - web
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl

volumes:
  postgres_data:
  redis_data:
```

---

## Kubernetes Deployment

### Helm Chart Structure

```
charts/skillquest/
├── Chart.yaml
├── values.yaml
├── values-staging.yaml
├── values-production.yaml
├── templates/
│   ├── _helpers.tpl
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── api-deployment.yaml
│   ├── api-service.yaml
│   ├── api-hpa.yaml
│   ├── web-deployment.yaml
│   ├── web-service.yaml
│   ├── web-hpa.yaml
│   ├── ai-deployment.yaml
│   ├── ai-service.yaml
│   ├── ingress.yaml
│   ├── pdb.yaml
│   └── networkpolicy.yaml
└── charts/
    ├── postgresql/            # Bitnami PostgreSQL subchart
    └── redis/                 # Bitnami Redis subchart
```

### Deploy with Helm

```bash
# Add required Helm repositories
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo update

# Install or upgrade the release
helm upgrade --install skillquest ./charts/skillquest \
  --namespace skillquest \
  --create-namespace \
  -f charts/skillquest/values-production.yaml \
  --set secrets.jwtSecret=$(kubectl get secret skillquest-secrets -o jsonpath='{.data.jwt-secret}' | base64 -d) \
  --wait --timeout 10m

# Verify deployment
kubectl -n skillquest get pods
kubectl -n skillquest get svc
kubectl -n skillquest get ingress
```

### Horizontal Pod Autoscaler (HPA) Example

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: skillquest-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: skillquest-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
```

---

## Database Initialization and Migration

SkillQuest uses **Prisma ORM** for schema management and migrations.

### Migration Commands

```bash
# Create a new migration after schema changes
pnpm prisma migrate dev --name descriptive_migration_name

# Apply pending migrations in production
pnpm prisma migrate deploy

# Reset the database (WARNING: destroys all data)
pnpm prisma migrate reset

# Generate Prisma Client after schema changes
pnpm prisma generate

# Open Prisma Studio for visual database browsing
pnpm prisma studio
```

### Production Migration Strategy

1. **Always back up** the database before running migrations.
2. Run migrations during a **maintenance window** for destructive changes.
3. Use **expand-and-contract** pattern for zero-downtime schema changes.
4. Test migrations against a **staging database** first.

```bash
# Production migration with backup
pg_dump -Fc skillquest > backup_$(date +%Y%m%d_%H%M%S).dump
pnpm prisma migrate deploy
```

### Seeding

```bash
# Run the seed script to populate initial data
pnpm db:seed
```

The seed script creates:
- Default admin user (`admin@skillquest.com`)
- Sample skill categories and courses
- Demo training scenarios
- Default RBAC roles and permissions

---

## Health Check Endpoints

All services expose health check endpoints for monitoring and orchestration.

| Endpoint                  | Service  | Method | Expected Response                |
| ------------------------- | -------- | ------ | -------------------------------- |
| `GET /health`             | API      | GET    | `200 { "status": "ok" }`        |
| `GET /health/ready`       | API      | GET    | `200` when all dependencies up   |
| `GET /health/live`        | API      | GET    | `200` when process is alive      |
| `GET /health/db`          | API      | GET    | `200` when DB is reachable       |
| `GET /health/redis`       | API      | GET    | `200` when Redis is reachable    |
| `GET /api/health`         | Web      | GET    | `200 { "status": "ok" }`        |
| `GET /health`             | AI       | GET    | `200 { "status": "ok" }`        |

### Health Check Response Schema

```json
{
  "status": "ok",
  "version": "1.2.0",
  "uptime": 86400,
  "timestamp": "2024-01-15T10:30:00Z",
  "checks": {
    "database": { "status": "ok", "latency_ms": 2 },
    "redis": { "status": "ok", "latency_ms": 1 },
    "ai_service": { "status": "ok", "latency_ms": 150 }
  }
}
```

---

## Capacity Requirements

### Deployment Sizing Guide

| Resource           | Small (≤100 users) | Medium (100–1,000 users) | Large (1,000–10,000 users) |
| ------------------ | ------------------- | ------------------------- | --------------------------- |
| **API Servers**    | 1× (2 CPU, 4 GB)   | 2× (4 CPU, 8 GB)         | 4× (8 CPU, 16 GB)          |
| **Web Servers**    | 1× (2 CPU, 4 GB)   | 2× (4 CPU, 8 GB)         | 3× (4 CPU, 8 GB)           |
| **AI Service**     | 1× (2 CPU, 4 GB)   | 2× (4 CPU, 8 GB)         | 4× (8 CPU, 16 GB)          |
| **PostgreSQL**     | 1× (2 CPU, 4 GB)   | 1× (4 CPU, 16 GB)        | 1× primary + 2× read replicas (8 CPU, 32 GB) |
| **Redis**          | 1× (1 CPU, 2 GB)   | 1× (2 CPU, 4 GB)         | 3-node cluster (4 CPU, 8 GB each) |
| **Nginx**          | 1× (1 CPU, 1 GB)   | 2× (2 CPU, 2 GB)         | 2× (4 CPU, 4 GB)           |
| **Storage (DB)**   | 20 GB SSD           | 100 GB SSD               | 500 GB NVMe SSD            |
| **Storage (Files)**| 50 GB               | 200 GB                   | 1 TB (object storage)      |
| **Bandwidth**      | 100 Mbps            | 500 Mbps                 | 1 Gbps                     |

### Concurrent User Estimates

| Tier   | Registered Users | Peak Concurrent | Daily Active Users |
| ------ | ---------------- | --------------- | ------------------ |
| Small  | ≤ 100            | 20              | 50                 |
| Medium | 100 – 1,000     | 200             | 500                |
| Large  | 1,000 – 10,000  | 2,000           | 5,000              |

---

## SSL/TLS Configuration

### Using Let's Encrypt with Certbot

```bash
# Install certbot
apt-get install -y certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d skillquest.example.com -d api.skillquest.example.com

# Auto-renewal is configured via systemd timer
systemctl enable certbot.timer
```

### Nginx TLS Configuration

```nginx
server {
    listen 443 ssl http2;
    server_name skillquest.example.com;

    ssl_certificate     /etc/nginx/ssl/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    ssl_protocols       TLSv1.3;
    ssl_ciphers         TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256;

    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
    add_header X-Content-Type-Options    nosniff always;
    add_header X-Frame-Options           DENY always;
}
```

---

## Rollback Procedures

### Application Rollback

```bash
# Docker Compose: roll back to previous image tag
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --no-deps api

# Kubernetes: roll back to previous revision
helm rollback skillquest <revision-number> --namespace skillquest

# Verify rollback
kubectl -n skillquest rollout status deployment/skillquest-api
```

### Database Rollback

```bash
# Restore from backup
pg_restore -d skillquest backup_20240115_103000.dump

# Or revert the last migration (development only)
pnpm prisma migrate reset
```

---

## Post-Deployment Checklist

- [ ] All health check endpoints return `200 OK`
- [ ] Database migrations applied successfully
- [ ] SSL certificates valid and auto-renewal configured
- [ ] Environment variables set correctly (no defaults in production)
- [ ] Monitoring and alerting configured
- [ ] Backup jobs scheduled and tested
- [ ] Log aggregation pipeline active
- [ ] Rate limiting enabled
- [ ] CORS origins restricted to production domains
- [ ] DNS records pointing to the correct load balancer
- [ ] Smoke tests passing (login, create course, AI generation)

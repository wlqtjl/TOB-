# SkillQuest Troubleshooting Guide

> Common issues, diagnostic procedures, performance tuning, and health check reference.

---

## Table of Contents

1. [Common Issues FAQ](#common-issues-faq)
2. [Log Analysis Guide](#log-analysis-guide)
3. [Performance Tuning Checklist](#performance-tuning-checklist)
4. [Health Check Reference](#health-check-reference)
5. [Diagnostic Commands](#diagnostic-commands)
6. [Error Code Reference](#error-code-reference)

---

## Common Issues FAQ

### Issue 1: Application fails to start with "ECONNREFUSED" to PostgreSQL

**Symptoms**: API server crashes on startup with `connect ECONNREFUSED 127.0.0.1:5432`.

**Cause**: PostgreSQL is not running or the `DATABASE_URL` is incorrect.

**Solution**:
```bash
# 1. Check if PostgreSQL is running
systemctl status postgresql
# or with Docker
docker compose ps postgres

# 2. Verify the connection string
echo $DATABASE_URL

# 3. Test direct connection
psql "$DATABASE_URL" -c "SELECT 1;"

# 4. If using Docker, ensure the service is healthy
docker compose up -d postgres
docker compose logs postgres
```

---

### Issue 2: Redis connection timeout

**Symptoms**: Application logs show `Redis connection timed out` or `ETIMEDOUT`.

**Cause**: Redis is not running, network issue, or the `REDIS_URL` is incorrect.

**Solution**:
```bash
# 1. Check Redis status
redis-cli -u "$REDIS_URL" ping
# Expected: PONG

# 2. Check Redis memory usage
redis-cli -u "$REDIS_URL" INFO memory | grep used_memory_human

# 3. Restart Redis if needed
docker compose restart redis
```

---

### Issue 3: JWT token validation fails with "invalid signature"

**Symptoms**: All authenticated API requests return `401 Unauthorized` with `invalid signature`.

**Cause**: `JWT_SECRET` mismatch between token issuance and validation (often after a deployment with new secrets).

**Solution**:
1. Verify the `JWT_SECRET` environment variable is the same across all API server instances.
2. If the secret was rotated, all existing tokens are invalid. Users must re-authenticate.
3. Check that the secret does not contain unescaped special characters.

```bash
# Verify JWT_SECRET is consistent across pods (Kubernetes)
kubectl -n skillquest exec deploy/skillquest-api -- printenv JWT_SECRET | md5sum
```

---

### Issue 4: Prisma migration fails with "migration already applied"

**Symptoms**: `pnpm prisma migrate deploy` fails with a migration conflict.

**Cause**: Migration state in `_prisma_migrations` table is inconsistent with local migration files.

**Solution**:
```bash
# 1. Check migration status
pnpm prisma migrate status

# 2. If a failed migration is blocking, mark it as rolled back
psql "$DATABASE_URL" -c "UPDATE _prisma_migrations SET rolled_back_at = NOW() WHERE migration_name = 'YYYYMMDD_failed_migration';"

# 3. Re-run migration
pnpm prisma migrate deploy

# 4. Nuclear option (development only): reset the database
pnpm prisma migrate reset
```

---

### Issue 5: AI question generation returns empty results

**Symptoms**: Trainers click "Generate Questions" but receive empty or error responses.

**Cause**: OpenAI API key is invalid, rate-limited, or the AI service is down.

**Solution**:
```bash
# 1. Check AI service health
curl http://localhost:8000/health

# 2. Verify OpenAI API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY" | head -20

# 3. Check AI service logs for rate limit errors
docker compose logs ai --tail=50 | grep -i "rate\|429\|error"

# 4. If rate-limited, reduce concurrent requests
export AI_MAX_CONCURRENT=2
docker compose restart ai
```

---

### Issue 6: WebSocket connections drop frequently

**Symptoms**: Real-time features (live leaderboard, collaboration) disconnect every few seconds.

**Cause**: Nginx proxy timeout, missing WebSocket upgrade headers, or load balancer issues.

**Solution**:
```nginx
# Verify Nginx WebSocket configuration
location /ws/ {
    proxy_pass http://api_servers;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_read_timeout 86400s;   # 24 hours
    proxy_send_timeout 86400s;
}
```

```bash
# Test WebSocket connectivity
npx wscat -c ws://localhost:3000/ws
```

---

### Issue 7: "Too many connections" error from PostgreSQL

**Symptoms**: API returns 503 errors, logs show `remaining connection slots are reserved`.

**Cause**: Connection pool exhaustion due to leaked connections or excessive load.

**Solution**:
```bash
# 1. Check current connections
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity;"

# 2. Kill idle connections older than 10 minutes
psql "$DATABASE_URL" -c "
  SELECT pg_terminate_backend(pid)
  FROM pg_stat_activity
  WHERE state = 'idle'
    AND state_change < NOW() - INTERVAL '10 minutes';
"

# 3. Increase max_connections (temporary)
psql "$DATABASE_URL" -c "ALTER SYSTEM SET max_connections = 200;"
# Requires PostgreSQL restart

# 4. Long-term: deploy PgBouncer (see SCALING.md)
```

---

### Issue 8: File uploads fail with 413 "Request Entity Too Large"

**Symptoms**: Users cannot upload training materials or avatars.

**Cause**: Nginx or API server body size limit is too low.

**Solution**:
```nginx
# nginx.conf - Increase client body size
client_max_body_size 50m;
```

```typescript
// NestJS main.ts - Increase payload limit
app.use(json({ limit: '50mb' }));
app.use(urlencoded({ extended: true, limit: '50mb' }));
```

---

### Issue 9: SSO login redirects to a blank page

**Symptoms**: After authenticating with WeChat Work or Feishu, users see a blank page or error.

**Cause**: Callback URL mismatch, missing SSO configuration, or CORS issue.

**Solution**:
1. Verify the callback URL in the SSO provider's admin console matches `NEXT_PUBLIC_API_URL`.
2. Check that `WECHAT_WORK_CORP_ID`, `WECHAT_WORK_AGENT_ID`, and `WECHAT_WORK_SECRET` (or the Feishu equivalents) are set.
3. Check browser console for CORS errors.
4. Verify the SSO provider's IP whitelist includes the server IP.

```bash
# Debug SSO callback
curl -v "https://api.skillquest.example.com/auth/wechat-work/callback?code=test_code"
```

---

### Issue 10: Leaderboard shows stale data

**Symptoms**: Scores update in assessments but the leaderboard does not reflect new rankings.

**Cause**: Redis cache not invalidated, or the background ranking job is failing.

**Solution**:
```bash
# 1. Check if the leaderboard cache exists
redis-cli KEYS "cache:api:leaderboard:*"

# 2. Manually invalidate the leaderboard cache
redis-cli DEL "cache:api:leaderboard:comp_xyz789:v1"

# 3. Check the ranking job status
redis-cli LLEN "queue:leaderboard:update"

# 4. Trigger a manual recomputation
curl -X POST http://localhost:3000/api/v1/admin/leaderboard/recompute \
  -H "Authorization: Bearer <admin-token>"
```

---

### Issue 11: Memory leak in the API server

**Symptoms**: API server memory usage grows continuously until OOM kill.

**Cause**: Unclosed database connections, event listener leaks, or unbounded caches.

**Solution**:
```bash
# 1. Monitor Node.js heap usage
curl http://localhost:3000/metrics | grep nodejs_heap

# 2. Take a heap snapshot (development)
kill -USR2 <node_pid>

# 3. Check for event listener warnings in logs
grep "MaxListenersExceeded" /var/log/skillquest/*.log

# 4. Temporary fix: enable automatic restart on high memory
# In docker-compose.yml:
#   deploy:
#     resources:
#       limits:
#         memory: 2G
```

---

### Issue 12: CORS errors in the browser console

**Symptoms**: Frontend cannot make API requests, browser shows `Access-Control-Allow-Origin` errors.

**Cause**: API server CORS configuration does not include the frontend domain.

**Solution**:
```typescript
// NestJS CORS configuration
app.enableCors({
  origin: [
    'https://skillquest.example.com',
    'https://admin.skillquest.example.com',
    process.env.NODE_ENV === 'development' && 'http://localhost:3001',
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
});
```

---

### Issue 13: pnpm install fails with peer dependency conflicts

**Symptoms**: `pnpm install` exits with `ERR_PNPM_PEER_DEP_ISSUES`.

**Cause**: Conflicting peer dependency versions across workspace packages.

**Solution**:
```bash
# 1. Check which dependencies conflict
pnpm install --reporter=ndjson 2>&1 | grep "WARN"

# 2. Update the conflicting packages
pnpm update <package-name> --recursive

# 3. If necessary, add to .npmrc
echo "strict-peer-dependencies=false" >> .npmrc
pnpm install
```

---

### Issue 14: Docker build fails with "out of disk space"

**Symptoms**: `docker build` fails with `no space left on device`.

**Cause**: Docker cache and unused images consuming disk space.

**Solution**:
```bash
# 1. Check Docker disk usage
docker system df

# 2. Remove unused resources
docker system prune -a --volumes

# 3. Check host disk space
df -h /var/lib/docker
```

---

### Issue 15: Emails not being delivered (password reset, notifications)

**Symptoms**: Users do not receive password reset emails or notifications.

**Cause**: Email provider credentials missing, rate-limited, or SMTP blocked.

**Solution**:
```bash
# 1. Check email service logs
docker compose logs api | grep -i "email\|smtp\|sendgrid\|mail"

# 2. Test email delivery
curl -X POST http://localhost:3000/api/v1/admin/test-email \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"to": "test@example.com"}'

# 3. Verify email provider configuration
echo $SMTP_HOST $SMTP_PORT $SMTP_USER

# 4. Check if port 587 (SMTP) is open
nc -zv smtp.sendgrid.net 587
```

---

## Log Analysis Guide

### Where to Find Logs

| Service      | Location (Docker)                        | Location (K8s)                          |
| ------------ | ---------------------------------------- | --------------------------------------- |
| API          | `docker compose logs api`                | `kubectl logs -l app=api -n skillquest` |
| Web          | `docker compose logs web`                | `kubectl logs -l app=web -n skillquest` |
| AI           | `docker compose logs ai`                 | `kubectl logs -l app=ai -n skillquest`  |
| Nginx        | `docker compose logs nginx`              | `kubectl logs -l app=nginx -n skillquest` |
| PostgreSQL   | `docker compose logs postgres`           | `kubectl logs -l app=postgres -n skillquest` |
| Redis        | `docker compose logs redis`              | `kubectl logs -l app=redis -n skillquest` |

### Filtering Logs by Level

```bash
# Show only errors from the API service
docker compose logs api 2>&1 | jq 'select(.level == "error")'

# Show only warnings and errors
docker compose logs api 2>&1 | jq 'select(.level == "error" or .level == "warn")'

# Show logs for a specific user
docker compose logs api 2>&1 | jq 'select(.userId == "usr_abc123")'

# Show slow requests (>1 second)
docker compose logs api 2>&1 | jq 'select(.duration_ms > 1000)'
```

### Tracing a Request

Every request is assigned a unique `traceId`. Use it to follow a request across services:

```bash
# Find the trace ID from the initial request
docker compose logs api 2>&1 | jq 'select(.path == "/api/v1/courses/abc123")' | head -1

# Trace across all services
TRACE_ID="abc123def456"
for service in api web ai; do
  echo "=== $service ==="
  docker compose logs $service 2>&1 | jq "select(.traceId == \"$TRACE_ID\")"
done
```

### Common Log Patterns to Watch

| Pattern                           | Indicates                              | Action                       |
| --------------------------------- | -------------------------------------- | ---------------------------- |
| `"level":"error"`                 | Application error                      | Investigate immediately      |
| `"statusCode":429`               | Rate limiting triggered                | Check traffic patterns       |
| `"statusCode":503`               | Service unavailable                    | Check downstream dependencies|
| `"duration_ms":>5000`            | Very slow request                      | Check DB queries, AI calls   |
| `"ECONNREFUSED"`                 | Downstream service unreachable         | Check service health         |
| `"heap_used_bytes"` increasing   | Potential memory leak                  | Monitor and investigate      |
| `"MaxListenersExceeded"`         | Event listener leak                    | Fix code, investigate source |

---

## Performance Tuning Checklist

Apply these optimizations in order of impact:

### 1. Enable Database Indexes

```sql
-- Verify indexes exist on frequently queried columns
SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_users_tenant_id ON users(tenant_id);
CREATE INDEX CONCURRENTLY idx_courses_trainer_id ON courses(trainer_id);
CREATE INDEX CONCURRENTLY idx_progress_user_course ON learning_progress(user_id, course_id);
```

### 2. Optimize Prisma Queries

```typescript
// BAD: N+1 query problem
const courses = await prisma.course.findMany();
for (const course of courses) {
  course.trainer = await prisma.user.findUnique({ where: { id: course.trainerId } });
}

// GOOD: Eager loading with include
const courses = await prisma.course.findMany({
  include: { trainer: true },
});
```

### 3. Enable Redis Caching for Hot Paths

Cache the most frequently accessed and expensive data:
- Course listings (TTL: 5 min)
- Leaderboard rankings (TTL: 30 sec)
- User permissions (TTL: 5 min)
- AI generation results (TTL: 24 hours)

### 4. Configure Connection Pooling

```env
# Prisma connection pool
DATABASE_URL="postgresql://user:pass@localhost:5432/skillquest?connection_limit=20&pool_timeout=10"
```

### 5. Enable HTTP Compression

```nginx
# nginx.conf
gzip on;
gzip_types text/plain application/json application/javascript text/css;
gzip_min_length 1000;
gzip_comp_level 6;
```

### 6. Optimize Next.js Bundle

```bash
# Analyze bundle size
ANALYZE=true pnpm build

# Ensure dynamic imports for heavy components
# import dynamic from 'next/dynamic'
# const HeavyComponent = dynamic(() => import('./HeavyComponent'), { ssr: false })
```

### 7. Configure PostgreSQL Tuning Parameters

```ini
# postgresql.conf (for 16 GB RAM server)
shared_buffers = 4GB
effective_cache_size = 12GB
work_mem = 64MB
maintenance_work_mem = 1GB
random_page_cost = 1.1          # SSD storage
effective_io_concurrency = 200  # SSD storage
max_worker_processes = 8
max_parallel_workers_per_gather = 4
```

### 8. Enable Redis Pipeline for Batch Operations

```typescript
// BAD: Sequential Redis calls
await redis.get('key1');
await redis.get('key2');
await redis.get('key3');

// GOOD: Pipeline batch
const pipeline = redis.pipeline();
pipeline.get('key1');
pipeline.get('key2');
pipeline.get('key3');
const results = await pipeline.exec();
```

### 9. Optimize WebSocket Message Size

- Use binary protocols (MessagePack) instead of JSON for high-frequency messages.
- Compress WebSocket frames for large payloads.
- Batch small updates into periodic snapshots (e.g., every 500 ms).

### 10. Enable HTTP/2 and Keep-Alive

```nginx
# nginx.conf
server {
    listen 443 ssl http2;

    # Keep-alive to upstream
    location /api/ {
        proxy_pass http://api_servers;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}

# Upstream keep-alive
upstream api_servers {
    server api:3000;
    keepalive 64;
}
```

---

## Health Check Reference

### Endpoint Summary

| Endpoint              | Service    | Purpose                  | Expected Status | Timeout |
| --------------------- | ---------- | ------------------------ | --------------- | ------- |
| `GET /health`         | API        | Basic liveness           | 200             | 5s      |
| `GET /health/ready`   | API        | Readiness (all deps OK)  | 200             | 10s     |
| `GET /health/live`    | API        | Liveness (process alive) | 200             | 3s      |
| `GET /health/db`      | API        | Database connectivity    | 200             | 5s      |
| `GET /health/redis`   | API        | Redis connectivity       | 200             | 5s      |
| `GET /api/health`     | Web        | Next.js health           | 200             | 5s      |
| `GET /health`         | AI         | AI service health        | 200             | 5s      |

### Automated Health Check Script

```bash
#!/bin/bash
# scripts/health-check.sh

SERVICES=(
  "API|http://localhost:3000/health"
  "Web|http://localhost:3001/api/health"
  "AI|http://localhost:8000/health"
)

EXIT_CODE=0

for entry in "${SERVICES[@]}"; do
  IFS='|' read -r name url <<< "$entry"
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url")

  if [ "$STATUS" = "200" ]; then
    echo "✅ $name: OK ($url)"
  else
    echo "❌ $name: FAILED (status=$STATUS, url=$url)"
    EXIT_CODE=1
  fi
done

exit $EXIT_CODE
```

### Kubernetes Probes Configuration

```yaml
# Readiness probe - determines if the pod should receive traffic
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

# Liveness probe - determines if the pod should be restarted
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 15
  timeoutSeconds: 5
  failureThreshold: 3

# Startup probe - prevents premature liveness checks
startupProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 30
```

---

## Diagnostic Commands

### Quick System Status

```bash
# All-in-one status check
echo "=== Docker Services ===" && docker compose ps && \
echo "=== Disk Usage ===" && df -h / && \
echo "=== Memory ===" && free -h && \
echo "=== CPU Load ===" && uptime
```

### Database Diagnostics

```bash
# Table sizes
psql "$DATABASE_URL" -c "
  SELECT relname AS table, pg_size_pretty(pg_total_relation_size(relid)) AS size
  FROM pg_catalog.pg_statio_user_tables
  ORDER BY pg_total_relation_size(relid) DESC
  LIMIT 10;
"

# Slow query log (if enabled)
psql "$DATABASE_URL" -c "
  SELECT query, calls, mean_exec_time, total_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"

# Index usage statistics
psql "$DATABASE_URL" -c "
  SELECT relname, seq_scan, idx_scan,
         CASE WHEN seq_scan + idx_scan > 0
              THEN round(100.0 * idx_scan / (seq_scan + idx_scan), 1)
              ELSE 0 END AS idx_usage_pct
  FROM pg_stat_user_tables
  ORDER BY seq_scan DESC
  LIMIT 10;
"
```

### Redis Diagnostics

```bash
# Overall Redis info
redis-cli -u "$REDIS_URL" INFO | grep -E "used_memory_human|connected_clients|keyspace_hits|keyspace_misses"

# Key distribution by prefix
redis-cli -u "$REDIS_URL" --scan --pattern "*" | cut -d: -f1-2 | sort | uniq -c | sort -rn | head -20

# Slow log
redis-cli -u "$REDIS_URL" SLOWLOG GET 10
```

---

## Error Code Reference

| Error Code | HTTP Status | Description                    | User Message                        |
| ---------- | ----------- | ------------------------------ | ----------------------------------- |
| `AUTH_001` | 401         | Invalid credentials            | "Invalid email or password"         |
| `AUTH_002` | 401         | Token expired                  | "Session expired, please login"     |
| `AUTH_003` | 403         | Insufficient permissions       | "You do not have access"            |
| `AUTH_004` | 429         | Too many login attempts        | "Account locked, try in 15 minutes" |
| `RES_001`  | 404         | Resource not found             | "The requested item was not found"  |
| `RES_002`  | 409         | Resource conflict              | "This item already exists"          |
| `VAL_001`  | 400         | Validation error               | "Please check your input"           |
| `VAL_002`  | 413         | Payload too large              | "File size exceeds the limit"       |
| `AI_001`   | 503         | AI service unavailable         | "AI features temporarily unavailable"|
| `AI_002`   | 504         | AI generation timeout          | "Generation is taking too long"     |
| `AI_003`   | 429         | AI rate limit exceeded         | "Please wait before generating"     |
| `DB_001`   | 503         | Database connection failed     | "Service temporarily unavailable"   |
| `DB_002`   | 503         | Database timeout               | "Request timed out, please retry"   |
| `SYS_001`  | 500         | Internal server error          | "Something went wrong"              |
| `SYS_002`  | 503         | Service in maintenance mode    | "System maintenance in progress"    |

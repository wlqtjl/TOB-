# SkillQuest Operations Manual

> Day-to-day operational procedures, monitoring, alerting, backup, and disaster recovery.

---

## Table of Contents

1. [Monitoring Metrics](#monitoring-metrics)
2. [Prometheus Alerting Rules](#prometheus-alerting-rules)
3. [Log Collection and Analysis](#log-collection-and-analysis)
4. [Backup Strategy](#backup-strategy)
5. [Disaster Recovery Procedures](#disaster-recovery-procedures)
6. [Common Issue Runbooks](#common-issue-runbooks)
7. [Maintenance Windows](#maintenance-windows)
8. [On-Call Procedures](#on-call-procedures)

---

## Monitoring Metrics

### Key Performance Indicators (KPIs)

All services expose metrics via Prometheus-compatible `/metrics` endpoints.

| Metric                          | Type      | Target       | Alert Threshold        |
| ------------------------------- | --------- | ------------ | ---------------------- |
| API latency (p50)               | Histogram | < 50 ms      | > 100 ms               |
| API latency (p99)               | Histogram | < 500 ms     | > 2,000 ms             |
| API error rate (5xx)            | Counter   | < 0.1%       | > 1%                   |
| DB query time (p95)             | Histogram | < 50 ms      | > 200 ms               |
| DB connection pool utilization  | Gauge     | < 70%        | > 85%                  |
| WebSocket active connections    | Gauge     | —            | > 5,000                |
| Redis memory usage              | Gauge     | < 70%        | > 85%                  |
| Redis hit rate                  | Gauge     | > 90%        | < 80%                  |
| Redis operations per second     | Counter   | —            | > 40,000               |
| AI API response time (p95)      | Histogram | < 5,000 ms   | > 15,000 ms            |
| AI API daily cost (USD)         | Gauge     | < $50/day    | > $100/day             |
| AI API error rate               | Counter   | < 1%         | > 5%                   |
| Node.js heap usage              | Gauge     | < 70%        | > 85%                  |
| CPU utilization (per pod)       | Gauge     | < 60%        | > 80%                  |
| Memory utilization (per pod)    | Gauge     | < 70%        | > 85%                  |
| Disk I/O (PostgreSQL)           | Counter   | —            | > 80% of capacity      |

### Grafana Dashboards

Recommended dashboards (import IDs for Grafana):

| Dashboard                | Grafana ID | Description                        |
| ------------------------ | ---------- | ---------------------------------- |
| Node.js Application      | 11159      | Process metrics, event loop lag    |
| PostgreSQL Overview       | 9628       | Query performance, connections     |
| Redis Overview            | 11835      | Memory, hit rate, ops/sec          |
| Nginx Overview            | 12708      | Requests, upstream latency         |
| Kubernetes Cluster        | 6417       | Pod resources, node health         |

---

## Prometheus Alerting Rules

### API Service Alerts

```yaml
# prometheus/rules/api-alerts.yml
groups:
  - name: skillquest-api
    rules:
      - alert: HighAPILatency
        expr: histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{service="api"}[5m])) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "API p99 latency exceeds 2s"
          description: "API p99 latency is {{ $value }}s on {{ $labels.instance }}"

      - alert: HighAPIErrorRate
        expr: rate(http_requests_total{service="api", status=~"5.."}[5m]) / rate(http_requests_total{service="api"}[5m]) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "API 5xx error rate exceeds 1%"
          description: "Error rate is {{ $value | humanizePercentage }} on {{ $labels.instance }}"

      - alert: APIDown
        expr: up{job="skillquest-api"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "API service is down"
          description: "{{ $labels.instance }} has been down for more than 1 minute"
```

### Database Alerts

```yaml
# prometheus/rules/db-alerts.yml
groups:
  - name: skillquest-database
    rules:
      - alert: DatabaseConnectionPoolExhausted
        expr: pg_stat_activity_count / pg_settings_max_connections > 0.85
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "DB connection pool above 85%"
          description: "Active connections: {{ $value | humanizePercentage }} of max"

      - alert: SlowQueries
        expr: pg_stat_activity_max_tx_duration{state="active"} > 30
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Long-running query detected (>30s)"

      - alert: DatabaseDiskSpaceLow
        expr: pg_database_size_bytes / node_filesystem_size_bytes * 100 > 80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Database disk usage above 80%"
```

### Redis Alerts

```yaml
# prometheus/rules/redis-alerts.yml
groups:
  - name: skillquest-redis
    rules:
      - alert: RedisMemoryHigh
        expr: redis_memory_used_bytes / redis_memory_max_bytes > 0.85
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Redis memory usage above 85%"

      - alert: RedisHitRateLow
        expr: redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total) < 0.80
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Redis hit rate below 80%"

      - alert: RedisDown
        expr: redis_up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "Redis is unreachable"
```

### AI Service Alerts

```yaml
# prometheus/rules/ai-alerts.yml
groups:
  - name: skillquest-ai
    rules:
      - alert: AIHighLatency
        expr: histogram_quantile(0.95, rate(ai_request_duration_seconds_bucket[5m])) > 15
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "AI API p95 latency exceeds 15s"

      - alert: AIHighCost
        expr: sum(increase(ai_api_cost_usd_total[24h])) > 100
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "AI API daily cost exceeds $100"
          description: "24h rolling cost: ${{ $value }}"

      - alert: AIRateLimited
        expr: rate(ai_api_rate_limited_total[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "AI API is being rate-limited"
```

---

## Log Collection and Analysis

### Log Format

All services emit structured JSON logs to stdout for container-native collection.

```json
{
  "timestamp": "2024-01-15T10:30:00.123Z",
  "level": "info",
  "service": "api",
  "traceId": "abc123def456",
  "spanId": "789ghi",
  "method": "POST",
  "path": "/api/v1/courses",
  "statusCode": 201,
  "duration_ms": 45,
  "userId": "usr_abc123",
  "tenantId": "tenant_001",
  "message": "Course created successfully"
}
```

### Log Levels

| Level   | Usage                                           |
| ------- | ----------------------------------------------- |
| `error` | Unrecoverable errors, exceptions, failures      |
| `warn`  | Degraded functionality, approaching limits       |
| `info`  | Business events, request completions             |
| `debug` | Detailed diagnostic info (disabled in production)|

### ELK Stack Configuration

```yaml
# filebeat/filebeat.yml
filebeat.inputs:
  - type: container
    paths:
      - /var/lib/docker/containers/*/*.log
    processors:
      - decode_json_fields:
          fields: ["message"]
          target: ""
          overwrite_keys: true

output.elasticsearch:
  hosts: ["elasticsearch:9200"]
  indices:
    - index: "skillquest-api-%{+yyyy.MM.dd}"
      when.contains:
        container.labels.service: "api"
    - index: "skillquest-web-%{+yyyy.MM.dd}"
      when.contains:
        container.labels.service: "web"
    - index: "skillquest-ai-%{+yyyy.MM.dd}"
      when.contains:
        container.labels.service: "ai"
```

### Grafana Loki Alternative

```yaml
# promtail/config.yml
server:
  http_listen_port: 9080

positions:
  filename: /var/run/promtail/positions.yaml

clients:
  - url: http://loki:3100/loki/api/v1/push

scrape_configs:
  - job_name: containers
    static_configs:
      - targets: ["localhost"]
        labels:
          job: skillquest
          __path__: /var/lib/docker/containers/*/*.log
    pipeline_stages:
      - json:
          expressions:
            level: level
            service: service
            traceId: traceId
      - labels:
          level:
          service:
```

### Useful Log Queries

```bash
# Kibana KQL: Find all errors in the last hour
level: "error" AND @timestamp >= now-1h

# Kibana KQL: Slow API requests (>1s)
service: "api" AND duration_ms > 1000

# Loki LogQL: Error rate by service
sum(rate({job="skillquest"} | json | level="error" [5m])) by (service)

# Loki LogQL: Trace a specific request
{job="skillquest"} | json | traceId="abc123def456"
```

---

## Backup Strategy

### PostgreSQL Backup

| Method          | Frequency      | Retention | Description                       |
| --------------- | -------------- | --------- | --------------------------------- |
| `pg_dump` (full)| Daily 02:00 UTC| 30 days   | Logical full backup               |
| WAL archiving   | Continuous     | 7 days    | Point-in-time recovery (PITR)     |
| pg_basebackup   | Weekly         | 4 weeks   | Physical full backup              |

#### Automated pg_dump Script

```bash
#!/bin/bash
# scripts/backup-postgres.sh

BACKUP_DIR="/backups/postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/skillquest_${TIMESTAMP}.dump"

# Full compressed backup
pg_dump -Fc -h localhost -U skillquest_admin skillquest > "${BACKUP_FILE}"

# Verify backup integrity
pg_restore --list "${BACKUP_FILE}" > /dev/null 2>&1
if [ $? -eq 0 ]; then
  echo "Backup verified: ${BACKUP_FILE}"
else
  echo "ERROR: Backup verification failed!" >&2
  exit 1
fi

# Remove backups older than 30 days
find "${BACKUP_DIR}" -name "*.dump" -mtime +30 -delete

# Upload to object storage
aws s3 cp "${BACKUP_FILE}" s3://skillquest-backups/postgres/
```

#### WAL Archiving Configuration

```ini
# postgresql.conf
wal_level = replica
archive_mode = on
archive_command = 'aws s3 cp %p s3://skillquest-backups/wal/%f'
archive_timeout = 300
```

### Redis Backup

| Method | Frequency          | Retention | Description             |
| ------ | ------------------ | --------- | ----------------------- |
| RDB    | Every 15 minutes   | 7 days    | Point-in-time snapshot  |
| AOF    | Continuous (fsync) | 3 days    | Append-only file        |

```ini
# redis.conf
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
```

### Recovery Objectives

| Metric | Target  | Description                                  |
| ------ | ------- | -------------------------------------------- |
| RTO    | 4 hours | Maximum time to restore full service         |
| RPO    | 1 hour  | Maximum acceptable data loss window          |

---

## Disaster Recovery Procedures

### Scenario 1: Database Failure

1. **Detect**: Automated alert from `DatabaseDown` or health check failure.
2. **Assess**: Check PostgreSQL logs and connection status.
3. **Failover** (if using replication):
   ```bash
   # Promote standby to primary
   pg_ctl promote -D /var/lib/postgresql/data
   # Update DNS/connection strings to point to new primary
   ```
4. **Restore from backup** (if no standby):
   ```bash
   # Stop the API to prevent data corruption
   docker compose stop api web ai

   # Restore from latest pg_dump
   pg_restore -d skillquest /backups/postgres/latest.dump

   # Apply WAL logs for point-in-time recovery
   # Configure recovery.conf with restore_command

   # Restart services
   docker compose start api web ai
   ```
5. **Verify**: Run health checks and spot-check recent data.

### Scenario 2: Complete Infrastructure Loss

1. **Provision** new infrastructure (Terraform or manual).
2. **Restore** PostgreSQL from S3 backup.
3. **Restore** Redis (or allow cache warming from DB).
4. **Deploy** application via Helm or Docker Compose.
5. **Update** DNS records.
6. **Verify** all health checks and run smoke tests.

### Scenario 3: Data Corruption

1. **Identify** the corruption timestamp from audit logs.
2. **Stop** write traffic (enable maintenance mode).
3. **Restore** to the point-in-time just before corruption using WAL PITR.
4. **Verify** data integrity.
5. **Resume** traffic.

---

## Common Issue Runbooks

### Runbook 1: Database Connection Pool Exhaustion

**Symptoms**: API returns 503 errors, logs show "connection pool exhausted".

**Diagnosis**:
```bash
# Check active connections
psql -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"

# Find long-running queries
psql -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query
         FROM pg_stat_activity
         WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '30 seconds'
         ORDER BY duration DESC;"
```

**Resolution**:
1. Kill long-running queries:
   ```bash
   psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity
            WHERE state = 'active' AND now() - query_start > interval '5 minutes';"
   ```
2. Increase pool size temporarily in environment variables.
3. Restart API pods to release stale connections.
4. Investigate and fix the root cause (missing indexes, N+1 queries).

---

### Runbook 2: Redis Out-of-Memory (OOM)

**Symptoms**: Redis returns OOM errors, cache writes fail, application performance degrades.

**Diagnosis**:
```bash
# Check memory usage
redis-cli INFO memory

# Find large keys
redis-cli --bigkeys

# Check eviction policy
redis-cli CONFIG GET maxmemory-policy
```

**Resolution**:
1. **Immediate**: Flush non-critical cache namespaces:
   ```bash
   redis-cli KEYS "cache:leaderboard:*" | xargs redis-cli DEL
   ```
2. **Short-term**: Increase `maxmemory` limit or scale Redis.
3. **Long-term**:
   - Set appropriate TTLs on all cache keys.
   - Switch to `allkeys-lru` eviction policy.
   - Audit cache key sizes and optimize serialization.

---

### Runbook 3: AI API Rate Limiting

**Symptoms**: AI-powered features return errors or timeouts, logs show 429 status codes from OpenAI.

**Diagnosis**:
```bash
# Check rate limit headers in recent responses
grep "x-ratelimit" /var/log/skillquest/ai-service.log | tail -20

# Check current queue depth
redis-cli LLEN ai:generation:queue
```

**Resolution**:
1. **Immediate**: Enable request queuing with exponential backoff (already built-in).
2. **Short-term**: Reduce concurrent AI requests:
   ```bash
   # Update environment variable
   AI_MAX_CONCURRENT=3
   ```
3. **Long-term**:
   - Implement aggressive caching for similar prompts.
   - Pre-generate common question types during off-peak hours.
   - Request higher rate limits from OpenAI.
   - Consider a fallback model (e.g., `gpt-4o-mini`) for non-critical requests.

---

## Maintenance Windows

### Scheduled Maintenance

| Activity                  | Schedule              | Duration    | Impact        |
| ------------------------- | --------------------- | ----------- | ------------- |
| Database vacuum/analyze   | Daily 03:00 UTC       | ~10 min     | None          |
| Database migrations       | As needed (announced) | 5–30 min    | Brief downtime|
| Certificate renewal       | Auto (Let's Encrypt)  | < 1 min     | None          |
| OS/security patches       | Weekly Sunday 04:00   | ~15 min     | Rolling update|
| Major version upgrades    | Quarterly (announced) | 1–2 hours   | Planned outage|

### Maintenance Mode

```bash
# Enable maintenance mode (returns 503 to all non-health requests)
kubectl -n skillquest set env deployment/skillquest-api MAINTENANCE_MODE=true

# Disable maintenance mode
kubectl -n skillquest set env deployment/skillquest-api MAINTENANCE_MODE=false
```

---

## On-Call Procedures

### Escalation Path

| Level | Response Time | Contact         | Scope                        |
| ----- | ------------- | --------------- | ---------------------------- |
| P1    | 15 min        | On-call engineer| Service down, data loss risk |
| P2    | 1 hour        | On-call engineer| Degraded performance         |
| P3    | 4 hours       | Team lead       | Non-critical issues          |
| P4    | Next business day | Any engineer | Minor bugs, improvements     |

### On-Call Checklist

1. Acknowledge the alert within the SLA.
2. Check the relevant Grafana dashboard.
3. Follow the appropriate runbook.
4. If not resolved in 30 minutes, escalate.
5. Post an incident report within 24 hours.

# SkillQuest Scaling & Capacity Planning Guide

> Performance benchmarks, bottleneck analysis, and horizontal scaling strategies.

---

## Table of Contents

1. [Single-Machine Benchmarks](#single-machine-benchmarks)
2. [Bottleneck Analysis](#bottleneck-analysis)
3. [Horizontal Scaling Strategies](#horizontal-scaling-strategies)
4. [Caching Strategy](#caching-strategy)
5. [Cost Estimation](#cost-estimation)
6. [Load Testing](#load-testing)
7. [Scaling Decision Framework](#scaling-decision-framework)

---

## Single-Machine Benchmarks

Baseline performance measured on a single machine (8 CPU, 16 GB RAM, NVMe SSD).

### Application Layer

| Component           | Metric                | Baseline Value   | Conditions                      |
| ------------------- | --------------------- | ---------------- | ------------------------------- |
| Next.js (SSR)       | Requests/second       | ~500 req/s       | Cached pages, 4 workers         |
| Next.js (SSR)       | Avg latency           | ~20 ms           | Cached pages                    |
| Next.js (SSR)       | p99 latency           | ~120 ms          | Including DB-backed pages       |
| NestJS API          | Requests/second       | ~1,000 req/s     | Simple CRUD, 4 workers          |
| NestJS API          | Avg latency           | ~10 ms           | Simple CRUD operations          |
| NestJS API          | p99 latency           | ~80 ms           | Including complex queries       |
| AI Service (Python) | Requests/second       | ~20 req/s        | OpenAI API bound                |
| AI Service (Python) | Avg latency           | ~3,000 ms        | gpt-4o model                    |
| WebSocket Server    | Concurrent connections| ~5,000           | Per Node.js process             |

### Data Layer

| Component           | Metric                | Baseline Value   | Conditions                      |
| ------------------- | --------------------- | ---------------- | ------------------------------- |
| PostgreSQL          | Max connections       | 100              | Default configuration           |
| PostgreSQL          | Queries/second        | ~3,000 qps       | Simple SELECT queries           |
| PostgreSQL          | Complex queries       | ~200 qps         | JOINs, aggregations             |
| PostgreSQL          | Write throughput      | ~500 writes/s    | INSERT/UPDATE operations        |
| Redis               | Operations/second     | ~50,000 ops/s    | GET/SET operations              |
| Redis               | p99 latency           | < 1 ms           | Simple key-value operations     |
| Redis               | Max memory            | ~4 GB useful     | With eviction policy            |

### Network

| Component           | Metric                | Baseline Value   |
| ------------------- | --------------------- | ---------------- |
| Nginx               | Requests/second       | ~10,000 req/s    |
| Nginx               | Concurrent connections| ~10,000          |
| Static asset serving| Throughput            | ~1 Gbps          |

---

## Bottleneck Analysis

### Bottleneck 1: AI Question Generation

**Impact**: Highest latency component (3–15 seconds per request).

**Root Cause**: External API calls to OpenAI are inherently slow and rate-limited.

**Symptoms**:
- Trainers experience long waits when generating questions.
- AI generation queue grows during peak hours.
- 429 (rate limited) errors from OpenAI.

**Mitigation Strategies**:

| Strategy                      | Effort | Impact | Description                                |
| ----------------------------- | ------ | ------ | ------------------------------------------ |
| Response caching              | Low    | High   | Cache identical prompts in Redis (TTL 24h) |
| Background pre-generation     | Medium | High   | Generate questions asynchronously off-peak  |
| Request batching              | Medium | Medium | Batch similar requests into single API call |
| Fallback to smaller model     | Low    | Medium | Use gpt-4o-mini for non-critical tasks      |
| Self-hosted model             | High   | High   | Deploy local LLM for common question types  |

### Bottleneck 2: Leaderboard Updates

**Impact**: High database write contention during competitions.

**Root Cause**: Many concurrent score updates trigger frequent re-ranking queries.

**Symptoms**:
- Leaderboard page loads slowly during competitions.
- Database CPU spikes during active assessments.
- Lock contention on score tables.

**Mitigation Strategies**:

| Strategy                      | Effort | Impact | Description                                |
| ----------------------------- | ------ | ------ | ------------------------------------------ |
| Redis sorted sets             | Low    | High   | Use ZADD/ZRANGE for real-time ranking      |
| Event-driven updates          | Medium | High   | Queue score updates via Redis streams      |
| Materialized views            | Medium | Medium | Pre-compute rankings in PostgreSQL         |
| Eventual consistency          | Low    | Medium | Update leaderboard on 5-second intervals   |

### Bottleneck 3: Canvas Rendering (Frontend)

**Impact**: Browser performance degrades with complex training scenarios.

**Root Cause**: Large Canvas elements with many interactive components.

**Symptoms**:
- Low frame rate on mobile devices.
- High memory usage in browser.
- UI freezes during complex scenario rendering.

**Mitigation Strategies**:

| Strategy                      | Effort | Impact | Description                                |
| ----------------------------- | ------ | ------ | ------------------------------------------ |
| Virtualized rendering         | Medium | High   | Only render visible viewport elements      |
| Web Worker offloading         | Medium | High   | Move computation to background threads     |
| Progressive loading           | Low    | Medium | Load scenario components on demand         |
| Hardware acceleration         | Low    | Medium | Use CSS transforms for GPU rendering       |

### Bottleneck 4: WebSocket Connections

**Impact**: Server memory pressure with many concurrent real-time users.

**Root Cause**: Each WebSocket connection holds server memory.

**Symptoms**:
- Node.js heap memory grows with concurrent users.
- Connection drops during peak traffic.
- Event loop lag increases.

**Mitigation Strategies**:

| Strategy                      | Effort | Impact | Description                                |
| ----------------------------- | ------ | ------ | ------------------------------------------ |
| Redis Pub/Sub adapter         | Low    | High   | Distribute connections across instances     |
| Connection pooling             | Medium | Medium | Multiplex messages over fewer connections   |
| Graceful degradation          | Low    | Medium | Fall back to polling for excess connections |
| uWebSockets.js                | High   | High   | Replace ws library for 10x efficiency       |

---

## Horizontal Scaling Strategies

### Load Balancing with Nginx

```nginx
# nginx/nginx.conf
upstream api_servers {
    least_conn;
    server api-1:3000 weight=1;
    server api-2:3000 weight=1;
    server api-3:3000 weight=1;
    keepalive 64;
}

upstream websocket_servers {
    ip_hash;  # Sticky sessions for WebSocket
    server ws-1:3000;
    server ws-2:3000;
}

server {
    listen 443 ssl http2;

    location /api/ {
        proxy_pass http://api_servers;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }

    location /ws/ {
        proxy_pass http://websocket_servers;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### NestJS Cluster Mode

```typescript
// main.ts - Cluster mode for multi-core utilization
import * as cluster from 'cluster';
import * as os from 'os';

const numCPUs = os.cpus().length;

if (cluster.isPrimary) {
  console.log(`Primary ${process.pid} starting ${numCPUs} workers`);
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died, spawning replacement`);
    cluster.fork();
  });
} else {
  bootstrap(); // Start NestJS application
}
```

### PostgreSQL Connection Pooling with PgBouncer

```ini
# pgbouncer.ini
[databases]
skillquest = host=postgres port=5432 dbname=skillquest

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = 6432
auth_type = md5
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
min_pool_size = 5
reserve_pool_size = 5
reserve_pool_timeout = 3
server_idle_timeout = 600
```

**Connection flow**:
```
Application (1000 connections) → PgBouncer (25 pool) → PostgreSQL (100 max)
```

### Redis Cluster

For deployments exceeding 50,000 ops/s or 4 GB memory:

```yaml
# docker-compose.redis-cluster.yml
services:
  redis-node-1:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf
    ports: ["7001:6379"]

  redis-node-2:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf
    ports: ["7002:6379"]

  redis-node-3:
    image: redis:7-alpine
    command: redis-server --cluster-enabled yes --cluster-config-file nodes.conf
    ports: ["7003:6379"]
```

### PostgreSQL Read Replicas

For read-heavy workloads (analytics, reports, leaderboards):

```typescript
// Prisma read replica configuration
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: isReadQuery
        ? process.env.DATABASE_REPLICA_URL
        : process.env.DATABASE_URL,
    },
  },
});
```

---

## Caching Strategy

### Cache Layers

| Layer              | Technology | TTL       | Use Case                            |
| ------------------ | ---------- | --------- | ----------------------------------- |
| Browser cache      | HTTP Cache | 1 hour    | Static assets, public pages         |
| CDN                | Cloudflare | 24 hours  | Static assets, images               |
| Application cache  | Redis      | 5–60 min  | API responses, computed values      |
| Database cache     | PgBouncer  | N/A       | Connection pooling                  |
| Query cache        | Redis      | 1–5 min   | Expensive query results             |

### Cache Key Naming Convention

```
cache:{service}:{resource}:{identifier}:{version}
```

Examples:
```
cache:api:course:course_abc123:v2
cache:api:leaderboard:comp_xyz789:v1
cache:ai:generation:hash_abc123:v1
cache:api:user:usr_abc123:profile:v1
```

---

## Cost Estimation

### Cloud Infrastructure (Monthly)

| Component            | Small (≤100 users) | Medium (100–1K users) | Large (1K–10K users) |
| -------------------- | ------------------- | --------------------- | -------------------- |
| Compute (API + Web)  | $100                | $400                  | $1,500               |
| Database (PostgreSQL)| $50                 | $200                  | $800                 |
| Cache (Redis)        | $30                 | $100                  | $400                 |
| AI API (OpenAI)      | $50                 | $300                  | $2,000               |
| Storage              | $10                 | $50                   | $200                 |
| CDN / Bandwidth      | $10                 | $50                   | $200                 |
| Monitoring           | $20                 | $50                   | $150                 |
| Backup Storage       | $5                  | $20                   | $100                 |
| **Total**            | **~$275/mo**        | **~$1,170/mo**        | **~$5,350/mo**       |

### Cost per User (Monthly)

| Tier   | Cost/User | Notes                               |
| ------ | --------- | ----------------------------------- |
| Small  | $2.75     | Higher overhead per user             |
| Medium | $1.17     | Economy of scale begins              |
| Large  | $0.54     | Most cost-effective                  |

### AI Cost Breakdown

| Operation              | Avg Tokens | Cost/Request | Requests/Day (Medium) | Daily Cost |
| ---------------------- | ---------- | ------------ | --------------------- | ---------- |
| Question generation    | 2,000      | $0.02        | 500                   | $10.00     |
| Answer evaluation      | 1,000      | $0.01        | 1,000                 | $10.00     |
| Learning path suggest  | 1,500      | $0.015       | 200                   | $3.00      |
| Content summarization  | 3,000      | $0.03        | 100                   | $3.00      |

---

## Load Testing

### Recommended Tools

| Tool       | Use Case                        | Command                              |
| ---------- | ------------------------------- | ------------------------------------ |
| k6         | HTTP API load testing           | `k6 run loadtest.js`                |
| Artillery  | WebSocket + HTTP testing        | `artillery run scenario.yml`         |
| pgbench    | PostgreSQL benchmarking         | `pgbench -c 50 -T 60 skillquest`    |
| redis-benchmark | Redis benchmarking         | `redis-benchmark -t get,set -n 100000` |

### Sample k6 Test Script

```javascript
// loadtest/api-stress.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },  // Ramp up
    { duration: '5m', target: 100 },  // Sustain
    { duration: '2m', target: 500 },  // Peak
    { duration: '5m', target: 500 },  // Sustain peak
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<2000'],
    http_req_failed: ['rate<0.01'],
  },
};

export default function () {
  const res = http.get(`${__ENV.BASE_URL}/api/v1/courses`);
  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  sleep(1);
}
```

---

## Scaling Decision Framework

### When to Scale

| Signal                           | Action                             |
| -------------------------------- | ---------------------------------- |
| API p99 > 1s for 10+ minutes     | Add API server instance            |
| DB connections > 80% of max      | Deploy PgBouncer or add replicas   |
| Redis memory > 80%               | Scale Redis or add cluster nodes   |
| AI queue depth > 50 pending      | Add AI worker instances            |
| WebSocket connections > 4,000    | Add WebSocket server instances     |
| CPU sustained > 75% for 15 min   | Scale horizontally or vertically   |

### Scaling Checklist

1. ✅ Confirm the bottleneck with metrics (don't guess).
2. ✅ Check if caching can resolve the issue first.
3. ✅ Verify the database schema has proper indexes.
4. ✅ Run load tests to quantify the improvement.
5. ✅ Scale horizontally before vertically when possible.
6. ✅ Update monitoring thresholds after scaling.
7. ✅ Document the scaling decision and results.

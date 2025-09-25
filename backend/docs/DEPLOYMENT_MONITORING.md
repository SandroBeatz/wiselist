# Deployment and Monitoring Guide

## Table of Contents
- [Environment Setup](#environment-setup)
- [Production Deployment](#production-deployment)
- [Docker Deployment](#docker-deployment)
- [Railway Deployment](#railway-deployment)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Redis Configuration](#redis-configuration)
- [Monitoring and Observability](#monitoring-and-observability)
- [Performance Tuning](#performance-tuning)
- [Health Checks](#health-checks)
- [Scaling Considerations](#scaling-considerations)
- [Troubleshooting](#troubleshooting)

## Environment Setup

### Prerequisites
- Node.js 18+ and Yarn
- PostgreSQL 14+
- Redis 6+
- Docker (optional)

### Development Setup
```bash
# Clone the repository
git clone <repository-url>
cd api.wiselist

# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma db push

# Start development server
yarn start:dev
```

## Production Deployment

### Build Process
```bash
# Install production dependencies
yarn install --production

# Build the application
yarn build

# Generate Prisma client for production
npx prisma generate

# Start production server
yarn start:prod
```

### PM2 Configuration
Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'wiselist-api',
    script: 'dist/main.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024'
  }]
};
```

Start with PM2:
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Nginx Configuration
```nginx
upstream wiselist_api {
    server 127.0.0.1:3000;
    # Add more servers for load balancing
    # server 127.0.0.1:3001;
    # server 127.0.0.1:3002;
}

server {
    listen 80;
    server_name api.wiselist.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.wiselist.com;

    ssl_certificate /etc/ssl/certs/wiselist.crt;
    ssl_certificate_key /etc/ssl/private/wiselist.key;

    # WebSocket upgrade configuration
    location / {
        proxy_pass http://wiselist_api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # WebSocket timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 300s;
    }

    # Health check endpoint
    location /health {
        access_log off;
        proxy_pass http://wiselist_api/api/monitoring/health;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    limit_req zone=api burst=20 nodelay;
}
```

## Docker Deployment

### Dockerfile
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./
COPY prisma ./prisma/

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build application
RUN yarn build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nestjs -u 1001

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

USER nestjs

EXPOSE 3000

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main"]
```

### Docker Compose
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - POSTGRES_URI=postgresql://user:password@postgres:5432/wiselist
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: wiselist
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    restart: unless-stopped

  redis:
    image: redis:6-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    restart: unless-stopped
    command: redis-server --appendonly yes

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/ssl
    depends_on:
      - app
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

## Railway Deployment

Railway configuration is already available in `RAILWAY_DEPLOYMENT.md`. Key points:

### Railway Setup
1. Connect GitHub repository
2. Configure environment variables
3. Add PostgreSQL and Redis services
4. Deploy with automatic builds

### Environment Variables for Railway
```bash
# Database
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis
REDIS_URL=${{Redis.REDIS_URL}}

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://your-frontend-domain.com

# Optional: Monitoring
NEW_RELIC_LICENSE_KEY=your-new-relic-key
```

## Environment Variables

### Required Variables
```bash
# Database
POSTGRES_URI=postgresql://user:password@host:port/database

# Redis
REDIS_URL=redis://host:port
REDIS_PASSWORD=optional-password

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Google OAuth (if used)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Apple OAuth (if used)  
APPLE_CLIENT_ID=your-apple-client-id
APPLE_PRIVATE_KEY_PATH=path/to/apple/private/key
APPLE_KEY_ID=your-apple-key-id
APPLE_TEAM_ID=your-apple-team-id
```

### Optional Variables
```bash
# Server
PORT=3000
NODE_ENV=production
LOG_LEVEL=info

# CORS
CORS_ORIGIN=https://your-frontend-domain.com

# Rate Limiting
RATE_LIMIT_TTL=60000
RATE_LIMIT_MAX=100

# WebSocket
WS_HEARTBEAT_INTERVAL=30000
WS_MAX_CONNECTIONS=1000

# Monitoring
NEW_RELIC_LICENSE_KEY=your-new-relic-key
SENTRY_DSN=your-sentry-dsn

# Performance
CACHE_TTL_DEFAULT=300
MAX_QUERY_COMPLEXITY=1000
```

## Database Setup

### Production Database Configuration
```bash
# Create database
createdb wiselist_production

# Run migrations
DATABASE_URL="postgresql://user:password@host:port/wiselist_production" npx prisma db push

# Seed data (if needed)
NODE_ENV=production npm run seed
```

### Database Optimization
```sql
-- Create indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lists_owner_id ON "List" ("ownerId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_list_items_list_id ON "ListItem" ("listId");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_list_events_list_id ON "ListEvent" ("listId", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_list_item_events_item_id ON "ListItemEvent" ("listItemId", "createdAt");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email ON "User" ("email");
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_user_id ON "Profile" ("userId");

-- Optimize PostgreSQL settings for production
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET default_statistics_target = 100;
ALTER SYSTEM SET random_page_cost = 1.1;
SELECT pg_reload_conf();
```

## Redis Configuration

### Production Redis Setup
```bash
# Redis configuration file (redis.conf)
maxmemory 512mb
maxmemory-policy allkeys-lru
timeout 300
tcp-keepalive 60
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
```

### Redis Optimization
```bash
# Memory optimization
echo 'vm.overcommit_memory = 1' >> /etc/sysctl.conf

# Network optimization  
echo 'net.core.somaxconn = 65535' >> /etc/sysctl.conf

# Apply changes
sysctl -p
```

## Monitoring and Observability

### Health Checks
The API provides built-in health check endpoints:
```bash
# Basic health check
curl http://localhost:3000/api/monitoring/health

# Detailed metrics
curl http://localhost:3000/api/monitoring/metrics

# Cache statistics
curl http://localhost:3000/api/cache/stats
```

### Logging Configuration
```javascript
// logger.config.js
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

export const loggerConfig = WinstonModule.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'wiselist-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});
```

### Metrics Collection
The API tracks various metrics:
- WebSocket connection counts
- Cache hit/miss rates
- Database query performance
- Memory and CPU usage
- Request rate and response times

### Alerts Configuration
Set up alerts for:
- High error rates (>5%)
- Database connection issues
- Redis connection failures
- Memory usage >85%
- High response times (>2s)
- WebSocket connection drops

### Monitoring Tools Integration

#### New Relic
```javascript
// Add to main.ts
if (process.env.NEW_RELIC_LICENSE_KEY) {
  require('newrelic');
}
```

#### Sentry
```javascript
// Add to main.ts
import * as Sentry from '@sentry/node';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
  });
}
```

## Performance Tuning

### Application Settings
```javascript
// main.ts optimizations
app.use(compression());
app.enableCors({
  origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
  credentials: true,
});

// Global validation pipe with transform
app.useGlobalPipes(new ValidationPipe({
  transform: true,
  whitelist: true,
  forbidNonWhitelisted: true,
}));

// Rate limiting
app.use(rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
}));
```

### Database Connection Pooling
```javascript
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  connection_limit = 10
  pool_timeout = 20
}
```

### Caching Strategy
- Implement multi-layer caching (Redis + memory)
- Cache frequently accessed data (user lists, active users)
- Use appropriate TTL values
- Implement cache warming strategies

### WebSocket Optimization
```javascript
// WebSocket configuration
const server = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:5173',
    credentials: true,
  },
  transports: ['websocket'],
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
  allowEIO3: true,
});
```

## Health Checks

### Kubernetes Health Checks
```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: wiselist-api
spec:
  template:
    spec:
      containers:
      - name: api
        image: wiselist-api:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /api/monitoring/health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/monitoring/health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
```

### Docker Health Checks
```dockerfile
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1
```

Create `healthcheck.js`:
```javascript
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/monitoring/health',
  method: 'GET',
  timeout: 2000
};

const req = http.request(options, (res) => {
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

req.on('error', () => {
  process.exit(1);
});

req.on('timeout', () => {
  req.destroy();
  process.exit(1);
});

req.end();
```

## Scaling Considerations

### Horizontal Scaling
- Use load balancers (Nginx, HAProxy, ALB)
- Enable sticky sessions for WebSocket connections
- Share session state via Redis
- Use Redis pub/sub for cross-instance messaging

### Database Scaling
- Implement read replicas for read-heavy operations
- Use connection pooling
- Consider database sharding for large datasets
- Monitor query performance and optimize indexes

### Cache Scaling
- Use Redis Cluster for high availability
- Implement cache partitioning
- Monitor cache hit rates and adjust TTL values
- Use Redis Sentinel for automatic failover

### WebSocket Scaling
```javascript
// Redis adapter for Socket.io
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([
  pubClient.connect(),
  subClient.connect()
]);

server.adapter(createAdapter(pubClient, subClient));
```

## Troubleshooting

### Common Issues

#### Connection Issues
```bash
# Check if service is running
netstat -tlnp | grep 3000

# Check logs
tail -f logs/combined.log

# Check database connection
npx prisma studio

# Check Redis connection
redis-cli ping
```

#### Memory Issues
```bash
# Monitor memory usage
free -m
top -p $(pgrep node)

# Check for memory leaks
node --inspect dist/main.js
# Connect Chrome DevTools to inspect memory

# Adjust Node.js memory settings
node --max-old-space-size=2048 dist/main.js
```

#### Database Issues
```bash
# Check database connections
SELECT * FROM pg_stat_activity WHERE datname = 'wiselist';

# Check slow queries
SELECT query, mean_time, calls 
FROM pg_stat_statements 
ORDER BY mean_time DESC 
LIMIT 10;

# Check database size
SELECT pg_size_pretty(pg_database_size('wiselist'));
```

#### WebSocket Issues
```bash
# Check WebSocket connections
ss -tulpn | grep :3000

# Monitor WebSocket events
# Enable debug logging in development
DEBUG=socket.io* node dist/main.js
```

### Debugging Tools
- Use Node.js inspector for debugging
- Enable debug logging for development
- Use APM tools (New Relic, DataDog) for production monitoring
- Set up error tracking (Sentry, Bugsnag)

### Log Analysis
```bash
# Find errors in logs
grep -i error logs/combined.log

# Monitor real-time logs
tail -f logs/combined.log | grep -E "(error|warn)"

# Analyze request patterns
cat logs/combined.log | grep "GET\|POST\|PUT\|DELETE" | cut -d' ' -f1-3 | sort | uniq -c
```

## Maintenance

### Regular Tasks
- Monitor logs for errors and warnings
- Check database performance and optimize queries
- Update dependencies regularly
- Monitor cache hit rates and adjust strategies
- Review security logs and update configurations
- Backup database and Redis data
- Monitor resource usage and scale as needed

### Update Process
1. Test updates in staging environment
2. Run database migrations if needed
3. Deploy to production with zero-downtime strategy
4. Monitor application health post-deployment
5. Rollback if issues are detected

This completes the comprehensive deployment and monitoring guide for the Wiselist API with real-time WebSocket functionality.
# Production Deployment Checklist

## Pre-Deployment

- [ ] Review and update `.env.prod` with production values:
  - [ ] Set strong `POSTGRES_PASSWORD` (minimum 32 characters)
  - [ ] Ensure `PGPASSWORD` matches `POSTGRES_PASSWORD`
  - [ ] Update other environment variables as needed
  - [ ] Keep `.env.prod` out of version control (add to `.gitignore`)

- [ ] Database backup strategy:
  - [ ] Set up automated database backups
  - [ ] Document backup/restore procedures
  - [ ] Test restore process

- [ ] SSL/TLS Certificate:
  - [ ] Obtain SSL certificate (Let's Encrypt recommended)
  - [ ] Set up reverse proxy (nginx, AWS ALB, etc.) in front of port 80
  - [ ] Configure HTTPS on reverse proxy
  - [ ] Update HSTS headers for security

- [ ] Security hardening:
  - [ ] Review security headers in `nginx/nginx.prod.conf`
  - [ ] Configure firewall rules (only expose port 80/443)
  - [ ] Disable root login on database if using managed DB
  - [ ] Set up monitoring and logging

## Deployment Steps

### 1. Build Production Images

```bash
docker-compose -f docker-compose.prod.yml build --no-cache
```

Takes ~30 seconds with good internet. This:
- Builds Node.js backend with `npm ci --frozen-lockfile`
- Builds React frontend with Vite (`npm run build`)
- Creates nginx image with bundled frontend
- No separate frontend container needed

### 2. Start Services

```bash
docker-compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

Containers start in this order (managed by `depends_on`):
1. Database (PostgreSQL) - initializes database
2. Backend - waits for database, runs migrations, starts API
3. Nginx - waits for backend, serves frontend + proxies API

### 3. Verify Deployment

```bash
# Check all services healthy
docker-compose -f docker-compose.prod.yml ps

# Expected output:
#   Status: Up X seconds (healthy) for db and backend
#   Status: Up X seconds for nginx

# Test API endpoint
curl http://localhost/api/sample-groups

# Expected: Returns JSON array (even if empty)
```

### 4. Test Frontend

- Open browser: `http://localhost` (or your domain with HTTPS proxy)
- Should see Soundbroad React app
- Try creating a soundboard and adding sounds to verify end-to-end

## Post-Deployment

### Ongoing Maintenance

- [ ] Monitor logs daily:
  ```bash
  docker-compose -f docker-compose.prod.yml logs --tail 50 -f
  ```

- [ ] Check disk usage weekly:
  ```bash
  docker-compose -f docker-compose.prod.yml exec backend du -sh /usr/src/app/storage
  ```

- [ ] Database backups:
  ```bash
  docker-compose -f docker-compose.prod.yml exec db pg_dump -U soundbroad soundbroad > backup-$(date +%Y%m%d-%H%M%S).sql
  ```

- [ ] Update base images monthly:
  ```bash
  docker pull node:18-alpine
  docker pull postgres:16-alpine
  docker pull nginx:alpine
  docker-compose -f docker-compose.prod.yml build --no-cache
  ```

### Monitoring

- [ ] Set up log aggregation (ELK, Datadog, CloudWatch)
- [ ] Configure alerts for container failures
- [ ] Monitor disk usage and database growth
- [ ] Track API response times

### Scaling (if needed)

For higher traffic or redundancy:

1. **Database**: Consider managed PostgreSQL (AWS RDS, Google Cloud SQL)
2. **Backend**: Multiple instances with load balancing
3. **Frontend**: Already optimized (static files, gzip compression)
4. **Storage**: Move to S3 or shared storage if running multiple backends

## Emergency Procedures

### Restart Single Service

```bash
docker-compose -f docker-compose.prod.yml restart backend
```

### Restart All Services

```bash
docker-compose -f docker-compose.prod.yml restart
```

### View Recent Errors

```bash
docker-compose -f docker-compose.prod.yml logs backend | tail -50
```

### Rollback to Previous Version

```bash
# Stop current version
docker-compose -f docker-compose.prod.yml down

# Switch to previous git commit
git checkout main~1

# Start previous version
docker-compose -f docker-compose.prod.yml up -d --build

# Verify it works, then either:
# - Stay on previous version (fix issue first)
# - Or switch back to main once fixed
git checkout main
docker-compose -f docker-compose.prod.yml up -d --build
```

### Database Restore

```bash
# Stop backend to ensure no connections
docker-compose -f docker-compose.prod.yml stop backend

# Restore from backup
docker-compose -f docker-compose.prod.yml exec -T db psql -U soundbroad soundbroad < backup-DATE.sql

# Restart services
docker-compose -f docker-compose.prod.yml up -d
```

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| 502 Bad Gateway | Backend not responding | `docker-compose logs backend` |
| Frontend 404 | Nginx config issue | `docker-compose logs nginx` |
| Database connection error | PG not ready | Wait 10s, check `PGPASSWORD` |
| Slow performance | Too many connections | Increase `worker_processes` in `nginx.prod.conf` |
| High disk usage | Old log files | Configure log rotation in nginx |

## Documentation References

- Full production guide: [PRODUCTION.md](PRODUCTION.md)
- Docker Compose reference: `docker-compose.prod.yml`
- Nginx configuration: `nginx/nginx.prod.conf`
- Backend Dockerfile: `backend/Dockerfile.prod`
- Nginx Dockerfile: `Dockerfile.nginx.prod`

---

**Last Updated**: 2026-02-18  
**Production Infrastructure**: 3-container setup (db, backend, nginx with bundled frontend)  
**Estimated Time to Production**: 5-10 minutes (after initial build)

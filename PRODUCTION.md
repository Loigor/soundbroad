# Production Deployment Guide

## Quick Start

```bash
# Navigate to project root
cd soundbroad

# Build and start production stack
docker-compose -f docker-compose.prod.yml up -d --build
```

The application will be available at `http://localhost:8811`

## What's Different from Development

| Aspect | Development | Production |
|--------|-------------|-----------|
| Frontend | Vite dev server (HMR enabled) | Static files served by Nginx |
| Backend | ts-node-dev (auto-reload) | Compiled Node.js |
| Build Size | ~500MB each | Frontend ~150MB, Backend ~200MB |
| Startup Time | ~10 seconds | ~5 seconds |
| Hot Module Reload | Enabled | Disabled |
| Compression | None | gzip enabled |
| Caching | No | Browser cache enabled |
| Security Headers | None | Multiple headers added |

## Configuration

### Environment Variables

Production uses the same environment variables as development, but configured in `docker-compose.prod.yml`:

```yaml
environment:
  NODE_ENV: production
  PORT: 4000
  CORS_ORIGIN: "http://localhost,http://localhost:8811"
```

### Customizing CORS Origins

Update `CORS_ORIGIN` in `docker-compose.prod.yml` for your domain:

```yaml
CORS_ORIGIN: "https://yourdomain.com,https://api.yourdomain.com"
```

### Database Persistence

Production database volume is `db_data_prod`. To persist data:

```bash
# Backup database
docker-compose -f docker-compose.prod.yml exec db pg_dump -U soundbroad soundbroad > backup.sql

# Restore database
docker-compose -f docker-compose.prod.yml exec db psql -U soundbroad soundbroad < backup.sql
```

### Storage Persistence

Audio files are stored in `backend_storage_prod` volume:

```bash
# View stored files
docker-compose -f docker-compose.prod.yml exec backend ls -la /usr/src/app/storage
```

## Monitoring & Maintenance

### View Logs

```bash
# All services
docker-compose -f docker-compose.prod.yml logs -f

# Specific service
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f nginx
```

### Check Health

```bash
docker-compose -f docker-compose.prod.yml ps
```

### Restart Services

```bash
# Restart all
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend
```

### Update Code

```bash
# Pull latest changes
git pull

# Rebuild images with latest code
docker-compose -f docker-compose.prod.yml build --no-cache

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

## Performance Tuning

### Increase Worker Processes

Edit `nginx/nginx.prod.conf`:

```nginx
worker_processes 4;  # Match number of CPU cores
```

### Adjust Database Connections

Edit `docker-compose.prod.yml`:

```yaml
backend:
  environment:
    DATABASE_POOL_MAX: "20"  # Max connections
```

### Enable HTTP/2

For HTTPS setup with nginx (external):

```nginx
listen 443 ssl http2;
```

## Security Checklist

- [ ] Update `CORS_ORIGIN` to your actual domain
- [ ] Set strong PostgreSQL password in `docker-compose.prod.yml`
- [ ] Use HTTPS/TLS for external access (recommend using reverse proxy)
- [ ] Regularly update Docker images: `docker pull node:18-alpine`
- [ ] Monitor storage volume size
- [ ] Set up database backups
- [ ] Review security headers in `nginx/nginx.prod.conf`

## Troubleshooting

### Frontend not loading

```bash
# Check nginx logs
docker-compose -f docker-compose.prod.yml logs nginx

# Verify frontend built correctly
docker-compose -f docker-compose.prod.yml exec nginx ls -la /usr/share/nginx/html
```

### Backend connection errors

```bash
# Check backend logs
docker-compose -f docker-compose.prod.yml logs backend

# Test database connection
docker-compose -f docker-compose.prod.yml exec backend npm run migrate
```

### Database issues

```bash
# Access PostgreSQL
docker-compose -f docker-compose.prod.yml exec db psql -U soundbroad -d soundbroad

# Check disk space
docker-compose -f docker-compose.prod.yml exec db df -h
```

## Rolling Back

```bash
# Stop current version
docker-compose -f docker-compose.prod.yml down

# Remove images from failed deployment
docker rmi soundbroad:backend soundbroad:nginx

# Start previous version (docker will use old images)
docker-compose -f docker-compose.prod.yml up -d
```

## Scaling for Production

For a larger deployment:

1. **Use managed database** - Replace PostgreSQL with RDS/CloudSQL
2. **Separate reverse proxy** - Use external nginx/HAProxy for multiple backends
3. **Load balancing** - Run multiple backend instances behind load balancer
4. **CDN** - Serve static assets from CDN
5. **Container orchestration** - Use Kubernetes or Docker Swarm

See main README.md for more information.

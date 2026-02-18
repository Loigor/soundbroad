# Production Deployment Guide

## Architecture Overview

The production environment uses a minimal **3-container setup**:

- **PostgreSQL (db)**: Database for soundboards, sounds, and metadata
- **Express Backend (backend)**: API server and file storage
- **Nginx (nginx)**: Reverse proxy + static frontend server

**Key Innovation**: The frontend is built and bundled during container build time, then served statically by nginx. This eliminates the need for a separate frontend container and reduces resource usage significantly.

## Quick Start

```bash
# Navigate to project root
cd soundbroad

# Build and start production stack
docker-compose -f docker-compose.prod.yml up -d --build
```

The application will be available at `http://localhost`

## What's Different from Development

| Aspect | Development | Production |
|--------|-------------|-----------|
| Containers | 4 (frontend, backend, db, nginx) | 3 (backend, db, nginx combined with frontend) |
| Frontend | Vite dev server (HMR enabled) | Pre-built static files served by Nginx |
| Backend | ts-node-dev (auto-reload) | Compiled Node.js |
| Build Size | ~500MB each | Backend ~200MB, Nginx+Frontend ~250MB base |
| Startup Time | ~10 seconds | ~3 seconds |
| Hot Module Reload | Enabled | Disabled |
| Compression | None | gzip enabled |
| Caching | No | Browser cache enabled |
| Security Headers | None | Multiple headers added |
| Port | Frontend: 5173, Backend: 4000 | Nginx: 80 (frontend + API proxy) |

## Configuration

### Environment Variables

Production backend uses these variables (configured in `docker-compose.prod.yml`):

```yaml
environment:
  NODE_ENV: production
  PORT: 4000
  PGHOST: db                    # Internal Docker DNS
  PGPORT: 5432
  PGUSER: soundbroad
  PGPASSWORD: soundbroad        # CHANGE IN PRODUCTION!
  PGDATABASE: soundbroad
  FILE_STORAGE_PATH: /usr/src/app/storage
```

### About CORS

Since the frontend is served from the same Nginx instance that proxies `/api/*` requests to the backend, CORS is handled transparently through the nginx reverse proxy. No additional CORS configuration needed for same-origin requests.

## How the Frontend is Bundled

The production Nginx image uses a **multi-stage Docker build**:

1. **Build Stage** (`Dockerfile.nginx.prod`):
   - Installs Node.js dependencies: `npm ci --frozen-lockfile`
   - Builds React app with Vite: `npm run build`
   - Output: `/dist` folder with optimized bundles

2. **Production Stage**:
   - Starts with lean Nginx Alpine image
   - Copies built `/dist` to `/usr/share/nginx/html`
   - Configures Nginx to serve frontend + proxy API
   - Result: Single ~250MB image (vs. 2 separate images in old setup)

This approach means:
- ✅ No separate frontend container needed
- ✅ Smaller overall image size
- ✅ Faster deployments (one image vs. two)
- ✅ Simpler infrastructure (3 services vs. 4)
- ✅ Better resource efficiency

## Request Routing

How requests flow through the production setup:

```
Browser Request
       │
       └─→ Nginx (Port 80)
             │
             ├─→ /api/* ──proxy──→ Backend (Internal:4000) ──→ Database
             │
             └─→ /* ──serve──→ Static files from /dist
                              (React SPA - index.html)
```

For every request:
- **API calls** (`/api/sample-groups`, `/api/samples`, etc.) are proxied to the Express backend
- **Page navigation** (all non-API routes) serve `/index.html` for React Router to handle
- **Static assets** (JS, CSS, images) are served with long cache headers

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

# Specific service (watch in real-time)
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f nginx
docker-compose -f docker-compose.prod.yml logs -f db

# View logs from last 50 lines
docker-compose -f docker-compose.prod.yml logs --tail 50 backend
```

### Check Health

```bash
# View container status
docker-compose -f docker-compose.prod.yml ps

# Verify backend is healthy (health check runs every 30s)
docker inspect $(docker ps | grep soundbroad_backend | awk '{print $1}') | grep Health -A 10

# Test API endpoint manually
curl http://localhost/api/sample-groups
```

### Monitor Disk Usage

```bash
# Check storage volume size
docker-compose -f docker-compose.prod.yml exec backend du -sh /usr/src/app/storage

# Check database size
docker-compose -f docker-compose.prod.yml exec db du -sh /var/lib/postgresql/data
```

### Restart Services

```bash
# Restart all services (keeps data volumes intact)
docker-compose -f docker-compose.prod.yml restart

# Restart specific service
docker-compose -f docker-compose.prod.yml restart backend

# Restart with clean rebuild
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d --build
```

### Update Code

```bash
# Pull latest changes from git
git pull origin main

# Rebuild images with latest code (npm ci ensures reproducible deps)
docker-compose -f docker-compose.prod.yml build --no-cache backend nginx

# Start updated services (database state preserved)
docker-compose -f docker-compose.prod.yml up -d
```

### Database Operations

```bash
# Access PostgreSQL CLI
docker-compose -f docker-compose.prod.yml exec db psql -U soundbroad -d soundbroad

# Backup database
docker-compose -f docker-compose.prod.yml exec db pg_dump -U soundbroad soundbroad > backup-$(date +%Y%m%d).sql

# Restore database from backup
docker-compose -f docker-compose.prod.yml exec db psql -U soundbroad soundbroad < backup.sql

# Run migrations manually (normally runs automatically)
docker-compose -f docker-compose.prod.yml exec backend npm run migrate
```

## Performance Tuning

### Nginx Worker Processes

Edit `nginx/nginx.prod.conf` to match your CPU cores:

```nginx
worker_processes 4;  # Set to number of CPU cores for optimal performance
worker_connections 1024;
```

After editing, rebuild and redeploy:

```bash
docker-compose -f docker-compose.prod.yml build --no-cache nginx
docker-compose -f docker-compose.prod.yml up -d
```

### Gzip Compression

Already configured in `nginx/nginx.prod.conf` for:
- `text/plain`
- `text/css`
- `application/json`
- `application/javascript`

Reduces transfer size by ~70% for text-based assets.

### Browser Caching

Configured in nginx with separate policies:
- **Static assets** (JS, CSS, images): 1-year cache (files have content hashes)
- **HTML**: No cache (always fetch fresh for updates)
- **API responses**: No cache (real-time data)

## Security Checklist

For production deployment, ensure:

- [ ] **Change PostgreSQL password** in `docker-compose.prod.yml` (set strong password, never commit to git)
- [ ] **Use HTTPS/TLS** - Set up reverse proxy (AWS ALB, external nginx with Let's Encrypt, etc.) in front
- [ ] **Secure storage** - Restrict file permissions in `backend_storage_prod` volume
- [ ] **.env file handling** - Use `docker-compose --env-file .env.prod up` for sensitive vars
- [ ] **Firewall rules** - Block direct access to port 5432 (PostgreSQL), only expose port 80/443
- [ ] **Update base images** regularly: `docker pull node:18-alpine`, `docker pull postgres:16-alpine`, `docker pull nginx:alpine`
- [ ] **Monitor logs** for errors and suspicious activity
- [ ] **Set up automated backups** of database and file storage
- [ ] **Review security headers** in `nginx/nginx.prod.conf` (X-Frame-Options, X-Content-Type-Options, etc.)

### Example: Setting Strong DB Password

```bash
# Create .env.prod file (don't commit to git!)
echo "POSTGRES_PASSWORD=your-strong-random-password-here" > .env.prod

# Update docker-compose.prod.yml to use env var:
# environment:
#   POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}

# Deploy with env file
docker-compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

### HTTPS/TLS Setup

For production, use an external reverse proxy:

```nginx
# Example: nginx-proxy or AWS ALB
listen 443 ssl http2;
ssl_certificate /path/to/cert.pem;
ssl_certificate_key /path/to/key.pem;

upstream backend {
  server soundbroad_nginx_1:80;
}

server {
  location / {
    proxy_pass http://backend;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}

## Troubleshooting

### Frontend not loading or showing 404

```bash
# Check if Nginx container is running and healthy
docker-compose -f docker-compose.prod.yml ps

# View Nginx logs for errors
docker-compose -f docker-compose.prod.yml logs nginx

# Verify frontend files exist in nginx
docker-compose -f docker-compose.prod.yml exec nginx ls -la /usr/share/nginx/html

# Test accessing the app
curl -I http://localhost

# If getting blank page, check browser console for JavaScript errors
```

### API calls returning 502 Bad Gateway

```bash
# Check backend container status
docker-compose -f docker-compose.prod.yml ps

# View backend logs
docker-compose -f docker-compose.prod.yml logs backend

# Verify backend is running and healthy
docker-compose -f docker-compose.prod.yml exec backend curl http://localhost:4000/api/sample-groups

# Check if backend can connect to database
docker-compose -f docker-compose.prod.yml logs backend | grep -i postgres
```

### Database connection errors at startup

```bash
# Check database logs
docker-compose -f docker-compose.prod.yml logs db

# Verify database is accepting connections
docker-compose -f docker-compose.prod.yml exec db psql -U soundbroad -c "SELECT 1"

# Re-run migrations manually
docker-compose -f docker-compose.prod.yml exec backend npm run migrate

# If migrations fail, check the migrations folder
docker-compose -f docker-compose.prod.yml exec backend ls -la migrations/
```

### Slow performance or high resource usage

```bash
# Check container stats (CPU, memory, network)
docker stats --no-stream

# Check disk usage
docker-compose -f docker-compose.prod.yml exec backend du -sh /usr/src/app/storage

# Check database size
docker-compose -f docker-compose.prod.yml exec db du -sh /var/lib/postgresql/data

# Increase Nginx workers (see Performance section above)
```

### Audio files not uploading or playing

```bash
# Check storage volume permissions
docker-compose -f docker-compose.prod.yml exec backend ls -la /usr/src/app/storage

# Verify disk space available
docker-compose -f docker-compose.prod.yml exec backend df -h /usr/src/app/storage

# Check backend logs for file I/O errors
docker-compose -f docker-compose.prod.yml logs backend | grep -i storage
```

## Rolling Back

If a deployment fails:

```bash
# Stop current version
docker-compose -f docker-compose.prod.yml down

# Checkout previous working version from git
git checkout main~1

# Rebuild and start (docker will use old code)
docker-compose -f docker-compose.prod.yml up -d --build

# Verify it works
curl http://localhost/api/sample-groups

# If good, stay on this version; if bad, try further back
# git checkout main~2
# docker-compose -f docker-compose.prod.yml up -d --build
```

To restore the latest version:

```bash
git checkout main
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

## Scaling for Production

For larger deployments, consider:

### Database Scaling
- Use managed PostgreSQL (AWS RDS, Azure Database, Cloud SQL)
- Eliminates database from containers
- Automatic backups and failover included

### Multiple Backend Instances (within Docker)
Add to `docker-compose.prod.yml`:

```yaml
backend:
  deploy:
    replicas: 3  # Run 3 backend instances
    
# Nginx automatically load-balances via upstream
```

### External Load Balancing
- AWS Application Load Balancer (ALB)
- Azure Load Balancer
- Google Cloud Load Balancer
- HAProxy reverse proxy

### Storage Scaling
For shared file storage across multiple containers:
- S3 or similar object storage (recommended)
- NFS mount
- Persistent volume in Kubernetes

### Container Orchestration
For managing multiple services:
- **Docker Swarm**: Native Docker clustering
- **Kubernetes**: Industry standard for large deployments
- **AWS ECS**: Amazon's container service
- **Google Cloud Run**: Serverless container platform

## File Structure

Key files for production setup:

```
soundbroad/
├── docker-compose.prod.yml       # Main production config (3 services)
├── Dockerfile.nginx.prod         # Multi-stage: builds frontend + nginx
├── nginx/
│   └── nginx.prod.conf          # Production nginx configuration
├── backend/
│   ├── Dockerfile.prod          # Backend build + Node.js runtime
│   ├── .dockerignore            # Optimizes Docker layer caching
│   ├── package.json
│   ├── package-lock.json
│   └── src/
├── frontend/
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.ts
│   ├── .dockerignore
│   └── src/
├── migrations/                   # Database schema versions
│   ├── 001_init_schema.js
│   └── 002_add_sample_color.js
└── PRODUCTION.md                 # This file
```

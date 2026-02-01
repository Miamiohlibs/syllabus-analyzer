# Production Deployment Guide

This guide covers deploying the Syllabus Analyzer to production environments, including cloud platforms and on-premise servers.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Deployment Options](#deployment-options)
4. [Cloud Deployment](#cloud-deployment)
5. [On-Premise Deployment](#on-premise-deployment)
6. [Post-Deployment](#post-deployment)
7. [Monitoring & Maintenance](#monitoring--maintenance)

---

## Pre-Deployment Checklist

### Required Items

- [ ] OpenAI API key with sufficient credits
- [ ] Library API credentials configured
- [ ] Production domain name (if applicable)
- [ ] SSL certificate (for HTTPS)
- [ ] Server or cloud hosting account
- [ ] Environment variables configured
- [ ] Database/storage solution (if scaling beyond file-based storage)

### Security Review

- [ ] All API keys stored securely in environment variables
- [ ] `.env` files excluded from version control (verify `.gitignore`)
- [ ] CORS configured for production domain only
- [ ] Authentication/authorization implemented (if required)
- [ ] Rate limiting configured
- [ ] Input validation enabled on all endpoints

### Performance Optimization

- [ ] Frontend built for production (`npm run build`)
- [ ] Static assets optimized
- [ ] Database indexes created (if using database)
- [ ] Caching strategy implemented
- [ ] CDN configured for static assets (optional)

---

## Environment Configuration

### Production Environment Variables

Create `.env.production` files for both frontend and backend:

**Frontend (`.env.production`):**
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.edu
NEXT_PUBLIC_BASE_URL=https://syllabus.yourdomain.edu
NODE_ENV=production
```

**Backend (`backend/.env.production`):**
```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-production-key

# Primo API Configuration
PRIMO_API_BASE_URL=https://your-institution.primo.exlibrisgroup.com/primaws/rest/pub/pnxs
PRIMO_API_KEY=your-production-api-key
PRIMO_VID=your-view-id
PRIMO_TAB=Everything
PRIMO_SCOPE=MyInst_and_CI

# Application Configuration
BACKEND_PORT=8000
FRONTEND_URL=https://syllabus.yourdomain.edu
ENVIRONMENT=production

# Security
ALLOWED_ORIGINS=https://syllabus.yourdomain.edu
SECRET_KEY=your-secure-random-key-here

# Performance
MAX_WORKERS=4
UPLOAD_SIZE_LIMIT=100MB
```

---

## Deployment Options

### Option 1: Cloud Platform (Recommended for Most Institutions)

**Pros:**
- Automatic scaling
- Managed infrastructure
- Easy SSL/HTTPS setup
- Built-in monitoring
- No hardware maintenance

**Cons:**
- Ongoing costs
- Data stored off-premise

**Best For:** Most institutions, especially those without dedicated IT infrastructure

### Option 2: On-Premise Server

**Pros:**
- Complete control over data
- No recurring cloud costs
- Compliant with strict data policies

**Cons:**
- Requires IT infrastructure
- Manual scaling
- You manage backups and updates

**Best For:** Institutions with existing server infrastructure and data sovereignty requirements

---

## Cloud Deployment

### Vercel (Frontend) + Railway/DigitalOcean (Backend)

#### Deploy Frontend to Vercel

**Step 1: Prepare the Frontend**
```bash
# Build the frontend locally to test
npm run build
npm run start
```

**Step 2: Deploy to Vercel**
```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

**Step 3: Configure Environment Variables in Vercel**
- Go to Vercel dashboard → Your Project → Settings → Environment Variables
- Add:
  - `NEXT_PUBLIC_API_URL`: Your backend URL
  - `NEXT_PUBLIC_BASE_URL`: Your Vercel domain

**Step 4: Configure Custom Domain (Optional)**
- In Vercel dashboard → Domains
- Add your custom domain (e.g., syllabus.youruniversity.edu)
- Update DNS records as instructed

#### Deploy Backend to Railway

**Step 1: Create Railway Account**
- Visit [railway.app](https://railway.app)
- Sign up with GitHub

**Step 2: Prepare Backend for Railway**

Create `Procfile` in the backend directory:
```
web: uvicorn app:app --host 0.0.0.0 --port $PORT
```

Create `runtime.txt`:
```
python-3.11
```

**Step 3: Deploy**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd backend
railway init

# Deploy
railway up
```

**Step 4: Configure Environment Variables in Railway**
- In Railway dashboard → Your Project → Variables
- Add all variables from `backend/.env.production`

**Step 5: Get Backend URL**
- Railway will provide a URL like `https://your-app.railway.app`
- Update frontend `NEXT_PUBLIC_API_URL` in Vercel to this URL

### AWS Deployment (Elastic Beanstalk + S3)

#### Frontend to AWS S3 + CloudFront

**Step 1: Build Frontend**
```bash
npm run build
```

**Step 2: Deploy to S3**
```bash
# Install AWS CLI
pip install awscli

# Configure AWS credentials
aws configure

# Create S3 bucket
aws s3 mb s3://syllabus-analyzer-frontend

# Upload build
aws s3 sync out/ s3://syllabus-analyzer-frontend --acl public-read

# Enable static website hosting
aws s3 website s3://syllabus-analyzer-frontend --index-document index.html
```

**Step 3: Configure CloudFront (Optional CDN)**
- Create CloudFront distribution pointing to S3 bucket
- Configure SSL certificate
- Update DNS to point to CloudFront

#### Backend to Elastic Beanstalk

**Step 1: Prepare Application**

Create `application.py` in backend directory:
```python
from app import app as application

if __name__ == "__main__":
    application.run()
```

**Step 2: Create `.ebextensions/` Configuration**

Create `backend/.ebextensions/python.config`:
```yaml
option_settings:
  aws:elasticbeanstalk:container:python:
    WSGIPath: application:application
  aws:elasticbeanstalk:application:environment:
    PYTHONPATH: /var/app/current
```

**Step 3: Deploy**
```bash
# Install EB CLI
pip install awsebcli

# Initialize EB
cd backend
eb init -p python-3.11 syllabus-analyzer-backend

# Create environment
eb create production-env

# Deploy
eb deploy
```

### Google Cloud Platform (Cloud Run)

#### Deploy Backend to Cloud Run

**Step 1: Create Dockerfile**

Create `backend/Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Step 2: Deploy**
```bash
# Install gcloud CLI
# Visit: https://cloud.google.com/sdk/docs/install

# Authenticate
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Build and deploy
cd backend
gcloud run deploy syllabus-analyzer-backend \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

---

## On-Premise Deployment

### Ubuntu Server Setup

**Step 1: Prepare Server**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx
```

**Step 2: Deploy Application**
```bash
# Clone repository
cd /var/www
sudo git clone <repository-url> syllabus-analyzer
cd syllabus-analyzer

# Frontend setup
npm install
npm run build

# Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**Step 3: Configure Systemd Services**

Create `/etc/systemd/system/syllabus-backend.service`:
```ini
[Unit]
Description=Syllabus Analyzer Backend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/syllabus-analyzer/backend
Environment="PATH=/var/www/syllabus-analyzer/backend/venv/bin"
EnvironmentFile=/var/www/syllabus-analyzer/backend/.env.production
ExecStart=/var/www/syllabus-analyzer/backend/venv/bin/uvicorn app:app --host 0.0.0.0 --port 8000
Restart=always

[Install]
WantedBy=multi-user.target
```

Create `/etc/systemd/system/syllabus-frontend.service`:
```ini
[Unit]
Description=Syllabus Analyzer Frontend
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/syllabus-analyzer
Environment="PATH=/usr/bin/node"
EnvironmentFile=/var/www/syllabus-analyzer/.env.production
ExecStart=/usr/bin/npm run start
Restart=always

[Install]
WantedBy=multi-user.target
```

**Step 4: Start Services**
```bash
sudo systemctl daemon-reload
sudo systemctl enable syllabus-backend
sudo systemctl enable syllabus-frontend
sudo systemctl start syllabus-backend
sudo systemctl start syllabus-frontend
```

**Step 5: Configure Nginx**

Create `/etc/nginx/sites-available/syllabus-analyzer`:
```nginx
# Backend API
server {
    listen 80;
    server_name api.yourdomain.edu;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}

# Frontend
server {
    listen 80;
    server_name syllabus.yourdomain.edu;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/syllabus-analyzer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Step 6: Configure SSL**
```bash
sudo certbot --nginx -d syllabus.yourdomain.edu -d api.yourdomain.edu
```

---

## Post-Deployment

### Verification Checklist

- [ ] Frontend accessible at production URL
- [ ] Backend API responding (check /docs endpoint)
- [ ] HTTPS working correctly
- [ ] Environment variables loaded properly
- [ ] PDF downloads working
- [ ] Metadata extraction functional
- [ ] Library API integration working
- [ ] Export functionality operational
- [ ] Error logging enabled

### Testing in Production

**Test Basic Workflow:**
1. Access the frontend URL
2. Select a department
3. Start an analysis job
4. Verify PDFs download to server
5. Check metadata extraction works
6. Test library matching
7. Export results as JSON and CSV
8. Verify all data is correct

**Test Error Handling:**
1. Test with invalid URLs
2. Test with malformed PDFs
3. Verify error messages display properly
4. Check error logging captures issues

---

## Monitoring & Maintenance

### Logging

**Frontend Logging:**
- Use Vercel Analytics (if on Vercel)
- Or configure custom logging service (Sentry, LogRocket)

**Backend Logging:**
```python
# Add to backend/app.py
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/var/log/syllabus-analyzer/backend.log'),
        logging.StreamHandler()
    ]
)
```

### Monitoring Tools

**Recommended:**
- **Uptime Monitoring**: UptimeRobot, Pingdom
- **Application Monitoring**: New Relic, Datadog
- **Error Tracking**: Sentry
- **Log Aggregation**: Papertrail, Loggly

### Backup Strategy

**What to Backup:**
1. Downloaded PDFs (`backend/downloads/`)
2. Extracted metadata (`backend/results/`)
3. Environment configuration files
4. Database (if using one)

**Backup Schedule:**
- **Daily**: Incremental backups of results
- **Weekly**: Full system backup
- **Monthly**: Archive old data

**Example Backup Script:**
```bash
#!/bin/bash
# backup-syllabus-analyzer.sh

BACKUP_DIR="/backups/syllabus-analyzer"
DATE=$(date +%Y%m%d)

# Create backup directory
mkdir -p $BACKUP_DIR/$DATE

# Backup downloads and results
tar -czf $BACKUP_DIR/$DATE/data.tar.gz \
  /var/www/syllabus-analyzer/backend/downloads \
  /var/www/syllabus-analyzer/backend/results

# Keep only last 30 days
find $BACKUP_DIR -type d -mtime +30 -exec rm -rf {} +
```

Add to crontab:
```bash
0 2 * * * /usr/local/bin/backup-syllabus-analyzer.sh
```

### Updates & Patches

**Regular Maintenance:**
```bash
# Update frontend dependencies
npm update
npm audit fix

# Update backend dependencies
cd backend
source venv/bin/activate
pip list --outdated
pip install -U <package-name>

# Update requirements.txt
pip freeze > requirements.txt
```

**Security Updates:**
- Monitor GitHub security alerts
- Subscribe to security mailing lists for dependencies
- Update OpenAI SDK regularly
- Patch OS and system packages monthly

### Performance Tuning

**Backend Optimization:**
```python
# In backend/app.py, configure worker processes
# For production with 4 CPU cores:
# uvicorn app:app --workers 4 --host 0.0.0.0 --port 8000
```

**Database Optimization (if using database):**
- Add indexes on frequently queried fields
- Implement connection pooling
- Configure query caching

**Scaling Strategies:**
- **Horizontal**: Add more server instances behind load balancer
- **Vertical**: Increase server RAM/CPU for batch processing
- **Queue System**: Implement Celery or RQ for background jobs

---

## Troubleshooting Production Issues

### Common Issues

**Application Won't Start:**
```bash
# Check service status
sudo systemctl status syllabus-backend
sudo systemctl status syllabus-frontend

# Check logs
sudo journalctl -u syllabus-backend -f
sudo journalctl -u syllabus-frontend -f
```

**High Memory Usage:**
- Reduce `MAX_WORKERS` in environment
- Implement file cleanup for old downloads
- Add memory limits in systemd service file

**Slow Performance:**
- Enable caching (Redis)
- Optimize database queries
- Use CDN for static assets
- Implement rate limiting

**SSL Certificate Issues:**
```bash
# Renew certificate
sudo certbot renew

# Auto-renewal is configured by default, check:
sudo systemctl status certbot.timer
```

---

## Security Best Practices

1. **Never commit `.env` files to version control**
2. **Use strong, unique passwords and keys**
3. **Enable firewall on server:**
   ```bash
   sudo ufw allow 22    # SSH
   sudo ufw allow 80    # HTTP
   sudo ufw allow 443   # HTTPS
   sudo ufw enable
   ```
4. **Implement rate limiting to prevent abuse**
5. **Regular security audits:**
   ```bash
   npm audit
   pip-audit
   ```
6. **Keep all software updated**
7. **Monitor access logs for suspicious activity**
8. **Implement authentication if exposing to public internet**

---

## Rollback Plan

In case of failed deployment:

**Quick Rollback:**
```bash
# If using git
cd /var/www/syllabus-analyzer
git log --oneline  # Find previous commit
git checkout <previous-commit-hash>
sudo systemctl restart syllabus-backend syllabus-frontend
```

**Full Rollback from Backup:**
```bash
# Restore from backup
cd /var/www
sudo mv syllabus-analyzer syllabus-analyzer.failed
sudo tar -xzf /backups/syllabus-analyzer/YYYYMMDD/data.tar.gz
sudo systemctl restart syllabus-backend syllabus-frontend
```

---

## Support & Resources

- **API Documentation**: See `docs/API.md`
- **Troubleshooting**: See `docs/TROUBLESHOOTING.md`
- **Customization**: See `docs/CUSTOMIZATION.md`

---

*Your production deployment is complete! Monitor the system closely for the first few days and address any issues promptly.*

# Railway Deployment Instructions

## Prerequisites

1. Create account on [Railway.app](https://railway.app)
2. Install Railway CLI: `npm install -g @railway/cli` (optional)

## Database Setup

1. In Railway dashboard, create new project
2. Add PostgreSQL database:
   - Click "New" → "Database" → "Add PostgreSQL"
   - Copy the connection details for environment variables

## Environment Variables

In Railway dashboard, go to your service → Variables tab and set:

```
POSTGRES_DB=railway
POSTGRES_USER=postgres
POSTGRES_PASSWORD=ElWAdgDfzaQxlthOMXKkHfbmYExNQdWT
POSTGRES_PORT=5432
POSTGRES_URI=postgresql://postgres:ElWAdgDfzaQxlthOMXKkHfbmYExNQdWT@caboose.proxy.rlwy.net:58727/railway
JWT_SECRET=d64c98fcb767c2763e7accf795144fb3bd167f6cf9b1ab7005cdc78204af77581c84ac9bd500d198cc975a41ebeb01148c1d3113e898da4bf3fc943df239d4db
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
CORS_ORIGIN=https://your-frontend-domain.com
NODE_ENV=production
PORT=3000
```

## Deployment Steps

### GitHub Integration (Recommended)

1. Push your code to GitHub repository
2. In Railway dashboard:
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository
   - Railway will automatically detect Dockerfile and start building

### Manual Deployment via CLI

1. Login to Railway: `railway login`
2. Initialize project: `railway init`
3. Link to existing project or create new one
4. Deploy: `railway up`

## Database Setup After Deployment

After successful deployment, you need to set up the database schema:

### Option 1: Via Railway CLI
```bash
railway run npx prisma db push
```

### Option 2: Via Railway Dashboard
1. Go to your service in Railway dashboard
2. Click on "Settings" → "Command"
3. Run command: `npx prisma db push`

## Verification

1. Check deployment logs in Railway dashboard
2. Test API health endpoint:
   ```bash
   curl https://your-app-name.railway.app/
   ```
3. Test authentication endpoint:
   ```bash
   curl https://your-app-name.railway.app/auth/me
   ```

## Important Notes

- Railway automatically assigns a domain like `your-app-name.railway.app`
- Database URL is automatically injected by Railway if you use their PostgreSQL addon
- Make sure to copy the correct `POSTGRES_URI` and other database variables from Railway's database settings
- The Dockerfile is optimized for Railway's build process
- Prisma client generation happens during Docker build

## Troubleshooting Common Issues

1. **Prisma Client Error**: Ensure `npx prisma generate` runs during build and `npx prisma db push` after deployment
2. **Database Connection**: Verify `POSTGRES_URI` and other database variables match exactly from Railway database settings
3. **Environment Variables**: Double-check all required env vars are set in Railway dashboard
4. **Build Failures**: Check Railway build logs for missing dependencies or compilation errors
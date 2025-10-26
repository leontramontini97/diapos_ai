# Worker Deployment Guide

## Overview

This guide walks you through deploying the lecture processing worker to Railway and connecting it to your Next.js frontend on Vercel.

## Prerequisites

- Railway account (https://railway.app)
- Vercel project with environment variables configured
- AWS S3 bucket for file storage
- OpenAI API key

## Step 1: Prepare Environment Variables

You'll need these environment variables for the worker:

```bash
OPENAI_API_KEY=sk-...
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name
WORKER_CALLBACK_URL=https://your-vercel-app.vercel.app/api/jobs/callback
WORKER_CALLBACK_SECRET=<generate-random-secret>
```

Generate a random secret for `WORKER_CALLBACK_SECRET`:
```bash
openssl rand -hex 32
```

## Step 2: Deploy to Railway

### Option A: Deploy from GitHub (Recommended)

1. Push the `worker/` directory to your GitHub repository
2. Go to https://railway.app
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Railway will auto-detect the Dockerfile
6. Set the root directory to `worker` if needed
7. Add all environment variables in Railway dashboard
8. Deploy!

### Option B: Deploy with Railway CLI

1. Install Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login:
```bash
railway login
```

3. Initialize project in `worker/` directory:
```bash
cd worker/
railway init
```

4. Set environment variables:
```bash
railway variables set OPENAI_API_KEY=sk-...
railway variables set AWS_ACCESS_KEY_ID=AKIA...
railway variables set AWS_SECRET_ACCESS_KEY=...
railway variables set AWS_REGION=us-east-1
railway variables set S3_BUCKET=your-bucket-name
railway variables set WORKER_CALLBACK_URL=https://your-app.vercel.app/api/jobs/callback
railway variables set WORKER_CALLBACK_SECRET=your-secret
```

5. Deploy:
```bash
railway up
```

6. Generate domain:
```bash
railway domain
```

## Step 3: Configure Vercel

After Railway deployment completes:

1. Copy your Railway service URL (e.g., `https://your-worker.up.railway.app`)
2. Go to your Vercel project settings
3. Add/update environment variables:
   - `WORKER_URL` = `https://your-worker.up.railway.app`
   - `WORKER_CALLBACK_SECRET` = (same secret as Railway)
4. Redeploy your Next.js app on Vercel

## Step 4: Verify Deployment

### Test the health endpoint

```bash
curl https://your-worker.up.railway.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "1.0.0"
}
```

### Test the process endpoint

```bash
curl -X POST https://your-worker.up.railway.app/process \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "test-123",
    "s3Key": "uploads/test.pdf",
    "email": "test@example.com",
    "language": "Spanish"
  }'
```

Expected response (202 Accepted):
```json
{
  "jobId": "test-123",
  "status": "accepted",
  "message": "Processing started"
}
```

## Step 5: End-to-End Test

1. Sign up on your app (https://your-app.vercel.app)
2. Purchase a credit
3. Upload a PDF lecture
4. Verify:
   - Job is created in the database
   - Worker receives the job (check Railway logs)
   - Worker processes the PDF
   - Worker sends callback to Next.js
   - Next.js updates job status to "completed"
   - UI shows download links for outputs

## Monitoring & Logs

### Railway Logs

View logs in Railway dashboard or via CLI:
```bash
railway logs
```

Look for structured log lines with `jobId`:
```
2024-01-15 10:30:45 - pipeline - INFO - [jobId=abc-123] Starting pipeline
2024-01-15 10:30:46 - pipeline - INFO - [jobId=abc-123] Downloading PDF from S3
2024-01-15 10:30:50 - pipeline - INFO - [jobId=abc-123] Processing slide 1/10
...
2024-01-15 10:32:30 - pipeline - INFO - [jobId=abc-123] Pipeline complete
2024-01-15 10:32:31 - callback - INFO - [jobId=abc-123] Callback sent successfully
```

### Vercel Logs

Check Vercel logs for:
- `/api/process-lecture` - Job creation and worker invocation
- `/api/jobs/callback` - Callback receipt and job updates
- `/api/jobs/[id]` - Job status polling

## Troubleshooting

### Worker not receiving jobs

- Check `WORKER_URL` in Vercel env vars
- Verify Railway service is running
- Check Railway logs for incoming requests

### Callback failing

- Verify `WORKER_CALLBACK_SECRET` matches on both Railway and Vercel
- Check `WORKER_CALLBACK_URL` points to correct Vercel domain
- Look for signature verification errors in Vercel logs

### S3 errors

- Verify AWS credentials are correct
- Check S3 bucket exists and worker has read/write permissions
- Verify `AWS_REGION` matches bucket region

### OpenAI errors

- Verify `OPENAI_API_KEY` is valid
- Check OpenAI API quota/billing
- Look for rate limit errors in Railway logs

## Scaling

### Railway Auto-scaling

Railway automatically scales based on:
- CPU usage
- Memory usage
- Request volume

Configure scaling in Railway dashboard under "Settings" → "Scaling".

### Cost Optimization

- Monitor Railway usage dashboard
- Set resource limits to avoid unexpected costs
- Consider upgrading to Railway Pro for better rates at scale

## Migration to AWS (Future)

If you need to migrate to AWS Fargate/ECS later:

1. Push Docker image to ECR
2. Create ECS task definition with same env vars
3. Deploy to Fargate
4. Update `WORKER_URL` in Vercel to point to ALB/service URL
5. No code changes needed (fully containerized)

## Security Notes

- Keep `WORKER_CALLBACK_SECRET` secret and rotate periodically
- Use HTTPS only (Railway provides this by default)
- Consider IP allowlisting if Railway supports it
- Monitor for suspicious job patterns
- Set resource limits to prevent DoS via expensive jobs


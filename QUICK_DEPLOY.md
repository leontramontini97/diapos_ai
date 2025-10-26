# Quick Deploy Guide - Railway Worker

## Prerequisites Checklist

- [] Railway account created (https://railway.app)
- [ ] OpenAI API key
- [ ] AWS S3 bucket with read/write access
- [ ] Vercel project deployed
- [ ] Supabase database configured

## 5-Minute Deploy

### Step 1: Generate Secret (Local Terminal)

```bash
openssl rand -hex 32
```

Copy this output - you'll use it for `WORKER_CALLBACK_SECRET`

### Step 2: Deploy to Railway

**Option A: GitHub (Recommended)**
1. Push code to GitHub
2. Go to https://railway.app
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Set root directory to `worker` (if needed)
6. Railway auto-detects Dockerfile ✓




### Step 3: Set Environment Variables in Railway

Go to Railway project → Variables → Add:

```bash
OPENAI_API_KEY=sk-proj-...
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-2
S3_BUCKET=your-bucket-name
WORKER_CALLBACK_URL=https://your-app.vercel.app/api/jobs/callback
WORKER_CALLBACK_SECRET=<paste-secret-from-step-1>
```

### Step 4: Get Railway URL

Railway → Settings → Generate Domain

Copy the URL (e.g., `https://your-worker.up.railway.app`)

### Step 5: Configure Vercel

Vercel project → Settings → Environment Variables → Add:

```bash
WORKER_URL=https://your-worker.up.railway.app
WORKER_CALLBACK_SECRET=<same-secret-from-step-1>
```

Redeploy: Vercel → Deployments → Latest → Redeploy

### Step 6: Test

```bash
# Health check
curl https://your-worker.up.railway.app/health

# Should return: {"status":"healthy","version":"1.0.0"}
```

## Verify End-to-End

1. Go to https://your-app.vercel.app
2. Sign in
3. Buy a credit
4. Upload a PDF
5. Wait for processing (~1-2 min per 10 slides)
6. Download outputs (DOCX, Anki, JSON)

## Troubleshooting

**Worker not responding?**
- Check Railway logs: Railway → View Logs
- Verify env vars are set
- Check health endpoint

**Jobs not completing?**
- Check Railway logs for errors
- Verify `WORKER_CALLBACK_URL` is correct
- Check `WORKER_CALLBACK_SECRET` matches on both sides
- Verify AWS credentials and S3 bucket access

**Frontend not showing outputs?**
- Check Vercel logs: Vercel → Deployments → Latest → View Function Logs
- Verify `/api/jobs/callback` is receiving callbacks
- Check job status in database

## Cost Estimates

**Railway** (Hobby Plan - $5/month)
- ~550 hours of compute
- Good for 100-200 jobs/month

**OpenAI**
- GPT-4o: ~$0.01-0.05 per slide
- 10-slide lecture: ~$0.10-0.50

**AWS S3**
- Negligible for small scale (<$1/month)

**Total**: ~$5-10/month for 100-200 lectures

## Next Steps After Deployment

- [ ] Monitor Railway metrics (CPU, memory, requests)
- [ ] Set up alerts (Railway → Notifications)
- [ ] Test with production PDFs
- [ ] Share with beta users
- [ ] Collect feedback
- [ ] Iterate!

## Need Help?

- Railway Docs: https://docs.railway.app
- Worker README: `worker/README.md`
- Full Guide: `worker/DEPLOYMENT.md`
- Architecture: `INTEGRATION_SUMMARY.md`


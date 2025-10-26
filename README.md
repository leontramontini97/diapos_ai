# DiapsoAI - Lecture to Study Materials Converter

Transform your lecture slides into comprehensive study materials with AI-powered summaries, Anki flashcards, and formatted Word documents.

## 🚀 What It Does

Upload a PDF of lecture slides → Get back:
- 📄 **Word Document** with slides and detailed explanations
- 🧠 **Anki Flashcard Deck** for spaced repetition
- 📊 **JSON Summary** with structured data

All powered by GPT-4o Vision AI, supporting multiple languages.

## 🏗️ Architecture

```
Frontend (Next.js/Vercel)
    ↓
Worker (Python/Railway)
    ↓
OpenAI GPT-4o Vision API
    ↓
Outputs (S3) → User Downloads
```

**Services:**
- **Frontend**: Next.js on Vercel (UI, auth, payments)
- **Worker**: Python FastAPI on Railway (PDF processing)
- **Database**: Supabase (PostgreSQL)
- **Storage**: AWS S3 (PDFs and outputs)
- **Payments**: Stripe (credit purchases)
- **AI**: OpenAI GPT-4o

## 📁 Repository Structure

```
diapos_ai/
├── worker/              # Python worker service (Railway)
│   ├── main.py         # FastAPI app
│   ├── pipeline.py     # PDF processing
│   ├── storage.py      # S3 operations
│   ├── callback.py     # Callback to Next.js
│   └── ...
│
├── frontend/            # Next.js app (Vercel)
│   ├── app/            # Pages and API routes
│   ├── components/     # React components
│   ├── lib/            # Utilities
│   └── ...
│
├── QUICK_DEPLOY.md              # ⭐ START HERE: 5-minute deploy
├── INTEGRATION_SUMMARY.md       # Architecture details
├── IMPLEMENTATION_COMPLETE.md   # What was built
└── PROJECT_STRUCTURE.md         # File organization
```

## ⚡ Quick Start

### For Deployment

**Read this first:** [`QUICK_DEPLOY.md`](QUICK_DEPLOY.md) - 5-minute deployment guide

**Or for details:** [`worker/DEPLOYMENT.md`](worker/DEPLOYMENT.md) - Step-by-step instructions

### For Development

#### Frontend (Next.js)
```bash
cd frontend/
npm install
npm run dev
```

Visit: http://localhost:3000

#### Worker (Python)
```bash
cd worker/
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Visit: http://localhost:8000/health

## 🔑 Environment Variables

### Worker (Railway)
```bash
OPENAI_API_KEY=sk-...
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name
WORKER_CALLBACK_URL=https://your-app.vercel.app/api/jobs/callback
WORKER_CALLBACK_SECRET=<random-hex-32>
```

### Frontend (Vercel)
```bash
WORKER_URL=https://your-worker.up.railway.app
WORKER_CALLBACK_SECRET=<same-as-worker>
# Plus existing: STRIPE_*, SUPABASE_*, AWS_*
```

## 📖 Documentation

| Document | Purpose |
|----------|---------|
| [`QUICK_DEPLOY.md`](QUICK_DEPLOY.md) | ⭐ 5-minute deployment guide |
| [`worker/DEPLOYMENT.md`](worker/DEPLOYMENT.md) | Detailed deployment steps |
| [`INTEGRATION_SUMMARY.md`](INTEGRATION_SUMMARY.md) | Architecture & API contracts |
| [`IMPLEMENTATION_COMPLETE.md`](IMPLEMENTATION_COMPLETE.md) | What was built |
| [`PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) | File organization |
| [`worker/README.md`](worker/README.md) | Worker API documentation |

## 🎯 Features

- ✅ **Multi-language support** (Spanish, English, Portuguese, French, German, Italian)
- ✅ **AI-powered explanations** using GPT-4o Vision
- ✅ **Anki flashcard generation** for spaced repetition
- ✅ **Word document export** with slides and explanations
- ✅ **Stripe payments** for credit system
- ✅ **Supabase authentication** and database
- ✅ **Background processing** with Railway worker
- ✅ **S3 storage** with presigned URLs
- ✅ **Job tracking** and status updates

## 🔐 Security

- HMAC-SHA256 signature verification for callbacks
- Presigned S3 URLs with expiration
- Environment-based secrets
- Supabase Row Level Security (RLS)
- Stripe webhook verification

## 💰 Cost Estimate (200 lectures/month)

| Service | Cost |
|---------|------|
| Railway | $5/mo |
| OpenAI | $20-100/mo |
| AWS S3 | <$1/mo |
| Vercel | $0 (Hobby) |
| Supabase | $0 (Free tier) |
| **Total** | **$26-106/mo** |

## 🧪 Testing

### Worker Health Check
```bash
curl https://your-worker.up.railway.app/health
```

### Test Job Submission
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

### End-to-End Test
1. Visit your app
2. Sign up / Log in
3. Buy a credit
4. Upload a PDF
5. Wait for processing
6. Download outputs

## 🐛 Troubleshooting

### Worker not responding?
- Check Railway logs: `railway logs`
- Verify environment variables are set
- Test health endpoint

### Jobs not completing?
- Check `WORKER_CALLBACK_URL` is correct
- Verify `WORKER_CALLBACK_SECRET` matches
- Check AWS credentials and S3 access
- Review OpenAI API quota

### See full troubleshooting guide:
[`worker/DEPLOYMENT.md`](worker/DEPLOYMENT.md#troubleshooting)

## 📊 Monitoring

### Railway
- Dashboard: View CPU, memory, requests
- Logs: `railway logs --tail`

### Vercel
- Deployments → View Function Logs
- Monitor API routes

### Supabase
- Database: Query jobs table
- Logs: API logs

## 🚢 Deployment Status

- ✅ Code complete
- ✅ Documentation complete
- ✅ Ready to deploy
- ⏳ Awaiting Railway deployment
- ⏳ Awaiting production testing

## 🛠️ Tech Stack

**Frontend:**
- Next.js 15 (React)
- TypeScript
- TailwindCSS
- Supabase Auth
- Stripe Payments

**Worker:**
- Python 3.11
- FastAPI
- OpenAI SDK
- PyMuPDF (PDF processing)
- python-docx (Word docs)
- genanki (Anki decks)
- boto3 (AWS S3)

**Infrastructure:**
- Vercel (Frontend hosting)
- Railway (Worker hosting)
- Supabase (Database & Auth)
- AWS S3 (File storage)
- Stripe (Payments)
- OpenAI (AI processing)

## 📝 License

[Your license here]

## 🤝 Contributing

[Your contributing guidelines here]

## 📧 Support

For issues:
1. Check [`worker/DEPLOYMENT.md`](worker/DEPLOYMENT.md#troubleshooting)
2. Review Railway/Vercel logs
3. Open an issue on GitHub

---

**Status**: ✅ Production-ready, awaiting deployment  
**Last Updated**: October 26, 2025

**Next Step**: Follow [`QUICK_DEPLOY.md`](QUICK_DEPLOY.md) to deploy in 5 minutes! 🚀


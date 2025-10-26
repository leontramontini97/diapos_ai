# Project Structure After Worker Integration

## Repository Layout

```
diapos_ai/
├── worker/                          # 🆕 NEW: Railway Worker Service
│   ├── main.py                      # FastAPI app (POST /process, GET /health)
│   ├── pipeline.py                  # PDF processing pipeline
│   ├── storage.py                   # S3 operations
│   ├── callback.py                  # Callback to Next.js
│   ├── requirements.txt             # Python dependencies
│   ├── Dockerfile                   # Container definition
│   ├── railway.json                 # Railway configuration
│   ├── README.md                    # Worker API docs
│   ├── DEPLOYMENT.md                # Deployment guide
│   └── test_worker.sh               # Testing script
│
├── frontend/                        # Next.js Frontend (Vercel)
│   ├── app/
│   │   ├── api/
│   │   │   ├── process-lecture/
│   │   │   │   └── route.ts         # 🔧 MODIFIED: Forward to worker
│   │   │   ├── jobs/
│   │   │   │   ├── [id]/
│   │   │   │   │   └── route.ts     # Get job status
│   │   │   │   └── callback/
│   │   │   │       └── route.ts     # 🔧 MODIFIED: Handle worker callbacks
│   │   │   ├── generate-docx/
│   │   │   │   └── route.ts         # 🔧 MODIFIED: Deprecated (410 Gone)
│   │   │   ├── stripe/
│   │   │   │   └── webhook/
│   │   │   │       └── route.ts     # Stripe payments
│   │   │   └── ...
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── upload/
│   │   │   └── page.tsx
│   │   └── ...
│   ├── components/
│   │   ├── lecture-uploader.tsx     # 🔧 MODIFIED: Display download links
│   │   ├── navigation.tsx
│   │   └── ui/
│   ├── lib/
│   │   ├── db.ts                    # 🔧 MODIFIED: Job query helpers
│   │   ├── s3.ts
│   │   └── supabase/
│   ├── NEXT_STEPS.md                # 🔧 MODIFIED: Updated status
│   └── ...
│
├── slide_explainer.py               # Original Streamlit app (reference)
├── requirements.txt                 # Python deps (for local dev)
│
├── INTEGRATION_SUMMARY.md           # 🆕 NEW: Architecture overview
├── QUICK_DEPLOY.md                  # 🆕 NEW: 5-minute deploy guide
├── IMPLEMENTATION_COMPLETE.md       # 🆕 NEW: This summary
└── PROJECT_STRUCTURE.md             # 🆕 NEW: This file
```

## Component Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                          USER                                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
                  ┌──────────────────────┐
                  │   Browser / Client    │
                  └──────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VERCEL (Next.js)                              │
│  ┌────────────────┐  ┌─────────────┐  ┌────────────────┐       │
│  │ /upload        │  │ /dashboard   │  │ /auth          │       │
│  │ page.tsx       │  │ page.tsx     │  │ page.tsx       │       │
│  └────────────────┘  └─────────────┘  └────────────────┘       │
│           │                  │                  │                │
│           └──────────────────┴──────────────────┘                │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            Components (lecture-uploader.tsx)              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
│                             ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                     API Routes                            │   │
│  │  • /api/upload-url       - Get S3 presigned URL          │   │
│  │  • /api/process-lecture  - Start worker job              │   │
│  │  • /api/jobs/[id]        - Poll job status               │   │
│  │  • /api/jobs/callback    - Receive worker results        │   │
│  │  • /api/stripe/webhook   - Handle payments               │   │
│  └──────────────────────────────────────────────────────────┘   │
│                             │                                    │
└─────────────────────────────┼────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              │                               │
              ▼                               ▼
   ┌──────────────────┐          ┌──────────────────────┐
   │  SUPABASE        │          │  RAILWAY             │
   │                  │          │  (Worker)            │
   │  • Database      │          │                      │
   │  • Auth          │          │  FastAPI Service     │
   │  • Storage(?)    │          │  ┌────────────────┐  │
   └──────────────────┘          │  │ POST /process  │  │
              │                  │  │ GET /health    │  │
              │                  │  └────────────────┘  │
              │                  └──────────────────────┘
              │                             │
              │                             ▼
              │                  ┌──────────────────────┐
              │                  │  Processing Pipeline  │
              │                  │  • Download PDF (S3) │
              │                  │  • Extract slides    │
              │                  │  • Call OpenAI API   │
              │                  │  • Generate outputs  │
              │                  │  • Upload to S3      │
              │                  │  • Send callback     │
              │                  └──────────────────────┘
              │                             │
              └─────────────────────────────┘
                           ┌─────────────────────────┐
                           │                         │
                           ▼                         ▼
                  ┌──────────────┐         ┌──────────────┐
                  │  AWS S3      │         │  OpenAI API  │
                  │  • PDFs      │         │  • GPT-4o    │
                  │  • Outputs   │         │  • Vision    │
                  └──────────────┘         └──────────────┘
```

## Data Flow

### 1. Upload & Job Creation
```
User → Upload PDF → Frontend
                      ↓
                  Get presigned URL from /api/upload-url
                      ↓
                  Upload to S3
                      ↓
                  POST /api/process-lecture
                      ↓
                  Check credits (Supabase)
                      ↓
                  Create job (Supabase)
                      ↓
                  POST to Railway /process
                      ↓
                  Return 202 + jobId to user
```

### 2. Background Processing (Worker)
```
Worker receives job → Download PDF from S3
                           ↓
                    Extract slides (PyMuPDF)
                           ↓
                    For each slide:
                      • Encode to base64
                      • Call OpenAI Vision API
                      • Parse JSON response
                           ↓
                    Generate outputs:
                      • summary.json
                      • lecture.docx
                      • lecture.apkg
                           ↓
                    Upload to S3
                           ↓
                    Generate presigned URLs
                           ↓
                    POST callback to Next.js
                      /api/jobs/callback
                        {
                          jobId,
                          status: "completed",
                          outputs: { urls... }
                        }
```

### 3. Job Completion (Frontend)
```
Callback received → Verify HMAC signature
                         ↓
                    Update job in Supabase
                      (status, outputs_json)
                         ↓
                    Return 200 OK
                         ↓
    User polls /api/jobs/:id
                         ↓
    Job status = "completed"
                         ↓
    Frontend shows download links
                         ↓
    User clicks → Download from S3
```

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 15 | UI, SSR, API routes |
| **UI Components** | React, TailwindCSS | Modern UI |
| **Authentication** | Supabase Auth | User management |
| **Database** | Supabase PostgreSQL | Jobs, users, payments |
| **Payments** | Stripe | Credit purchases |
| **File Storage** | AWS S3 | PDFs, outputs |
| **Worker** | FastAPI + Python | PDF processing |
| **AI** | OpenAI GPT-4o | Slide analysis |
| **PDF Processing** | PyMuPDF | Slide extraction |
| **Document Gen** | python-docx | Word files |
| **Flashcards** | genanki | Anki packages |
| **Frontend Deploy** | Vercel | Serverless Next.js |
| **Worker Deploy** | Railway | Container hosting |

## Key Design Decisions

### Why separate worker?
- **Vercel limits**: 10s function timeout, no spawn()
- **Long-running tasks**: PDF processing takes 1-2 min
- **Resource control**: Dedicated compute for heavy tasks

### Why Railway?
- **Simplicity**: One-click deploy, auto-scaling
- **Cost**: $5/month hobby plan
- **Speed**: Fast to iterate

### Why S3 (not Supabase Storage)?
- **Proven**: Already integrated
- **Presigned URLs**: Built-in
- **Easy migration**: Can switch to Supabase later

### Why callback pattern?
- **Non-blocking**: User doesn't wait
- **Resilient**: Retry logic
- **Traceable**: Clear audit trail

## Environment Setup

### Local Development
```bash
# Frontend
cd frontend/
npm install
npm run dev

# Worker
cd worker/
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Production
```bash
# Frontend: Vercel (auto-deploy from GitHub)
# Worker: Railway (auto-deploy from GitHub)
# Just push to main branch!
```

## Deployment Checklist

- [ ] Generate `WORKER_CALLBACK_SECRET` (openssl rand -hex 32)
- [ ] Deploy worker to Railway
- [ ] Set all env vars in Railway
- [ ] Get Railway service URL
- [ ] Set `WORKER_URL` in Vercel
- [ ] Set `WORKER_CALLBACK_SECRET` in Vercel
- [ ] Redeploy frontend
- [ ] Test health endpoint
- [ ] Test end-to-end flow

## Monitoring & Logs

### Railway Logs
```bash
railway logs --tail
```
Look for: `[jobId=...] Pipeline complete`

### Vercel Logs
Go to: Vercel → Deployments → View Function Logs

Look for:
- `/api/process-lecture` - Job creation
- `/api/jobs/callback` - Worker callbacks

### Supabase Logs
Go to: Supabase → Logs → API

Look for:
- Job inserts
- Job updates

## Cost Breakdown

| Service | Plan | Cost/mo | Notes |
|---------|------|---------|-------|
| Vercel | Hobby | $0 | Serverless Next.js |
| Supabase | Free | $0 | Up to 50k rows |
| Railway | Hobby | $5 | 550 compute hours |
| OpenAI | Pay-as-go | $20-100 | $0.10-0.50/lecture |
| AWS S3 | Pay-as-go | <$1 | Storage + bandwidth |
| Stripe | Pay-as-go | 2.9% + 30¢ | Per transaction |
| **Total** | | **$25-106** | For 200 lectures/mo |

## Security Considerations

✅ **Implemented:**
- HMAC-SHA256 callback signatures
- Environment-based secrets
- Presigned S3 URLs with expiration
- Supabase RLS policies
- Stripe webhook verification

🔒 **Best Practices:**
- Rotate secrets periodically
- Monitor for suspicious jobs
- Set resource limits
- Use HTTPS only (Railway default)

## Next Steps

1. ✅ Implementation complete
2. [ ] Deploy to Railway
3. [ ] Configure environment variables
4. [ ] Test end-to-end
5. [ ] Monitor first jobs
6. [ ] Iterate based on feedback

---

**Ready to deploy!** See `QUICK_DEPLOY.md` for next steps.


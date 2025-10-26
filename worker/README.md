# Lecture Processing Worker

A stateless Python worker that processes lecture PDFs, generates summaries, Anki cards, and Word documents.

## Architecture

- **FastAPI** app with two endpoints:
  - `GET /health` - Health check for Railway/monitoring
  - `POST /process` - Accept a job, process in background, send callback
- **Stateless & Idempotent**: Downloads from S3, processes, uploads outputs, sends callback
- **Background processing**: Returns 202 immediately, processes asynchronously

## Environment Variables

Required environment variables:

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# AWS S3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name

# Callback to Next.js
WORKER_CALLBACK_URL=https://your-vercel-app.vercel.app/api/jobs/callback
WORKER_CALLBACK_SECRET=your-shared-secret

# Optional
PORT=8000
LOG_LEVEL=INFO
```

## Local Development

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Set environment variables (create `.env` file or export)

3. Run the server:
```bash
python main.py
# or
uvicorn main:app --reload
```

4. Test health endpoint:
```bash
curl http://localhost:8000/health
```

5. Test process endpoint:
```bash
curl -X POST http://localhost:8000/process \
  -H "Content-Type: application/json" \
  -d '{
    "jobId": "test-123",
    "s3Key": "uploads/test.pdf",
    "email": "user@example.com",
    "language": "Spanish"
  }'
```

## Deployment to Railway

1. Create a new Railway project
2. Connect this repository or use Railway CLI
3. Set environment variables in Railway dashboard
4. Railway will automatically:
   - Detect the Dockerfile
   - Build the container
   - Deploy and expose a public URL

5. Copy the Railway URL and set it as `WORKER_URL` in your Vercel project

## API Contract

### POST /process

**Request:**
```json
{
  "jobId": "uuid-v4",
  "s3Key": "uploads/file.pdf",
  "email": "user@example.com",
  "language": "Spanish"
}
```

**Response (202 Accepted):**
```json
{
  "jobId": "uuid-v4",
  "status": "accepted",
  "message": "Processing started"
}
```

### Callback (to Next.js)

**Success:**
```json
{
  "jobId": "uuid-v4",
  "status": "completed",
  "outputs": {
    "summary_json_url": "https://...",
    "docx_url": "https://...",
    "anki_url": "https://...",
    "total_slides": 15
  },
  "secret": "WORKER_CALLBACK_SECRET"
}
```

**Failure:**
```json
{
  "jobId": "uuid-v4",
  "status": "failed",
  "error": {
    "message": "Error message",
    "code": "PROCESSING_ERROR"
  },
  "secret": "WORKER_CALLBACK_SECRET"
}
```

## Logging

All logs include `jobId` for traceability. Use structured logging for observability.

Example log line:
```
2024-01-15 10:30:45 - pipeline - INFO - [jobId=abc-123] Processing slide 3/10
```


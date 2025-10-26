"""
FastAPI worker for processing lecture PDFs
Exposes POST /process and GET /health endpoints
"""

import os
import logging
import json
from typing import Dict, Any
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import uvicorn

from pipeline import process_lecture
from callback import send_callback

# Configure structured logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

app = FastAPI(title="Lecture Processing Worker")


class ProcessRequest(BaseModel):
    """Request payload for POST /process"""
    jobId: str
    s3Key: str
    email: str
    language: str = "Spanish"  # Default language -->  revisit 


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    version: str = "1.0.0"


async def process_job_background(job_id: str, s3_key: str, email: str, language: str):
    """
    Background task that processes a lecture and sends callback
    
    This runs asynchronously after responding 202 to the client.
    """
    logger.info(f"[jobId={job_id}] Starting background processing", extra={"jobId": job_id})
    
    try:
        # Run the pipeline (download PDF, process, upload artifacts)
        result = await process_lecture(job_id, s3_key, email, language)
        
        logger.info(f"[jobId={job_id}] Processing completed successfully", extra={"jobId": job_id})
        
        # Send success callback
        await send_callback(
            job_id=job_id,
            status="completed",
            outputs=result
        )
        
    except Exception as e:
        logger.error(f"[jobId={job_id}] Processing failed: {str(e)}", extra={"jobId": job_id}, exc_info=True)
        
        # Send failure callback
        await send_callback(
            job_id=job_id,
            status="failed",
            error={
                "message": str(e),
                "code": "PROCESSING_ERROR"
            }
        )


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint for Railway/monitoring
    Returns 200 if service is running and configured
    """
    # Verify critical env vars are present
    required_vars = [
        "OPENAI_API_KEY",
        "AWS_ACCESS_KEY_ID",
        "AWS_SECRET_ACCESS_KEY",
        "S3_BUCKET",
        "WORKER_CALLBACK_URL",
        "WORKER_CALLBACK_SECRET"
    ]
    
    missing = [var for var in required_vars if not os.getenv(var)]
    
    if missing:
        logger.warning(f"Health check: missing env vars: {missing}")
        raise HTTPException(status_code=503, detail=f"Missing env vars: {missing}")
    
    return HealthResponse(status="healthy")


@app.post("/process")
async def process_endpoint(request: ProcessRequest, background_tasks: BackgroundTasks):
    """
    Accept a lecture processing job and start background processing
    
    Returns 202 Accepted immediately, then processes asynchronously.
    Sends callback to Next.js when done.
    """
    job_id = request.jobId
    s3_key = request.s3Key
    email = request.email
    language = request.language or "Spanish"
    
    logger.info(
        f"[jobId={job_id}] Received process request",
        extra={
            "jobId": job_id,
            "s3Key": s3_key,
            "email": email,
            "language": language
        }
    )
    
    # Validate inputs
    if not job_id or not s3_key or not email:
        raise HTTPException(status_code=400, detail="Missing required fields: jobId, s3Key, email")
    
    # Queue background task
    background_tasks.add_task(process_job_background, job_id, s3_key, email, language)
    
    # Return immediately
    return {
        "jobId": job_id,
        "status": "accepted",
        "message": "Processing started"
    }


if __name__ == "__main__":
    # For local development
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)


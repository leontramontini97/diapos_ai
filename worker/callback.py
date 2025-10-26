"""
Callback to Next.js API when job processing completes or fails
"""

import os
import logging
import json
import hmac
import hashlib
from typing import Optional, Dict, Any
import httpx

logger = logging.getLogger(__name__)

CALLBACK_URL = os.getenv('WORKER_CALLBACK_URL')
CALLBACK_SECRET = os.getenv('WORKER_CALLBACK_SECRET')


def _compute_signature(payload_bytes: bytes) -> str:
    """
    Compute HMAC-SHA256 signature of payload
    
    Args:
        payload_bytes: JSON payload as bytes
    
    Returns:
        Hex-encoded signature
    """
    if not CALLBACK_SECRET:
        raise ValueError("WORKER_CALLBACK_SECRET not set")
    
    h = hmac.new(
        CALLBACK_SECRET.encode('utf-8'),
        payload_bytes,
        hashlib.sha256
    )
    return h.hexdigest()


async def send_callback(
    job_id: str,
    status: str,
    outputs: Optional[Dict[str, Any]] = None,
    error: Optional[Dict[str, Any]] = None
):
    """
    Send callback to Next.js with job results
    
    Args:
        job_id: Job ID
        status: "completed" or "failed"
        outputs: Output URLs/data (for success)
        error: Error details (for failure)
    
    Raises:
        Exception if callback fails after retries
    """
    if not CALLBACK_URL:
        logger.error("WORKER_CALLBACK_URL not configured, cannot send callback")
        raise ValueError("WORKER_CALLBACK_URL not set")
    
    if not CALLBACK_SECRET:
        logger.error("WORKER_CALLBACK_SECRET not configured, cannot send callback")
        raise ValueError("WORKER_CALLBACK_SECRET not set")
    
    # Build payload
    payload = {
        "jobId": job_id,
        "status": status
    }
    
    if outputs:
        payload["outputs"] = outputs
    
    if error:
        payload["error"] = error
    
    payload_json = json.dumps(payload)
    payload_bytes = payload_json.encode('utf-8')
    
    # Compute signature
    signature = _compute_signature(payload_bytes)
    
    headers = {
        'Content-Type': 'application/json',
        'X-Worker-Signature': signature
    }
    
    logger.info(f"[jobId={job_id}] Sending callback to {CALLBACK_URL}", extra={"jobId": job_id})
    
    # Send callback with retries
    async with httpx.AsyncClient(timeout=30.0) as client:
        for attempt in range(3):
            try:
                response = await client.post(
                    CALLBACK_URL,
                    content=payload_bytes,
                    headers=headers
                )
                
                if response.status_code == 200:
                    logger.info(f"[jobId={job_id}] Callback sent successfully", extra={"jobId": job_id})
                    return
                else:
                    logger.warning(
                        f"[jobId={job_id}] Callback returned {response.status_code}: {response.text}",
                        extra={"jobId": job_id}
                    )
            
            except Exception as e:
                logger.warning(
                    f"[jobId={job_id}] Callback attempt {attempt + 1} failed: {e}",
                    extra={"jobId": job_id}
                )
            
            # Wait before retry (exponential backoff)
            if attempt < 2:
                import asyncio
                await asyncio.sleep(2 ** attempt)
        
        # All retries failed
        logger.error(f"[jobId={job_id}] Failed to send callback after 3 attempts", extra={"jobId": job_id})
        raise Exception("Callback failed after retries")


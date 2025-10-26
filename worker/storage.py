"""
S3 storage operations: download PDFs, upload artifacts, generate presigned URLs
"""

import os
import logging
from typing import Optional
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

# Initialize S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
    aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    region_name=os.getenv('AWS_REGION', 'us-east-2')
)

BUCKET_NAME = os.getenv('S3_BUCKET')


def download_from_s3(s3_key: str) -> bytes:
    """
    Download a file from S3 and return its bytes
    
    Args:
        s3_key: S3 object key (e.g., "uploads/file.pdf")
    
    Returns:
        File bytes
    
    Raises:
        Exception if download fails
    """
    if not BUCKET_NAME:
        raise ValueError("S3_BUCKET environment variable not set")
    
    logger.info(f"Downloading s3://{BUCKET_NAME}/{s3_key}")
    
    try:
        response = s3_client.get_object(Bucket=BUCKET_NAME, Key=s3_key)
        file_bytes = response['Body'].read()
        logger.info(f"Downloaded {len(file_bytes)} bytes from S3")
        return file_bytes
    
    except ClientError as e:
        logger.error(f"Failed to download from S3: {e}")
        raise Exception(f"S3 download failed: {e}")


def upload_to_s3(file_bytes: bytes, s3_key: str, content_type: str = "application/octet-stream") -> str:
    """
    Upload bytes to S3
    
    Args:
        file_bytes: File content as bytes
        s3_key: S3 object key (e.g., "outputs/job123/summary.json")
        content_type: MIME type
    
    Returns:
        S3 key of uploaded file
    
    Raises:
        Exception if upload fails
    """
    if not BUCKET_NAME:
        raise ValueError("S3_BUCKET environment variable not set")
    
    logger.info(f"Uploading {len(file_bytes)} bytes to s3://{BUCKET_NAME}/{s3_key}")
    
    try:
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=s3_key,
            Body=file_bytes,
            ContentType=content_type
        )
        logger.info(f"Uploaded to S3: {s3_key}")
        return s3_key
    
    except ClientError as e:
        logger.error(f"Failed to upload to S3: {e}")
        raise Exception(f"S3 upload failed: {e}")


def generate_presigned_url(s3_key: str, expiration: int = 3600) -> str:
    """
    Generate a presigned URL for downloading an S3 object
    
    Args:
        s3_key: S3 object key
        expiration: URL expiration time in seconds (default 1 hour)
    
    Returns:
        Presigned URL
    
    Raises:
        Exception if generation fails
    """
    if not BUCKET_NAME:
        raise ValueError("S3_BUCKET environment variable not set")
    
    try:
        url = s3_client.generate_presigned_url(
            'get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': s3_key},
            ExpiresIn=expiration
        )
        logger.info(f"Generated presigned URL for {s3_key} (expires in {expiration}s)")
        return url
    
    except ClientError as e:
        logger.error(f"Failed to generate presigned URL: {e}")
        raise Exception(f"Presigned URL generation failed: {e}")


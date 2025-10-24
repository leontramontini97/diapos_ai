import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'

const s3 = new S3Client({
  region: process.env.S3_REGION,
  credentials: process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY ? {
    accessKeyId: process.env.S3_ACCESS_KEY_ID,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  } : undefined,
})

export async function createPresignedUploadUrl(opts: { email: string; filename: string; contentType: string }) {
  const { email, filename, contentType } = opts
  const key = `uploads/${new Date().toISOString().slice(0,10)}/${email}/${uuidv4()}-${filename}`
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET,
    Key: key,
    ContentType: contentType,
  })
  const url = await getSignedUrl(s3, command, { expiresIn: 60 * 5 })
  return { key, url }
}


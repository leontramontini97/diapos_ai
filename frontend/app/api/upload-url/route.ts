import { NextRequest, NextResponse } from 'next/server'
import { createPresignedUploadUrl } from '@/lib/s3'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = (body?.email || '').toString().trim().toLowerCase()
    const filename = (body?.filename || '').toString().trim()
    const contentType = (body?.contentType || '').toString().trim()

    if (!email || !filename || !contentType) {
      return NextResponse.json({ error: 'Missing email, filename or contentType' }, { status: 400 })
    }
    if (!process.env.S3_BUCKET || !process.env.S3_REGION) {
      return NextResponse.json({ error: 'S3 not configured' }, { status: 500 })
    }

    const { key, url } = await createPresignedUploadUrl({ email, filename, contentType })
    return NextResponse.json({ key, url })
  } catch (err) {
    console.error('upload-url error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


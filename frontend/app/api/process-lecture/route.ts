import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { withTransaction } from '@/lib/db'

async function startWorker(jobId: string, s3Key: string, email: string) {
  const workerUrl = process.env.WORKER_URL
  if (!workerUrl) throw new Error('Worker not configured')
  const res = await fetch(`${workerUrl}/process`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jobId, s3Key, email }),
  })
  if (!res.ok) throw new Error('Failed to start worker')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const email = (body?.email || '').toString().trim().toLowerCase()
    const s3Key = (body?.s3Key || '').toString().trim()

    if (!email || !s3Key) {
      return NextResponse.json({ error: 'Missing email or s3Key' }, { status: 400 })
    }

    const jobId = uuidv4()

    await withTransaction(async (client: any) => {
      const userRes = await client.query('SELECT credits_remaining FROM users WHERE email = $1 FOR UPDATE', [email])
      const credits = userRes.rows?.[0]?.credits_remaining ?? 0
      if (credits <= 0) {
        throw new Error('INSUFFICIENT_CREDITS')
      }
      await client.query('UPDATE users SET credits_remaining = credits_remaining - 1 WHERE email = $1', [email])
      await client.query('INSERT INTO jobs (id, email, file_key, status) VALUES ($1, $2, $3, $4)', [jobId, email, s3Key, 'pending'])
    })

    await startWorker(jobId, s3Key, email)
    return NextResponse.json({ jobId })
  } catch (error: any) {
    if (error?.message === 'INSUFFICIENT_CREDITS') {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 402 })
    }
    console.error('process-lecture error', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
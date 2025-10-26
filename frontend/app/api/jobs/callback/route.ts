import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { query } from '@/lib/db'

function verifySignature(raw: Buffer, sig: string, secret: string) {
  const h = crypto.createHmac('sha256', secret).update(raw).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(h), Buffer.from(sig))
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.WORKER_CALLBACK_SECRET || ''
    const sig = req.headers.get('x-worker-signature') || ''
    const raw = Buffer.from(await req.arrayBuffer())
    if (!secret || !sig || !verifySignature(raw, sig, secret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const body = JSON.parse(raw.toString())
    const { jobId, status, outputs, error } = body
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

    // Handle both completed and failed statuses
    if (status === 'completed') {
      await query('UPDATE jobs SET status = $2, outputs_json = $3, completed_at = NOW() WHERE id = $1', [jobId, 'completed', outputs || {}])
    } else if (status === 'failed') {
      await query('UPDATE jobs SET status = $2, error_message = $3, completed_at = NOW() WHERE id = $1', [jobId, 'failed', error?.message || 'Unknown error'])
    } else {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('callback error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


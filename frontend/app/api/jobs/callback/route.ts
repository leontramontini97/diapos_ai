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
    const { jobId, outputs } = body
    if (!jobId) return NextResponse.json({ error: 'jobId required' }, { status: 400 })

    await query('UPDATE jobs SET status = $2, outputs_json = $3, completed_at = NOW() WHERE id = $1', [jobId, 'completed', outputs || {}])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('callback error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


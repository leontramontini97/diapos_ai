import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function POST() {
  try {
    console.log('DATABASE_URL:', process.env.DATABASE_URL)
    const now = new Date().toISOString()
    await query('INSERT INTO events (type, data) VALUES ($1, $2)', [
      'debug.ping',
      { message: 'debug ping', now },
    ])
    return NextResponse.json({ ok: true, now })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'db error' }, { status: 500 })
  }
}


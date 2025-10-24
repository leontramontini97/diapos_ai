import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    const result = await query('SELECT * FROM events ORDER BY created_at DESC LIMIT 20')
    return NextResponse.json({ events: result.rows })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'db error' }, { status: 500 })
  }
}
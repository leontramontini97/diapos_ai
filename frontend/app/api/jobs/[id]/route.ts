import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(_req: Request, { params }: any) {
  try {
    const id = params.id
    const { rows } = await query('SELECT id, email, file_key, status, outputs_json, created_at, completed_at FROM jobs WHERE id = $1', [id])
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(rows[0])
  } catch (err) {
    console.error('jobs get error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


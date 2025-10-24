import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')
  if (!email) {
    return NextResponse.json({ error: 'Email parameter required' }, { status: 400 })
  }

  try {
    const result = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()])
    const payments = await query('SELECT * FROM payments WHERE email = $1 ORDER BY created_at DESC', [email.toLowerCase()])
    
    return NextResponse.json({
      user: result.rows[0] || null,
      payments: payments.rows,
      totalCredits: result.rows[0]?.credits_remaining || 0
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'db error' }, { status: 500 })
  }
}
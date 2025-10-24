import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    // Check if user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Get user credits and payment history using email
    const userResult = await query('SELECT * FROM users WHERE email = $1', [user.email])
    const paymentsResult = await query('SELECT * FROM payments WHERE email = $1 ORDER BY created_at DESC', [user.email])
    
    return NextResponse.json({
      user: userResult.rows[0] || { id: user.id, email: user.email, credits_remaining: 0 },
      payments: paymentsResult.rows,
      totalCredits: userResult.rows[0]?.credits_remaining || 0
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'db error' }, { status: 500 })
  }
}
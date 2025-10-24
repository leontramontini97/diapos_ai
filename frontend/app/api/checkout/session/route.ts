import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/lib/supabase/server'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-09-30.acacia' as any })

export async function POST(req: NextRequest) {
  try {
    // Check if user is authenticated
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const body = await req.json()
    const quantity = Number(body?.quantity || 1)
    const price = process.env.STRIPE_PRICE_ID_SINGLE
    if (!price) return NextResponse.json({ error: 'Stripe price not configured' }, { status: 500 })

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price, quantity }],
      customer_email: user.email,
      metadata: { 
        email: user.email,
        user_id: user.id 
      },
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/upload?success=1`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/upload?canceled=1`,
    })
    console.log('Created checkout session:', session.id, 'for user:', user.id)
    return NextResponse.json({ id: session.id, url: session.url })
  } catch (err) {
    console.error('checkout error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}


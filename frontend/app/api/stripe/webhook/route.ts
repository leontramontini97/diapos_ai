import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { query, withTransaction } from '@/lib/db'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-09-30.acacia' as any })

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  console.log('STRIPE_WEBHOOK_SECRET:', webhookSecret)
  console.log('stripe-signature:', sig)
  if (!sig || !webhookSecret) return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })

  const buf = Buffer.from(await req.arrayBuffer())
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(buf, sig, webhookSecret)
  } catch (err: any) {
    console.error('Webhook signature verification failed', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    if (event.type === 'checkout.session.completed' || event.type === 'payment_intent.succeeded') {
      let email = ''
      let userId = ''
      let paymentIntentId = ''
      let sessionId = ''
      const quantity = 1

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session
        email = (
          session.customer_email ||
          (session.customer_details as any)?.email ||
          (session.metadata as any)?.email ||
          ''
        ).toLowerCase()
        userId = (session.metadata as any)?.user_id
        paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id
        sessionId = session.id
      } else if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        paymentIntentId = paymentIntent.id
        
        // For payment_intent.succeeded, we need to get the checkout session to find user_id
        if (paymentIntent.latest_charge) {
          const chargeId = typeof paymentIntent.latest_charge === 'string' ? paymentIntent.latest_charge : paymentIntent.latest_charge.id
          const charge = await stripe.charges.retrieve(chargeId)
          if (charge.billing_details?.email) {
            email = charge.billing_details.email.toLowerCase()
          }
        }
        
        // Try to find the session with this payment intent to get user_id
        const sessions = await stripe.checkout.sessions.list({
          payment_intent: paymentIntentId,
          limit: 1
        })
        
        if (sessions.data.length > 0) {
          const session = sessions.data[0]
          userId = (session.metadata as any)?.user_id || ''
          if (!email) {
            email = (
              session.customer_email ||
              (session.customer_details as any)?.email ||
              (session.metadata as any)?.email ||
              ''
            ).toLowerCase()
          }
          sessionId = session.id
        }
      }
      
      try {
        await query('INSERT INTO events (type, data) VALUES ($1, $2)', [
          'stripe.webhook.received',
          {
            eventType: event.type,
            sessionId,
            email,
            userId,
            paymentIntentId,
          },
        ])
      } catch (e) {}
      
      if (!email || !paymentIntentId || !userId) {
        console.log('Missing required fields:', { email, paymentIntentId, userId })
        return NextResponse.json({ received: true })
      }

      await withTransaction(async (client: any) => {
        // Store payment with user_id
        await client.query(
          'INSERT INTO payments (email, credits_purchased, stripe_payment_intent_id, user_id) VALUES ($1, $2, $3, $4) ON CONFLICT (stripe_payment_intent_id) DO NOTHING',
          [email, quantity, paymentIntentId, userId]
        )
        // Update user credits using user_id (more secure than email)
        await client.query(
          'INSERT INTO users (id, email, credits_remaining) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET credits_remaining = users.credits_remaining + EXCLUDED.credits_remaining',
          [userId, email, quantity]
        )
      })
      
      try {
        await query('INSERT INTO events (type, data) VALUES ($1, $2)', [
          'stripe.webhook.credited',
          { sessionId, email, userId, paymentIntentId, quantity },
        ])
      } catch (e) {}
      
      console.log('Successfully processed payment:', { email, userId, paymentIntentId, quantity })
    }
  } catch (err) {
    console.error('webhook handler error', err)
  }

  return NextResponse.json({ received: true })
}


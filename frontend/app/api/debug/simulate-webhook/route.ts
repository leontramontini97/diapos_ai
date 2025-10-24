import { NextResponse } from 'next/server'
import { query, withTransaction } from '@/lib/db'

export async function POST() {
  try {
    // Simulate a successful payment
    const email = 'test-webhook@example.com'
    const paymentIntentId = 'pi_test_simulated_' + Date.now()
    const quantity = 1

    // Log the webhook event
    await query('INSERT INTO events (type, data) VALUES ($1, $2)', [
      'stripe.webhook.simulated',
      {
        email,
        paymentIntentId,
        quantity,
      },
    ])

    // Add payment and credits
    await withTransaction(async (client: any) => {
      await client.query(
        'INSERT INTO payments (email, credits_purchased, stripe_payment_intent_id) VALUES ($1, $2, $3)',
        [email, quantity, paymentIntentId]
      )
      await client.query(
        'INSERT INTO users (email, credits_remaining) VALUES ($1, $2) ON CONFLICT (email) DO UPDATE SET credits_remaining = users.credits_remaining + EXCLUDED.credits_remaining',
        [email, quantity]
      )
    })

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook simulated successfully',
      email,
      paymentIntentId,
      quantity
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'simulation error' }, { status: 500 })
  }
}
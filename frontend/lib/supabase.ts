import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_PROJECT_URL!
const supabaseAnonKey = process.env.SUPABASE_API_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!

// Client for user operations (with RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for bypassing RLS (events, payments, etc.)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Database types (we'll expand these as needed)
export interface User {
  id: string
  email: string
  credits_remaining: number
  created_at: string
}

export interface Payment {
  id: string
  email: string
  credits_purchased: number
  stripe_payment_intent_id: string
  created_at: string
}

export interface Event {
  id: string
  type: string
  data: any
  created_at: string
}
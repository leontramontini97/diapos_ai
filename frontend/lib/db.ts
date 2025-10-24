import { supabase, supabaseAdmin } from './supabase'

// Helper function to convert Supabase results to pg-like format
function toPgResult<T>(data: T[] | null): { rows: T[] } {
  return { rows: data || [] }
}

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  // Convert PostgreSQL query to Supabase
  // For now, we'll handle the most common queries your app uses
  
  if (text.includes('INSERT INTO events')) {
    const [type, data] = params || []
    const { data: result, error } = await supabaseAdmin
      .from('events')
      .insert({ type, data })
      .select()
    
    if (error) throw error
    return toPgResult(result)
  }
  
  if (text.includes('SELECT * FROM users WHERE id')) {
    const userId = params?.[0]
    const { data: result, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
    
    if (error) throw error
    return toPgResult(result)
  }
  
  if (text.includes('SELECT * FROM users WHERE email')) {
    const email = params?.[0]
    const { data: result, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
    
    if (error) throw error
    return toPgResult(result)
  }
  
  if (text.includes('SELECT * FROM payments WHERE user_id')) {
    const userId = params?.[0]
    const { data: result, error } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return toPgResult(result)
  }
  
  if (text.includes('SELECT * FROM payments WHERE email')) {
    const email = params?.[0]
    const { data: result, error } = await supabase
      .from('payments')
      .select('*')
      .eq('email', email)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    return toPgResult(result)
  }
  
  if (text.includes('SELECT * FROM events ORDER BY created_at DESC')) {
    const { data: result, error } = await supabaseAdmin
      .from('events')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20)
    
    if (error) throw error
    return toPgResult(result)
  }
  
  // Fallback: log unsupported queries for migration
  console.warn('Unsupported query:', text, params)
  throw new Error(`Query not yet migrated to Supabase: ${text}`)
}

export async function withTransaction<T>(fn: (client: any) => Promise<T>): Promise<T> {
  // Supabase handles transactions automatically for single operations
  // For complex transactions, we'll implement a simple client object
  const client = {
    async query(text: string, params?: any[]) {
      if (text.includes('INSERT INTO payments')) {
        const [email, credits, paymentIntentId, userId] = params || []
        const { data, error } = await supabaseAdmin
          .from('payments')
          .insert({ 
            email, 
            credits_purchased: credits, 
            stripe_payment_intent_id: paymentIntentId,
            user_id: userId 
          })
          .select()
        
        if (error) throw error
        return toPgResult(data)
      }
      
      if (text.includes('INSERT INTO users') && text.includes('ON CONFLICT')) {
        const [userId, email, credits] = params || []
        const { data, error } = await supabaseAdmin
          .from('users')
          .upsert({ 
            id: userId,
            email, 
            credits_remaining: credits 
          }, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          })
          .select()
        
        if (error) throw error
        return toPgResult(data)
      }
      
      // Fallback to regular query
      return query(text, params)
    }
  }
  
  return fn(client)
}


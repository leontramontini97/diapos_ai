'use client'

import { useState, useEffect } from 'react'
import Link from "next/link"
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Brain, CreditCard, Download, LogOut, User } from "lucide-react"

interface UserData {
  user: {
    id: string
    email: string
    credits_remaining: number
  } | null
  payments: Array<{
    id: string
    credits_purchased: number
    stripe_payment_intent_id: string
    created_at: string
  }>
  totalCredits: number
}

export default function DashboardPage() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  
  const supabase = createClient()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/auth'
        return
      }
      setUser(user)
      
      // Fetch user credits and payment history
      try {
        const response = await fetch('/api/user/credits')
        if (response.ok) {
          const data = await response.json()
          setUserData(data)
        }
      } catch (error) {
        console.error('Error fetching user data:', error)
      }
      setLoading(false)
    }
    
    checkUser()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const createCheckout = async () => {
    const response = await fetch('/api/checkout/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 1 })
    });
    
    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert('Error: ' + JSON.stringify(data));
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <Link href="/" className="font-bold text-xl">StudyAI</Link>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/upload" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Convert PDF
            </Link>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </nav>
        </div>
      </header>

      {/* Dashboard Content */}
      <section className="container mx-auto px-4 pt-10 pb-16">
        <div className="max-w-4xl mx-auto">
          {/* Welcome */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 text-orange-600 dark:text-orange-400 text-sm font-medium mb-4">
              <User className="w-4 h-4" />
              Your Dashboard
            </div>
            <h1 className="text-4xl font-bold mb-2">Welcome back!</h1>
            <p className="text-muted-foreground text-lg">{user?.email}</p>
          </div>

          {/* Credits Overview */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <Card className="border-2 hover:border-orange-500/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-orange-500" />
                  Available Credits
                </CardTitle>
                <CardDescription>
                  Credits you can use for PDF conversions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-orange-500">
                  {userData?.totalCredits || 0}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Each credit converts one PDF lecture
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-teal-500/50 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5 text-teal-500" />
                  Quick Actions
                </CardTitle>
                <CardDescription>
                  Get started with your study materials
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link href="/upload">
                  <Button className="w-full bg-teal-500 hover:bg-teal-600">
                    Convert PDF Lecture
                  </Button>
                </Link>
                <Button onClick={createCheckout} variant="outline" className="w-full">
                  Buy More Credits
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Payment History */}
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>
                Your credit purchases and transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              {userData?.payments && userData.payments.length > 0 ? (
                <div className="space-y-3">
                  {userData.payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{payment.credits_purchased} Credits</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {payment.stripe_payment_intent_id.slice(0, 20)}...
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No payments yet</p>
                  <p className="text-sm">Purchase credits to start converting PDFs</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
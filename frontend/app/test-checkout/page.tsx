'use client'

export default function TestCheckout() {
  const createCheckout = async () => {
    const response = await fetch('/api/checkout/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        quantity: 1 
      })
    });
    
    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert('Error: ' + JSON.stringify(data));
    }
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Test Stripe Checkout</h1>
      <button onClick={createCheckout} style={{ padding: '10px 20px', fontSize: '16px' }}>
        Buy 1 Credit
      </button>
    </div>
  )
}
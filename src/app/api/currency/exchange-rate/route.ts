import { NextResponse } from 'next/server';

// KWD to USD exchange rate
// In production, you would fetch this from a real API like:
// - exchangerate-api.com
// - fixer.io
// - currencylayer.com
// For now, using a reasonable default that can be updated
const DEFAULT_RATE = 3.25; // 1 KWD = 3.25 USD (approximate as of 2024)

// Ensure this route runs on the edge or nodejs runtime
export const runtime = 'nodejs';

export async function GET() {
  try {
    // In production, fetch from a real exchange rate API
    // Example:
    // const response = await fetch('https://api.exchangerate-api.com/v4/latest/KWD');
    // const data = await response.json();
    // const rate = data.rates.USD;
    
    // For now, return a default rate
    // You can update this manually or integrate with a real API
    const rate = process.env.KWD_TO_USD_RATE 
      ? parseFloat(process.env.KWD_TO_USD_RATE) 
      : DEFAULT_RATE;

    return NextResponse.json({ 
      rate,
      lastUpdated: new Date().toISOString(),
      source: 'default' // Change to 'api' when using real API
    });
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    return NextResponse.json(
      { rate: DEFAULT_RATE, error: 'Failed to fetch exchange rate' },
      { status: 500 }
    );
  }
}


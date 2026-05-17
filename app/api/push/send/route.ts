import { NextResponse } from 'next/server';

export async function POST() {
  // Push notification sending requires VAPID keys
  // Configure NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY env vars
  return NextResponse.json({
    error: 'Push notifications require VAPID key configuration',
    setup: 'Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables',
  }, { status: 501 });
}

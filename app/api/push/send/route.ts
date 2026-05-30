import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import webpush from 'web-push';

export async function POST(request: Request) {
  try {
    const { userId, title, body } = await request.json();

    if (!userId || !title || !body) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = await createClient();

    // Fetch recipient's push subscription
    const { data: subData, error: subError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (subError || !subData) {
      return NextResponse.json({ success: true, message: 'No active push subscription found' });
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured in env variables');
      return NextResponse.json({ error: 'Server VAPID keys not configured' }, { status: 500 });
    }

    webpush.setVapidDetails(
      'mailto:support@twoofus.app',
      vapidPublicKey,
      vapidPrivateKey
    );

    try {
      const payload = JSON.stringify({ title, body });
      await webpush.sendNotification(subData.subscription, payload);
      return NextResponse.json({ success: true });
    } catch (pushErr: unknown) {
      console.error('Failed to send push notification:', pushErr);
      
      // Clean up dead/expired subscriptions
      if (pushErr instanceof webpush.WebPushError && (pushErr.statusCode === 410 || pushErr.statusCode === 404)) {
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('user_id', userId);
      }
      return NextResponse.json({ error: 'Push notification delivery failed', details: pushErr instanceof Error ? pushErr.message : String(pushErr) }, { status: 502 });
    }
  } catch (err: unknown) {
    console.error('Push send API error:', err);
    return NextResponse.json({ error: 'Failed to trigger notification', details: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}

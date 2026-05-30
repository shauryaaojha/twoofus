'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/authStore';
import { clearAllKeys, hasSessionKeys } from '@/lib/crypto/keyManager';
import TopBar from '@/components/shared/TopBar';
import BottomNav from '@/components/shared/BottomNav';
import LoadingScreen from '@/components/shared/LoadingScreen';
import IncomingCallModal from '@/components/call/IncomingCallModal';
import Toast from '@/components/shared/Toast';
import RoutePreloader from '@/components/shared/RoutePreloader';
import { useCall } from '@/hooks/useCall';
import { useThemeInit } from '@/hooks/useTheme';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setCouple, setPartner, setLoading, isLoading, reset } = useAuthStore();
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isChatPage = pathname === '/chat';
  const { incomingCall, answerCall, declineCall } = useCall();
  const partner = useAuthStore((s) => s.partner);

  useThemeInit(); // Initialize and sync themes

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const supabase = getSupabase();
      const resetStaleSession = async () => {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
        clearAllKeys();
        reset();
        setLoading(false);
        setInitialized(true);
        setTimeout(() => router.replace('/login?reason=session-reset'), 0);
      };

      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) {
        clearAllKeys();
        reset();
        setLoading(false);
        setInitialized(true);
        setTimeout(() => router.push('/login'), 0);
        return;
      }

      setUser({ id: authUser.id, email: authUser.email || '' });

      // Check if keys exist in session cache (set during login)
      if (!hasSessionKeys()) {
        // No keys in session — user needs to unlock keys via PIN/Password
        setTimeout(() => router.push('/unlock'), 0);
        return;
      }

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', authUser.id).maybeSingle();
      if (!profile) {
        await resetStaleSession();
        return;
      }
      setProfile(profile);

      // Fetch couple (can be active or pending)
      const { data: couple } = await supabase
        .from('couples')
        .select('*')
        .or(`user_a.eq.${authUser.id},user_b.eq.${authUser.id}`)
        .eq('status', 'active')
        .single();

      if (couple) {
        setCouple(couple);
        // Fetch partner if user_b exists
        const partnerId = couple.user_a === authUser.id ? couple.user_b : couple.user_a;
        if (partnerId) {
          const { data: partnerProfile } = await supabase
            .from('profiles').select('*').eq('id', partnerId).single();
          if (partnerProfile) setPartner(partnerProfile);
        } else {
          setPartner(null);
        }
      } else {
        setCouple(null);
        setPartner(null);
      }

      setLoading(false);
      setInitialized(true);
    };
    init();
  }, [router, setUser, setProfile, setCouple, setPartner, setLoading, reset]);

  if (isLoading || !initialized) return <LoadingScreen />;

  return (
    <>
      {!isChatPage && <TopBar />}
      <RoutePreloader />
      <main className={`pt-16 pb-[100px] md:pb-0 min-h-screen ${isChatPage ? '!pt-0 !pb-0' : ''}`}>{children}</main>
      {!isChatPage && <BottomNav />}
      <Toast />
      {incomingCall && partner && (
        <IncomingCallModal
          callerName={partner.display_name || 'Partner'}
          callerAvatar={partner.avatar_url}
          isVideo={incomingCall.payload?.callType === 'video'}
          onAccept={() => {
            const isVideoCall = incomingCall.payload?.callType === 'video';
            console.log('Answering incoming call. Video:', isVideoCall);
            answerCall(incomingCall, !!isVideoCall);
            router.push('/call');
          }}
          onDecline={declineCall}
        />
      )}
    </>
  );
}

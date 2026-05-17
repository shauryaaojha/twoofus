'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/authStore';
import { hasSessionKeys } from '@/lib/crypto/keyManager';
import TopBar from '@/components/shared/TopBar';
import BottomNav from '@/components/shared/BottomNav';
import LoadingScreen from '@/components/shared/LoadingScreen';
import IncomingCallModal from '@/components/call/IncomingCallModal';
import Toast from '@/components/shared/Toast';
import { useCall } from '@/hooks/useCall';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile, setCouple, setPartner, setLoading, isLoading } = useAuthStore();
  const [initialized, setInitialized] = useState(false);
  const router = useRouter();
  const { incomingCall, answerCall, setIncomingCall } = useCall();
  const partner = useAuthStore((s) => s.partner);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const supabase = getSupabase();
      const { data: { user: authUser } } = await supabase.auth.getUser();

      if (!authUser) { router.push('/login'); return; }

      setUser({ id: authUser.id, email: authUser.email || '' });

      // Check if keys exist in session cache (set during login)
      if (!hasSessionKeys()) {
        // No keys in session — user needs to unlock keys via PIN/Password
        router.push('/unlock');
        return;
      }

      // Fetch profile
      const { data: profile } = await supabase
        .from('profiles').select('*').eq('id', authUser.id).single();
      if (profile) setProfile(profile);

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
  }, [router, setUser, setProfile, setCouple, setPartner, setLoading]);

  if (isLoading || !initialized) return <LoadingScreen />;

  return (
    <>
      <TopBar />
      <main className="pt-16 pb-[100px] md:pb-0 min-h-screen">{children}</main>
      <BottomNav />
      <Toast />
      {incomingCall && partner && (
        <IncomingCallModal
          callerName={partner.display_name || 'Partner'}
          callerAvatar={partner.avatar_url}
          onAccept={() => answerCall(incomingCall)}
          onDecline={() => setIncomingCall(null)}
        />
      )}
    </>
  );
}

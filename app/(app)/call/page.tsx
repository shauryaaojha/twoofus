'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCall } from '@/hooks/useCall';
import { useAuthStore } from '@/lib/store/authStore';
import CallScreenComponent from '@/components/call/CallScreen';

export default function CallPage() {
  const { partner } = useAuthStore();
  const { isInCall, localStream, remoteStream, callDuration, callError, startCall, endCall, getActiveManager } = useCall();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const router = useRouter();

  const toggleMute = () => {
    const manager = getActiveManager();
    if (manager) {
      const muted = manager.toggleMute();
      setIsMuted(muted);
    }
  };

  const toggleVideo = () => {
    const manager = getActiveManager();
    if (manager) {
      const videoOff = manager.toggleVideo();
      setIsVideoOff(videoOff);
    }
  };

  const flipCamera = async () => {
    const manager = getActiveManager();
    if (manager) {
      await manager.switchCamera();
    }
  };

  const handleEndCall = async () => {
    await endCall();
    router.push('/chat');
  };

  // If call ends externally (partner hangs up), redirect back to chat
  useEffect(() => {
    if (!isInCall && callDuration === 0 && !callError) return; // Initial state, skip
    if (!isInCall) {
      // Call ended — wait a moment so user sees the state, then redirect
      const timer = setTimeout(() => {
        router.push('/chat');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isInCall, callDuration, callError, router]);

  if (isInCall) {
    return (
      <CallScreenComponent
        partnerName={partner?.display_name || 'Partner'}
        localStream={localStream}
        remoteStream={remoteStream}
        duration={callDuration}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onFlipCamera={flipCamera}
        onEndCall={handleEndCall}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
      />
    );
  }

  return (
    <div className="px-5 md:px-[120px] max-w-[1100px] mx-auto flex flex-col items-center justify-center" style={{ minHeight: 'calc(100vh - 160px)' }}>
      <div className="text-center">
        {partner && (
          <div className="mb-8">
            {partner.avatar_url ? (
              <img src={partner.avatar_url} alt={partner.display_name} className="w-24 h-24 rounded-full object-cover mx-auto border-2 border-surface-variant" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center mx-auto border-2 border-surface-variant">
                <span className="text-3xl text-on-primary-container font-bold">{partner.display_name?.[0]}</span>
              </div>
            )}
          </div>
        )}

        <h2 className="text-3xl md:text-4xl font-semibold text-on-surface mb-3" style={{ fontFamily: 'var(--font-headline)' }}>
          Call {partner?.display_name || 'Partner'}
        </h2>
        <p className="text-on-surface-variant mb-8">Start a voice or video call</p>

        {/* Error display */}
        {callError && (
          <div className="mb-8 px-6 py-4 rounded-xl bg-error-container/20 border border-error/20 text-error text-sm max-w-xs mx-auto">
            <span className="material-symbols-outlined text-[18px] align-middle mr-2">error</span>
            {callError}
          </div>
        )}

        <div className="flex items-center justify-center gap-8">
          <button onClick={() => startCall(false)} aria-label="Start voice call"
            className="w-20 h-20 rounded-full bg-tertiary-container hover:bg-tertiary-container/80 text-on-tertiary-container flex items-center justify-center shadow-[0_0_20px_rgba(4,166,92,0.3)] transition-all duration-300 hover:scale-105">
            <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>call</span>
          </button>
          <button onClick={() => startCall(true)} aria-label="Start video call"
            className="w-20 h-20 rounded-full bg-primary-container hover:bg-primary-container/80 text-on-primary-container flex items-center justify-center shadow-[0_0_20px_rgba(255,80,111,0.3)] transition-all duration-300 hover:scale-105">
            <span className="material-symbols-outlined text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>videocam</span>
          </button>
        </div>

        <p className="text-[11px] text-outline mt-8" style={{ fontFamily: 'var(--font-mono)' }}>
          Powered by Agora
        </p>
      </div>
    </div>
  );
}

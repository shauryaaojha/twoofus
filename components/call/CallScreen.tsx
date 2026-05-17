'use client';

import { useEffect, useRef } from 'react';

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface CallScreenProps {
  partnerName: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  duration: number;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onFlipCamera: () => void;
  onEndCall: () => void;
  isMuted: boolean;
  isVideoOff: boolean;
}

export default function CallScreen({
  partnerName, localStream, remoteStream, duration,
  onToggleMute, onToggleVideo, onFlipCamera, onEndCall,
  isMuted, isVideoOff,
}: CallScreenProps) {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  return (
    <div className="fixed inset-0 z-50 bg-background flex items-center justify-center">
      {/* Remote video bg */}
      <div className="absolute inset-0 z-0">
        {remoteStream ? (
          <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-surface-container flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-primary-container flex items-center justify-center">
              <span className="text-4xl">{partnerName[0]}</span>
            </div>
          </div>
        )}
      </div>

      {/* Gradient overlays */}
      <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-background/80 via-background/30 to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-background/90 via-background/50 to-transparent z-10 pointer-events-none" />

      {/* UI Overlay */}
      <div className="absolute inset-0 z-20 flex flex-col justify-between p-5 md:px-[120px] md:py-10 pointer-events-none max-w-[1100px] mx-auto w-full">
        {/* Top: header + PiP */}
        <div className="flex justify-between items-start w-full pointer-events-auto">
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3 bg-surface/50 backdrop-blur-[24px] px-5 py-2 rounded-full border border-outline-variant/30 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
            <span className="w-2 h-2 rounded-full bg-error animate-pulse shadow-[0_0_8px_rgba(255,180,171,0.8)]" />
            <span className="text-base text-on-surface tracking-wide" style={{ fontFamily: 'var(--font-body)' }}>{partnerName}</span>
            <span className="text-outline-variant/60">|</span>
            <span className="text-[11px] leading-[14px] text-on-surface-variant" style={{ fontFamily: 'var(--font-mono)' }}>
              {formatDuration(duration)}
            </span>
          </div>

          {/* Self PiP */}
          <div className="ml-auto w-[100px] h-[140px] md:w-[140px] md:h-[200px] rounded-[16px] overflow-hidden border-[1.5px] border-outline/40 shadow-[0_8px_32px_rgba(0,0,0,0.6)] bg-surface relative">
            {localStream ? (
              <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: 'scaleX(-1)' }} />
            ) : (
              <div className="w-full h-full bg-surface-container flex items-center justify-center">
                <span className="material-symbols-outlined text-on-surface-variant">person</span>
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none rounded-[16px]" />
          </div>
        </div>

        {/* Bottom: controls */}
        <div className="w-full flex justify-center pb-8 pointer-events-auto">
          <div className="flex items-center gap-4 md:gap-6 bg-surface-container/60 backdrop-blur-[24px] px-6 md:px-8 py-4 md:py-5 rounded-full border border-outline-variant/20 shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
            <button
              onClick={onToggleMute}
              className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex justify-center items-center transition-all duration-300 border border-outline-variant/30 hover:border-outline/50 ${
                isMuted ? 'bg-error/30 text-error' : 'bg-surface-variant/40 text-on-surface hover:bg-surface-variant/80'
              }`}
            >
              <span className="material-symbols-outlined text-[24px] md:text-[28px]">{isMuted ? 'mic_off' : 'mic'}</span>
            </button>
            <button
              onClick={onToggleVideo}
              className={`w-12 h-12 md:w-14 md:h-14 rounded-full flex justify-center items-center transition-all duration-300 border border-outline-variant/30 hover:border-outline/50 ${
                isVideoOff ? 'bg-error/30 text-error' : 'bg-surface-variant/40 text-on-surface hover:bg-surface-variant/80'
              }`}
            >
              <span className="material-symbols-outlined text-[24px] md:text-[28px]">{isVideoOff ? 'videocam_off' : 'videocam'}</span>
            </button>
            <button
              onClick={onFlipCamera}
              className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-surface-variant/40 flex justify-center items-center text-on-surface-variant hover:bg-surface-variant/80 transition-all duration-300 border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[24px] md:text-[28px]">cameraswitch</span>
            </button>
            <div className="w-px h-8 bg-outline-variant/30 mx-1 md:mx-2" />
            <button
              onClick={onEndCall}
              className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-error to-error-container flex justify-center items-center text-on-error hover:opacity-90 transition-all duration-300 shadow-[0_0_24px_rgba(255,180,171,0.3)] hover:shadow-[0_0_32px_rgba(255,180,171,0.5)] hover:scale-105 border border-error/50"
            >
              <span className="material-symbols-outlined text-[32px] md:text-[36px]" style={{ fontVariationSettings: "'FILL' 1" }}>call_end</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

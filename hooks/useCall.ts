'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/authStore';
import { CallManager } from '@/lib/webrtc/callManager';
import type { CallSignal } from '@/types';
import type SimplePeer from 'simple-peer';

export function useCall() {
  const { user, couple } = useAuthStore();
  const [incomingCall, setIncomingCall] = useState<CallSignal | null>(null);
  const [isInCall, setIsInCall] = useState(false);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [callError, setCallError] = useState<string | null>(null);
  const managerRef = useRef<CallManager | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const instanceIdRef = useRef<string>(crypto.randomUUID());
  const isInCallRef = useRef(isInCall);
  const endCallRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    isInCallRef.current = isInCall;
  }, [isInCall]);

  const cleanup = useCallback(() => {
    localStream?.getTracks().forEach((t) => t.stop());
    managerRef.current?.destroy();
    managerRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    setIsInCall(false);
    setCallDuration(0);
    setCallError(null);
    if (timerRef.current) clearInterval(timerRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, [localStream]);

  const startCall = useCallback(async (video: boolean = false) => {
    if (!couple?.id || !user?.id) return;
    setCallError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    } catch (err) {
      const msg = err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Microphone access is required. Please enable it in browser settings.'
        : 'Could not access microphone/camera.';
      setCallError(msg);
      return;
    }

    setLocalStream(stream);
    const manager = new CallManager(couple.id, user.id);
    managerRef.current = manager;
    await manager.startCall(stream, (remote) => {
      setRemoteStream(remote);
      // Connected — clear timeout
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    });
    setIsInCall(true);
    timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);

    // Auto-end if no answer after 60 seconds
    timeoutRef.current = setTimeout(async () => {
      if (!remoteStream) {
        await managerRef.current?.endCall();
        cleanup();
        setCallError('No answer');
      }
    }, 60000);
  }, [couple, user, cleanup, remoteStream]);

  const answerCall = useCallback(async (signal: CallSignal, video: boolean = false) => {
    if (!couple?.id || !user?.id) return;
    setCallError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    } catch (err) {
      const msg = err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Microphone access is required to accept calls.'
        : 'Could not access microphone/camera.';
      setCallError(msg);
      setIncomingCall(null);
      return;
    }

    setLocalStream(stream);
    const manager = new CallManager(couple.id, user.id);
    managerRef.current = manager;
    await manager.answerCall(stream, signal.payload as unknown as SimplePeer.SignalData, (remote) => setRemoteStream(remote));
    setIsInCall(true);
    setIncomingCall(null);
    timerRef.current = setInterval(() => setCallDuration((d) => d + 1), 1000);
  }, [couple, user]);

  const endCall = useCallback(async () => {
    await managerRef.current?.endCall();
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    endCallRef.current = endCall;
  }, [endCall]);

  // Listen for incoming signals
  useEffect(() => {
    if (!couple?.id || !user?.id) return;
    const supabase = getSupabase();
    const channel = supabase
      .channel(`call_signals:${couple.id}:${user.id}:${instanceIdRef.current}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'call_signals', filter: `couple_id=eq.${couple.id}` },
        (payload) => {
          const signal = payload.new as CallSignal;
          if (signal.caller_id === user.id) return;

          if (signal.type === 'offer' && !isInCallRef.current) {
            setIncomingCall(signal);
            // Auto-decline after 60s
            setTimeout(() => setIncomingCall((cur) => cur?.id === signal.id ? null : cur), 60000);
          } else if (signal.type === 'answer' || signal.type === 'ice') {
            managerRef.current?.signal(signal.payload as unknown as SimplePeer.SignalData);
          } else if (signal.type === 'end' || signal.type === 'reject') {
            endCallRef.current();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [couple?.id, user?.id]);

  return {
    incomingCall, isInCall, localStream, remoteStream, callDuration, callError,
    startCall, answerCall, endCall, setIncomingCall,
  };
}

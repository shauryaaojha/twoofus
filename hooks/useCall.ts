'use client';

import { useEffect, useCallback } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/authStore';
import { useCallStore } from '@/lib/store/callStore';
import { CallManager } from '@/lib/webrtc/callManager';
import type { CallSignal } from '@/types';
import type SimplePeer from 'simple-peer';

// Singletons to preserve state and manager references across hook instances
let activeManager: CallManager | null = null;
let activeTimer: NodeJS.Timeout | null = null;
let activeTimeout: NodeJS.Timeout | null = null;
const instanceId = crypto.randomUUID();
const processedSignalIds = new Set<string>();

export function useCall() {
  const { user, couple } = useAuthStore();
  
  // Reactively bind to the Zustand call store
  const incomingCall = useCallStore((s) => s.incomingCall);
  const isInCall = useCallStore((s) => s.isInCall);
  const localStream = useCallStore((s) => s.localStream);
  const remoteStream = useCallStore((s) => s.remoteStream);
  const callDuration = useCallStore((s) => s.callDuration);
  const callError = useCallStore((s) => s.callError);

  const setIncomingCall = useCallStore((s) => s.setIncomingCall);
  const setCallDuration = useCallStore((s) => s.setCallDuration);
  const setCallError = useCallStore((s) => s.setCallError);
  const setIsInCall = useCallStore((s) => s.setIsInCall);
  const setLocalStream = useCallStore((s) => s.setLocalStream);
  const setRemoteStream = useCallStore((s) => s.setRemoteStream);
  const resetCallState = useCallStore((s) => s.resetCallState);

  const cleanup = useCallback(() => {
    const { localStream: currentLocal, remoteStream: currentRemote } = useCallStore.getState();
    currentLocal?.getTracks().forEach((t) => t.stop());
    currentRemote?.getTracks().forEach((t) => t.stop());
    
    activeManager?.destroy();
    activeManager = null;
    
    if (activeTimer) clearInterval(activeTimer);
    activeTimer = null;
    
    if (activeTimeout) clearTimeout(activeTimeout);
    activeTimeout = null;
    
    resetCallState();
  }, [resetCallState]);

  const startCall = useCallback(async (video: boolean = false) => {
    if (!couple?.id || !user?.id) return;
    
    // Prevent placing a new call if a call is already ongoing
    if (useCallStore.getState().isInCall) {
      console.warn('Call already ongoing, ignoring startCall');
      return;
    }
    
    // Lock call state immediately to avoid double clicks or dialing race conditions
    setIsInCall(true);
    setCallError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    } catch (err) {
      setIsInCall(false); // Revert lock on media failure
      const msg = err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Microphone access is required. Please enable it in browser settings.'
        : 'Could not access microphone/camera.';
      setCallError(msg);
      return;
    }

    setLocalStream(stream);
    const manager = new CallManager(couple.id, user.id);
    activeManager = manager;
    
    try {
      await manager.startCall(stream, (remote) => {
        setRemoteStream(remote);
        // Connected — clear auto-decline timeout
        if (activeTimeout) {
          clearTimeout(activeTimeout);
          activeTimeout = null;
        }
      });
    } catch (err) {
      setIsInCall(false);
      setLocalStream(null);
      setCallError('Failed to establish peer connection.');
      return;
    }
    
    if (activeTimer) clearInterval(activeTimer);
    activeTimer = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);

    // Auto-end if no answer after 60 seconds
    if (activeTimeout) clearTimeout(activeTimeout);
    activeTimeout = setTimeout(async () => {
      if (!useCallStore.getState().remoteStream) {
        await activeManager?.endCall();
        cleanup();
        setCallError('No answer');
      }
    }, 60000);
  }, [couple, user, cleanup, setLocalStream, setRemoteStream, setIsInCall, setCallDuration, setCallError]);

  const answerCall = useCallback(async (signal: CallSignal, video: boolean = false) => {
    if (!couple?.id || !user?.id) return;
    
    // Prevent answering if a call is already ongoing
    if (useCallStore.getState().isInCall) {
      console.warn('Call already ongoing, ignoring answerCall');
      return;
    }

    // Lock call state immediately to avoid double acceptance
    setIsInCall(true);
    setCallError(null);
    setIncomingCall(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
    } catch (err) {
      setIsInCall(false); // Revert lock on media failure
      const msg = err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Microphone access is required to accept calls.'
        : 'Could not access microphone/camera.';
      setCallError(msg);
      return;
    }

    setLocalStream(stream);
    const manager = new CallManager(couple.id, user.id);
    activeManager = manager;
    
    try {
      await manager.answerCall(stream, signal.payload as unknown as SimplePeer.SignalData, (remote) => {
        setRemoteStream(remote);
      });
    } catch (err) {
      setIsInCall(false);
      setLocalStream(null);
      setCallError('Failed to establish peer connection.');
      return;
    }
    
    if (activeTimer) clearInterval(activeTimer);
    activeTimer = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);
  }, [couple, user, setLocalStream, setRemoteStream, setIsInCall, setIncomingCall, setCallDuration, setCallError]);

  const declineCall = useCallback(async () => {
    if (!couple?.id || !user?.id || !incomingCall) return;
    const supabase = getSupabase();
    await supabase.from('call_signals').insert({
      couple_id: couple.id,
      caller_id: user.id,
      type: 'reject',
      payload: {},
    });
    setIncomingCall(null);
  }, [couple, user, incomingCall, setIncomingCall]);

  const endCall = useCallback(async () => {
    if (activeManager) {
      await activeManager.endCall();
    }
    cleanup();
  }, [cleanup]);

  // Listen for incoming signals
  useEffect(() => {
    if (!couple?.id || !user?.id) return;
    const supabase = getSupabase();
    
    const channel = supabase
      .channel(`call_signals:${couple.id}:${user.id}:${instanceId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'call_signals', filter: `couple_id=eq.${couple.id}` },
        (payload) => {
          const signal = payload.new as CallSignal;
          if (signal.caller_id === user.id) return;

          // Prevent duplicate signal processing across multiple hook subscribers
          if (processedSignalIds.has(signal.id)) return;
          processedSignalIds.add(signal.id);
          if (processedSignalIds.size > 100) {
            const firstKey = processedSignalIds.keys().next().value;
            if (firstKey !== undefined) {
              processedSignalIds.delete(firstKey);
            }
          }

          console.log('Call signal received:', signal.type);

          if (signal.type === 'offer' && !useCallStore.getState().isInCall) {
            setIncomingCall(signal);
            // Auto-decline after 60s
            setTimeout(() => {
              if (useCallStore.getState().incomingCall?.id === signal.id) {
                setIncomingCall(null);
              }
            }, 60000);
          } else if (signal.type === 'answer' || signal.type === 'ice') {
            activeManager?.signal(signal.payload as unknown as SimplePeer.SignalData);
          } else if (signal.type === 'end' || signal.type === 'reject') {
            cleanup();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [couple?.id, user?.id, setIncomingCall, cleanup]);

  return {
    incomingCall,
    isInCall,
    localStream,
    remoteStream,
    callDuration,
    callError,
    startCall,
    answerCall,
    declineCall,
    endCall,
    setIncomingCall,
  };
}

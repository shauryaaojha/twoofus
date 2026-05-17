'use client';

import { useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/authStore';
import { useCallStore } from '@/lib/store/callStore';
import { CallManager } from '@/lib/webrtc/callManager';
import { encryptMessage } from '@/lib/crypto/e2ee';
import { getMyKeys } from '@/lib/crypto/keyManager';
import { decodeBase64 } from 'tweetnacl-util';
import type { CallSignal } from '@/types';
import type SimplePeer from 'simple-peer';

// Singletons to preserve state and manager references across hook instances
let activeManager: CallManager | null = null;
let activeTimer: NodeJS.Timeout | null = null;
let activeTimeout: NodeJS.Timeout | null = null;
let activeChannel: any = null;
let activeChannelCreatorHookId: string | null = null;
let callStartTime: number | null = null;
let callIsVideo: boolean = false;

// Safe UUID generation fallback
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const instanceId = generateUUID();
const processedSignalIds = new Set<string>();
const signalQueue: SimplePeer.SignalData[] = [];

/**
 * Inserts a 'call' type message into the chat to show call events
 * like Instagram's "Voice call · 2:30" or "Missed voice call"
 */
async function insertCallMessage(
  coupleId: string,
  senderId: string,
  callData: {
    callType: 'voice' | 'video';
    status: 'started' | 'ended' | 'missed' | 'declined';
    duration?: number; // seconds
  }
) {
  const supabase = getSupabase();
  const { partner } = useAuthStore.getState();
  const keys = getMyKeys();
  
  if (!keys || !partner?.public_key) {
    console.warn('[useCall] Cannot insert call message — keys or partner not available');
    return;
  }

  const partnerPub = decodeBase64(partner.public_key);
  const callPayload = JSON.stringify(callData);
  const { ciphertext, nonce } = encryptMessage(callPayload, partnerPub, keys.secretKey);

  const { error } = await supabase.from('messages').insert({
    couple_id: coupleId,
    sender_id: senderId,
    ciphertext,
    nonce,
    type: 'call',
  });

  if (error) {
    console.error('[useCall] Failed to insert call message:', error);
  }
}

export function useCall() {
  const { user, couple } = useAuthStore();
  const hookId = useRef(Math.random().toString(36).substring(2));
  
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

  const cleanup = useCallback((skipCallLog?: boolean) => {
    // Clear the early signal queue
    signalQueue.length = 0;
    
    const { localStream: currentLocal, remoteStream: currentRemote } = useCallStore.getState();
    currentLocal?.getTracks().forEach((t) => t.stop());
    currentRemote?.getTracks().forEach((t) => t.stop());
    
    try {
      activeManager?.destroy();
    } catch (e) {
      // already destroyed
    }
    activeManager = null;
    
    if (activeTimer) clearInterval(activeTimer);
    activeTimer = null;
    
    if (activeTimeout) clearTimeout(activeTimeout);
    activeTimeout = null;

    callStartTime = null;
    
    resetCallState();
  }, [resetCallState]);

  const startCall = useCallback(async (video: boolean = false) => {
    if (!couple?.id || !user?.id) return;
    
    // Prevent placing a new call if a call is already ongoing
    if (useCallStore.getState().isInCall) {
      console.warn('[useCall] Call already ongoing, ignoring startCall');
      return;
    }
    
    // Lock call state immediately to avoid double clicks
    setIsInCall(true);
    setCallError(null);
    callIsVideo = video;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
      console.log('[useCall] Got local media stream:', {
        audio: stream.getAudioTracks().length,
        video: stream.getVideoTracks().length,
      });
    } catch (err) {
      setIsInCall(false);
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
        console.log('[useCall] Remote stream received in startCall callback');
        setRemoteStream(remote);
        // Connected — clear auto-decline timeout
        if (activeTimeout) {
          clearTimeout(activeTimeout);
          activeTimeout = null;
        }
      });
    } catch (err) {
      console.error('[useCall] Failed to start call:', err);
      stream.getTracks().forEach(t => t.stop());
      setIsInCall(false);
      setLocalStream(null);
      setCallError('Failed to establish peer connection.');
      return;
    }

    // Flush any early queued signals
    while (signalQueue.length > 0) {
      const qSignal = signalQueue.shift();
      if (qSignal) {
        manager.signal(qSignal);
      }
    }
    
    callStartTime = Date.now();
    
    if (activeTimer) clearInterval(activeTimer);
    activeTimer = setInterval(() => {
      setCallDuration((d) => d + 1);
    }, 1000);

    // Auto-end if no answer after 60 seconds
    if (activeTimeout) clearTimeout(activeTimeout);
    activeTimeout = setTimeout(async () => {
      if (!useCallStore.getState().remoteStream) {
        // Log missed call
        if (couple?.id && user?.id) {
          await insertCallMessage(couple.id, user.id, {
            callType: callIsVideo ? 'video' : 'voice',
            status: 'missed',
          });
        }
        await activeManager?.endCall();
        cleanup(true);
        setCallError('No answer');
      }
    }, 60000);
  }, [couple, user, cleanup, setLocalStream, setRemoteStream, setIsInCall, setCallDuration, setCallError]);

  const answerCall = useCallback(async (signal: CallSignal, video: boolean = false) => {
    if (!couple?.id || !user?.id) return;
    
    // Prevent answering if a call is already ongoing
    if (useCallStore.getState().isInCall) {
      console.warn('[useCall] Call already ongoing, ignoring answerCall');
      return;
    }

    // Lock call state immediately
    setIsInCall(true);
    setCallError(null);
    setIncomingCall(null);
    callIsVideo = video;

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video });
      console.log('[useCall] Got local media stream for answer:', {
        audio: stream.getAudioTracks().length,
        video: stream.getVideoTracks().length,
      });
    } catch (err) {
      setIsInCall(false);
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
        console.log('[useCall] Remote stream received in answerCall callback');
        setRemoteStream(remote);
      });
    } catch (err) {
      console.error('[useCall] Failed to answer call:', err);
      stream.getTracks().forEach(t => t.stop());
      setIsInCall(false);
      setLocalStream(null);
      setCallError('Failed to establish peer connection.');
      return;
    }

    // Flush early candidates
    while (signalQueue.length > 0) {
      const qSignal = signalQueue.shift();
      if (qSignal) {
        manager.signal(qSignal);
      }
    }
    
    // Log "call started" message — the answerer logs it
    callStartTime = Date.now();
    await insertCallMessage(couple.id, user.id, {
      callType: callIsVideo ? 'video' : 'voice',
      status: 'started',
    });

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
    
    // Log declined call
    await insertCallMessage(couple.id, user.id, {
      callType: 'voice',
      status: 'declined',
    });

    setIncomingCall(null);
  }, [couple, user, incomingCall, setIncomingCall]);

  const endCall = useCallback(async () => {
    // Calculate call duration before cleanup
    const duration = callStartTime ? Math.round((Date.now() - callStartTime) / 1000) : 0;
    
    // Log "call ended" with duration
    if (couple?.id && user?.id && duration > 0) {
      await insertCallMessage(couple.id, user.id, {
        callType: callIsVideo ? 'video' : 'voice',
        status: 'ended',
        duration,
      });
    }

    if (activeManager) {
      await activeManager.endCall();
    }
    cleanup(true);
  }, [cleanup, couple, user]);

  // Listen for incoming signals
  useEffect(() => {
    if (!couple?.id || !user?.id) return;
    
    // If a channel is already active, do not subscribe again
    if (activeChannel) {
      console.log(`[useCall] Realtime call signal channel already active, hook ${hookId.current} skipping`);
      return;
    }

    const supabase = getSupabase();
    const channelId = `call_signals:${couple.id}:${user.id}`;
    
    console.log(`[useCall] Subscribing to realtime call signals for couple ${couple.id}`);
    
    const channel = supabase
      .channel(channelId)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'call_signals', filter: `couple_id=eq.${couple.id}` },
        (payload) => {
          const signal = payload.new as CallSignal;
          // Ignore own signals
          if (signal.caller_id === user.id) return;

          // Prevent duplicate signal processing
          if (processedSignalIds.has(signal.id)) return;
          processedSignalIds.add(signal.id);
          if (processedSignalIds.size > 200) {
            const firstKey = processedSignalIds.keys().next().value;
            if (firstKey !== undefined) {
              processedSignalIds.delete(firstKey);
            }
          }

          console.log('[useCall] Call signal received:', signal.type, 'id:', signal.id);

          if (signal.type === 'offer' && !useCallStore.getState().isInCall) {
            setIncomingCall(signal);
            // Auto-decline after 60s
            setTimeout(() => {
              if (useCallStore.getState().incomingCall?.id === signal.id) {
                setIncomingCall(null);
              }
            }, 60000);
          } else if (signal.type === 'answer' || signal.type === 'ice') {
            if (activeManager) {
              console.log('[useCall] Forwarding signal to active manager:', signal.type);
              activeManager.signal(signal.payload as unknown as SimplePeer.SignalData);
            } else {
              console.log('[useCall] Queuing signal (no active manager yet):', signal.type);
              signalQueue.push(signal.payload as unknown as SimplePeer.SignalData);
            }
          } else if (signal.type === 'end' || signal.type === 'reject') {
            console.log('[useCall] Call ended/rejected by remote');
            cleanup();
          }
        }
      );

    channel.subscribe((status) => {
      console.log(`[useCall] Realtime call subscription status:`, status);
    });

    activeChannel = channel;
    activeChannelCreatorHookId = hookId.current;

    return () => {
      if (activeChannelCreatorHookId === hookId.current) {
        console.log(`[useCall] Cleaning up realtime call channel`);
        supabase.removeChannel(channel);
        activeChannel = null;
        activeChannelCreatorHookId = null;
      }
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

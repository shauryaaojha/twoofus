'use client';

import { useEffect, useCallback, useRef } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/authStore';
import { useCallStore } from '@/lib/store/callStore';
import { AgoraCallManager } from '@/lib/agora/agoraCallManager';
import { encryptMessage } from '@/lib/crypto/e2ee';
import { getMyKeys } from '@/lib/crypto/keyManager';
import { decodeBase64 } from 'tweetnacl-util';
import type { CallSignal } from '@/types';

// Singletons to preserve state and manager references across hook instances
let activeManager: AgoraCallManager | null = null;
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

  const cleanup = useCallback(() => {
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

    try {
      const manager = new AgoraCallManager(couple.id, user.id);
      activeManager = manager;

      const { localStream: stream } = await manager.startCall(
        video,
        (remoteMediaStream) => {
          console.log('[useCall] Remote stream received');
          setRemoteStream(remoteMediaStream);
          // Connected — clear auto-decline timeout
          if (activeTimeout) {
            clearTimeout(activeTimeout);
            activeTimeout = null;
          }
        },
        () => {
          // Remote user left — end the call
          console.log('[useCall] Remote user left, ending call');
          endCallInternal();
        }
      );

      setLocalStream(stream);

      // Send call-invite signal via Supabase so partner's device rings
      const supabase = getSupabase();
      await supabase.from('call_signals').insert({
        couple_id: couple.id,
        caller_id: user.id,
        type: 'call-invite',
        payload: { callType: video ? 'video' : 'voice' },
      });

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
          // Send end signal
          const supabase = getSupabase();
          await supabase.from('call_signals').insert({
            couple_id: couple.id,
            caller_id: user.id,
            type: 'end',
            payload: {},
          });
          cleanup();
          setCallError('No answer');
        }
      }, 60000);
    } catch (err) {
      console.error('[useCall] Failed to start call:', err);
      setIsInCall(false);
      setLocalStream(null);
      activeManager?.destroy();
      activeManager = null;
      const msg = err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Microphone access is required. Please enable it in browser settings.'
        : 'Could not start call. Check your connection.';
      setCallError(msg);
    }
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

    try {
      const manager = new AgoraCallManager(couple.id, user.id);
      activeManager = manager;

      const { localStream: stream } = await manager.startCall(
        video,
        (remoteMediaStream) => {
          console.log('[useCall] Remote stream received in answerCall');
          setRemoteStream(remoteMediaStream);
        },
        () => {
          console.log('[useCall] Remote user left, ending call');
          endCallInternal();
        }
      );

      setLocalStream(stream);

      // Send call-answer signal
      const supabase = getSupabase();
      await supabase.from('call_signals').insert({
        couple_id: couple.id,
        caller_id: user.id,
        type: 'call-answer',
        payload: { callType: video ? 'video' : 'voice' },
      });

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
    } catch (err) {
      console.error('[useCall] Failed to answer call:', err);
      setIsInCall(false);
      setLocalStream(null);
      activeManager?.destroy();
      activeManager = null;
      const msg = err instanceof DOMException && err.name === 'NotAllowedError'
        ? 'Microphone access is required to accept calls.'
        : 'Could not join call. Check your connection.';
      setCallError(msg);
    }
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

  // Internal end call (used by remote-left handler)
  const endCallInternal = async () => {
    const duration = callStartTime ? Math.round((Date.now() - callStartTime) / 1000) : 0;
    const { couple: c, user: u } = useAuthStore.getState();
    
    if (c?.id && u?.id && duration > 0) {
      await insertCallMessage(c.id, u.id, {
        callType: callIsVideo ? 'video' : 'voice',
        status: 'ended',
        duration,
      });
    }
    cleanup();
  };

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

    // Send end signal via Supabase
    if (couple?.id && user?.id) {
      const supabase = getSupabase();
      await supabase.from('call_signals').insert({
        couple_id: couple.id,
        caller_id: user.id,
        type: 'end',
        payload: {},
      });
    }

    cleanup();
  }, [cleanup, couple, user]);

  // Listen for incoming signals via Supabase Realtime
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

          if (signal.type === 'call-invite' && !useCallStore.getState().isInCall) {
            setIncomingCall(signal);
            // Auto-dismiss after 60s
            setTimeout(() => {
              if (useCallStore.getState().incomingCall?.id === signal.id) {
                setIncomingCall(null);
              }
            }, 60000);
          } else if (signal.type === 'call-answer') {
            // Partner answered — clear the auto-decline timeout
            if (activeTimeout) {
              clearTimeout(activeTimeout);
              activeTimeout = null;
            }
            console.log('[useCall] Partner answered the call');
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

  // Expose the Agora manager for direct track controls (mute/video/camera)
  const getActiveManager = useCallback(() => activeManager, []);

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
    getActiveManager,
  };
}

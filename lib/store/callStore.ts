import { create } from 'zustand';
import type { CallSignal } from '@/types';

interface CallState {
  incomingCall: CallSignal | null;
  isInCall: boolean;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  callDuration: number;
  callError: string | null;
  
  setIncomingCall: (signal: CallSignal | null) => void;
  setCallDuration: (duration: number | ((d: number) => number)) => void;
  setCallError: (error: string | null) => void;
  setIsInCall: (isInCall: boolean) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setRemoteStream: (stream: MediaStream | null) => void;
  resetCallState: () => void;
}

export const useCallStore = create<CallState>((set) => ({
  incomingCall: null,
  isInCall: false,
  localStream: null,
  remoteStream: null,
  callDuration: 0,
  callError: null,
  
  setIncomingCall: (incomingCall) => set({ incomingCall }),
  setCallDuration: (duration) => set((state) => ({
    callDuration: typeof duration === 'function' ? duration(state.callDuration) : duration
  })),
  setCallError: (callError) => set({ callError }),
  setIsInCall: (isInCall) => set({ isInCall }),
  setLocalStream: (localStream) => set({ localStream }),
  setRemoteStream: (remoteStream) => set({ remoteStream }),
  resetCallState: () => set({
    incomingCall: null,
    isInCall: false,
    localStream: null,
    remoteStream: null,
    callDuration: 0,
    callError: null,
  }),
}));

import SimplePeer from 'simple-peer';
import { getSupabase } from '@/lib/supabase/client';

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    {
      urls: 'turn:a.relay.metered.ca:80',
      username: 'e8dd65b92f3adf1de72e1bf1',
      credential: '9+RhJ0KeXpY1KQQO',
    },
    {
      urls: 'turn:a.relay.metered.ca:80?transport=tcp',
      username: 'e8dd65b92f3adf1de72e1bf1',
      credential: '9+RhJ0KeXpY1KQQO',
    },
    {
      urls: 'turn:a.relay.metered.ca:443',
      username: 'e8dd65b92f3adf1de72e1bf1',
      credential: '9+RhJ0KeXpY1KQQO',
    },
    {
      urls: 'turns:a.relay.metered.ca:443?transport=tcp',
      username: 'e8dd65b92f3adf1de72e1bf1',
      credential: '9+RhJ0KeXpY1KQQO',
    },
  ],
  iceCandidatePoolSize: 10,
};

export class CallManager {
  private peer: SimplePeer.Instance | null = null;
  private coupleId: string;
  private myId: string;
  private isDestroyed = false;

  constructor(coupleId: string, myId: string) {
    this.coupleId = coupleId;
    this.myId = myId;
  }

  async startCall(localStream: MediaStream, onRemoteStream: (s: MediaStream) => void) {
    console.log('[CallManager] Starting call as initiator. Tracks:', {
      audio: localStream.getAudioTracks().length,
      video: localStream.getVideoTracks().length,
    });

    this.peer = new SimplePeer({
      initiator: true,
      stream: localStream,
      trickle: true,
      config: ICE_CONFIG,
      offerOptions: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      },
    });
    this.setupPeer(onRemoteStream);
  }

  async answerCall(localStream: MediaStream, offer: SimplePeer.SignalData, onRemoteStream: (s: MediaStream) => void) {
    console.log('[CallManager] Answering call. Tracks:', {
      audio: localStream.getAudioTracks().length,
      video: localStream.getVideoTracks().length,
    });

    this.peer = new SimplePeer({
      initiator: false,
      stream: localStream,
      trickle: true,
      config: ICE_CONFIG,
      answerOptions: {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      },
    });
    this.setupPeer(onRemoteStream);
    // Signal the offer to trigger the answer
    this.peer.signal(offer);
  }

  signal(data: SimplePeer.SignalData) {
    if (this.isDestroyed || !this.peer) {
      console.warn('[CallManager] Ignoring signal — peer is destroyed or null');
      return;
    }
    try {
      console.log('[CallManager] Signaling peer with:', data.type || 'ice-candidate');
      this.peer.signal(data);
    } catch (err) {
      console.error('[CallManager] Error signaling peer:', err);
    }
  }

  private setupPeer(onRemoteStream: (s: MediaStream) => void) {
    if (!this.peer) return;
    const supabase = getSupabase();

    this.peer.on('signal', async (data) => {
      if (this.isDestroyed) return;
      const signalType = data.type === 'offer' ? 'offer' : data.type === 'answer' ? 'answer' : 'ice';
      console.log('[CallManager] Emitting signal:', signalType);
      
      const { error } = await supabase.from('call_signals').insert({
        couple_id: this.coupleId,
        caller_id: this.myId,
        type: signalType,
        payload: data as unknown as Record<string, unknown>,
      });
      if (error) {
        console.error('[CallManager] Failed to insert signal:', error);
      }
    });

    this.peer.on('stream', (stream) => {
      console.log('[CallManager] Remote stream received! Tracks:', {
        audio: stream.getAudioTracks().map(t => ({ id: t.id, enabled: t.enabled, muted: t.muted, readyState: t.readyState })),
        video: stream.getVideoTracks().map(t => ({ id: t.id, enabled: t.enabled, muted: t.muted, readyState: t.readyState })),
      });
      onRemoteStream(stream);
    });

    this.peer.on('track', (track, stream) => {
      console.log('[CallManager] Track event:', track.kind, track.id, 'readyState:', track.readyState);
    });

    this.peer.on('connect', () => {
      console.log('[CallManager] Peer connected! Data channel open.');
    });

    this.peer.on('error', (err) => {
      console.error('[CallManager] WebRTC peer error:', err.message || err);
    });

    this.peer.on('close', () => {
      console.log('[CallManager] Peer connection closed.');
    });

    // Log ICE connection state changes via the underlying RTCPeerConnection
    // simple-peer exposes _pc internally
    const pc = (this.peer as any)._pc as RTCPeerConnection | undefined;
    if (pc) {
      pc.oniceconnectionstatechange = () => {
        console.log('[CallManager] ICE connection state:', pc.iceConnectionState);
      };
      pc.onconnectionstatechange = () => {
        console.log('[CallManager] Connection state:', pc.connectionState);
      };
      pc.onicegatheringstatechange = () => {
        console.log('[CallManager] ICE gathering state:', pc.iceGatheringState);
      };
      pc.onsignalingstatechange = () => {
        console.log('[CallManager] Signaling state:', pc.signalingState);
      };
    }
  }

  async endCall() {
    if (this.isDestroyed) return;
    const supabase = getSupabase();
    await supabase.from('call_signals').insert({
      couple_id: this.coupleId,
      caller_id: this.myId,
      type: 'end',
      payload: {},
    });
    this.destroy();
  }

  destroy() {
    if (this.isDestroyed) return;
    this.isDestroyed = true;
    try {
      this.peer?.destroy();
    } catch (e) {
      // peer may already be destroyed
    }
    this.peer = null;
  }
}

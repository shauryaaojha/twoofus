import SimplePeer from 'simple-peer';
import { getSupabase } from '@/lib/supabase/client';

export class CallManager {
  private peer: SimplePeer.Instance | null = null;
  private coupleId: string;
  private myId: string;

  constructor(coupleId: string, myId: string) {
    this.coupleId = coupleId;
    this.myId = myId;
  }

  async startCall(localStream: MediaStream, onRemoteStream: (s: MediaStream) => void) {
    this.peer = new SimplePeer({ initiator: true, stream: localStream, trickle: true });
    this.setupPeer(onRemoteStream);
  }

  async answerCall(localStream: MediaStream, offer: SimplePeer.SignalData, onRemoteStream: (s: MediaStream) => void) {
    this.peer = new SimplePeer({ initiator: false, stream: localStream, trickle: true });
    this.setupPeer(onRemoteStream);
    this.peer.signal(offer);
  }

  signal(data: SimplePeer.SignalData) {
    this.peer?.signal(data);
  }

  private setupPeer(onRemoteStream: (s: MediaStream) => void) {
    if (!this.peer) return;
    const supabase = getSupabase();

    this.peer.on('signal', async (data) => {
      const signalType = data.type === 'offer' ? 'offer' : data.type === 'answer' ? 'answer' : 'ice';
      await supabase.from('call_signals').insert({
        couple_id: this.coupleId,
        caller_id: this.myId,
        type: signalType,
        payload: data as unknown as Record<string, unknown>,
      });
    });

    this.peer.on('stream', onRemoteStream);
    this.peer.on('error', (err) => console.error('WebRTC error:', err));
  }

  async endCall() {
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
    this.peer?.destroy();
    this.peer = null;
  }
}

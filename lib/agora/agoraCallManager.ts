import { getSupabase } from '@/lib/supabase/client';
import { logger } from '@/lib/utils/logger';

const APP_ID = process.env.NEXT_PUBLIC_AGORA_APP_ID!;

// Dynamically import Agora SDK to avoid SSR "window is not defined" errors
async function getAgoraRTC() {
  const { default: AgoraRTC } = await import('agora-rtc-sdk-ng');
  // Disable Agora console logs in production
  AgoraRTC.setLogLevel(process.env.NODE_ENV === 'production' ? 4 : 1);
  return AgoraRTC;
}

export class AgoraCallManager {
  private client: any = null; // IAgoraRTCClient - typed as any to allow lazy init
  private localAudioTrack: any = null;
  private localVideoTrack: any = null;
  private coupleId: string;
  private myId: string;
  private isDestroyed = false;
  private onRemoteStream: ((stream: MediaStream) => void) | null = null;
  private onRemoteLeft: (() => void) | null = null;

  constructor(coupleId: string, myId: string) {
    this.coupleId = coupleId;
    this.myId = myId;
  }

  private async initClient() {
    const AgoraRTC = await getAgoraRTC();
    this.client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
    this.setupEventListeners();
    return AgoraRTC;
  }

  private setupEventListeners() {
    if (!this.client) return;

    this.client.on('user-published', async (user: any, mediaType: 'audio' | 'video') => {
      if (this.isDestroyed) return;
      logger.debug('[AgoraCallManager] Remote user published:', user.uid, mediaType);

      await this.client.subscribe(user, mediaType);
      logger.debug('[AgoraCallManager] Subscribed to remote', mediaType);

      // Build a combined MediaStream from all available remote tracks
      this.emitRemoteStream(user);
    });

    this.client.on('user-unpublished', (user: any, mediaType: 'audio' | 'video') => {
      logger.debug('[AgoraCallManager] Remote user unpublished:', user.uid, mediaType);
      // Re-emit with remaining tracks
      this.emitRemoteStream(user);
    });

    this.client.on('user-left', (user: any) => {
      logger.debug('[AgoraCallManager] Remote user left:', user.uid);
      this.onRemoteLeft?.();
    });

    this.client.on('connection-state-change', (curState: string, prevState: string) => {
      logger.debug('[AgoraCallManager] Connection state:', prevState, '->', curState);
    });
  }

  private emitRemoteStream(user: any) {
    if (!this.onRemoteStream) return;

    const tracks: MediaStreamTrack[] = [];

    if (user.audioTrack) {
      const audioTrack = user.audioTrack.getMediaStreamTrack();
      if (audioTrack) tracks.push(audioTrack);
    }

    if (user.videoTrack) {
      const videoTrack = user.videoTrack.getMediaStreamTrack();
      if (videoTrack) tracks.push(videoTrack);
    }

    if (tracks.length > 0) {
      const stream = new MediaStream(tracks);
      this.onRemoteStream(stream);
    }
  }

  private async fetchToken(channelName: string): Promise<string> {
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('No auth session for token generation');
    }

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agora-token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ channelName, uid: 0 }),
      }
    );

    if (!response.ok) {
      throw new Error(`Token fetch failed: ${response.status}`);
    }

    const { token } = await response.json();
    return token;
  }

  private getChannelName(): string {
    return `call_${this.coupleId}`;
  }

  async startCall(
    video: boolean,
    onRemoteStream: (stream: MediaStream) => void,
    onRemoteLeft: () => void,
  ): Promise<{ localStream: MediaStream }> {
    this.onRemoteStream = onRemoteStream;
    this.onRemoteLeft = onRemoteLeft;

    // Dynamically init the Agora client
    const AgoraRTC = await this.initClient();

    const channelName = this.getChannelName();
    logger.debug('[AgoraCallManager] Starting call, channel:', channelName);

    // Fetch token from our Edge Function
    const token = await this.fetchToken(channelName);

    // Create local tracks
    if (video) {
      [this.localAudioTrack, this.localVideoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks(
        { encoderConfig: 'speech_standard' },
        { encoderConfig: '480p_1' }
      );
    } else {
      this.localAudioTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: 'speech_standard',
      });
    }

    // Join the channel
    await this.client.join(APP_ID, channelName, token, 0);
    logger.debug('[AgoraCallManager] Joined channel');

    // Publish local tracks
    const tracksToPublish = [this.localAudioTrack, this.localVideoTrack].filter(Boolean);
    await this.client.publish(tracksToPublish);
    logger.debug('[AgoraCallManager] Published local tracks');

    // Build local MediaStream for preview
    const localMediaTracks: MediaStreamTrack[] = [];
    if (this.localAudioTrack) {
      localMediaTracks.push(this.localAudioTrack.getMediaStreamTrack());
    }
    if (this.localVideoTrack) {
      localMediaTracks.push(this.localVideoTrack.getMediaStreamTrack());
    }

    return { localStream: new MediaStream(localMediaTracks) };
  }

  toggleMute(): boolean {
    if (this.localAudioTrack) {
      const isCurrentlyEnabled = this.localAudioTrack.enabled;
      this.localAudioTrack.setEnabled(!isCurrentlyEnabled);
      return isCurrentlyEnabled; // return isMuted (true if was enabled, now disabled)
    }
    return false;
  }

  toggleVideo(): boolean {
    if (this.localVideoTrack) {
      const isCurrentlyEnabled = this.localVideoTrack.enabled;
      this.localVideoTrack.setEnabled(!isCurrentlyEnabled);
      return isCurrentlyEnabled; // return isVideoOff
    }
    return true; // no video track = video is off
  }

  async switchCamera(): Promise<void> {
    if (!this.localVideoTrack) return;
    try {
      const AgoraRTC = await getAgoraRTC();
      const devices = await AgoraRTC.getCameras();
      if (devices.length < 2) return;

      const currentLabel = this.localVideoTrack.getMediaStreamTrack().label;
      const nextDevice = devices.find((d: any) => d.label !== currentLabel) || devices[0];
      await this.localVideoTrack.setDevice(nextDevice.deviceId);
      logger.debug('[AgoraCallManager] Switched camera to:', nextDevice.label);
    } catch (e) {
      logger.warn('[AgoraCallManager] Camera switch failed:', e);
    }
  }

  async endCall(): Promise<void> {
    if (this.isDestroyed) return;
    this.isDestroyed = true;

    logger.debug('[AgoraCallManager] Ending call');

    // Stop and close local tracks
    if (this.localAudioTrack) {
      this.localAudioTrack.stop();
      this.localAudioTrack.close();
      this.localAudioTrack = null;
    }
    if (this.localVideoTrack) {
      this.localVideoTrack.stop();
      this.localVideoTrack.close();
      this.localVideoTrack = null;
    }

    // Leave the channel
    if (this.client) {
      try {
        await this.client.leave();
      } catch (e) {
        logger.warn('[AgoraCallManager] Error leaving channel:', e);
      }
    }

    this.onRemoteStream = null;
    this.onRemoteLeft = null;
  }

  destroy() {
    this.endCall();
  }
}

export type UITheme = 'midnight' | 'sunrise' | 'forest' | 'ocean' | 'rose-gold' | 'monochrome' | 'cyberpunk';
export type ChatTheme = 'soft-blush' | 'bold-gradient' | 'minimal-light' | 'dark-elegant' | 'playful-bubbles' | 'neon-glow' | 'watercolor' | 'film-strip' | 'glassmorphic' | 'couple-custom';

export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  public_key: string;
  encrypted_private_key: string | null;
  key_salt: string | null;
  key_iv: string | null;
  mood: string;
  ui_theme: UITheme;
  created_at: string;
}

export interface Couple {
  id: string;
  user_a: string;
  user_b: string | null;
  invite_token: string | null;
  invite_expires_at: string | null;
  paired_at: string | null;
  anniversary_date: string | null;
  our_song_url: string | null;
  status: 'active' | 'ended' | 'blocked';
  ended_at: string | null;
  created_at: string;
  chat_theme: ChatTheme;
  chat_bg_url: string | null;
  chat_bg_custom_colors: {
    myColor: string;
    theirColor: string;
    shape: 'pill' | 'rounded' | 'square';
  } | null;
}

export interface Message {
  id: string;
  couple_id: string;
  sender_id: string;
  ciphertext: string;
  nonce: string;
  type: 'text' | 'photo' | 'reaction' | 'call';
  reply_to: string | null;
  reaction: string | null;
  seen_at: string | null;
  deleted_at: string | null;
  created_at: string;
  plaintext?: string;
}

export interface Photo {
  id: string;
  couple_id: string;
  sender_id: string;
  storage_path: string;
  encrypted_key: string;
  nonce: string;
  expires_at: string;
  created_at: string;
}

export interface PhotoQuota {
  user_id: string;
  quota_date: string;
  count: number;
}

export interface CallSignal {
  id: string;
  couple_id: string;
  caller_id: string;
  type: 'offer' | 'answer' | 'ice' | 'end' | 'reject';
  payload: Record<string, unknown>;
  created_at: string;
}

export interface PushSubscription {
  user_id: string;
  subscription: Record<string, unknown>;
  updated_at: string;
}

# 🤖 FULL SPOON-FED PROMPT FOR CLAUDE (Antigravity / Claude Code)

> Copy and paste this entire prompt into Claude (Antigravity or Claude Code). It is self-contained and production-ready.

---

## THE PROMPT

```
You are a senior full-stack engineer. Build me a complete, production-ready web application called **TwoOfUs** — a private, end-to-end encrypted real-time communication app exclusively for two people (a couple). It should be more visually refined and modern than Instagram.

## STACK (NON-NEGOTIABLE)
- **Framework:** Next.js 14 (App Router, TypeScript)
- **Styling:** Tailwind CSS + global CSS custom properties for theming
- **Auth + DB + Storage + Realtime:** Supabase (email/password auth only)
- **E2EE:** TweetNaCl.js (`tweetnacl` npm package)
- **WebRTC (calls):** `simple-peer` npm package
- **State management:** Zustand
- **PWA:** `next-pwa` package
- **Deployment:** Vercel (all serverless, no Docker)
- **Push notifications:** Web Push API + Supabase Edge Function

## ENVIRONMENT VARIABLES (use these exact names)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
NEXT_PUBLIC_APP_URL=
```

---

## SUPABASE SETUP

### Run this SQL in Supabase SQL Editor to create all tables and RLS:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  avatar_url text,
  public_key text not null,
  mood text default '🥰',
  created_at timestamptz default now()
);
alter table profiles enable row level security;
create policy "Users can view their own and partner profile" on profiles
  for select using (
    id = auth.uid() or
    id in (
      select case when user_a = auth.uid() then user_b else user_a end
      from couples where user_a = auth.uid() or user_b = auth.uid()
    )
  );
create policy "Users can update own profile" on profiles
  for update using (id = auth.uid());
create policy "Users can insert own profile" on profiles
  for insert with check (id = auth.uid());

-- Couples
create table couples (
  id uuid default uuid_generate_v4() primary key,
  user_a uuid references profiles(id) not null,
  user_b uuid references profiles(id),
  invite_token text unique,
  invite_expires_at timestamptz,
  paired_at timestamptz,
  anniversary_date date,
  our_song_url text,
  created_at timestamptz default now()
);
alter table couples enable row level security;
create policy "Couple members can view their couple" on couples
  for select using (user_a = auth.uid() or user_b = auth.uid());
create policy "User A can create couple" on couples
  for insert with check (user_a = auth.uid());
create policy "User B can update to join" on couples
  for update using (true);

-- Messages
create table messages (
  id uuid default uuid_generate_v4() primary key,
  couple_id uuid references couples(id) on delete cascade not null,
  sender_id uuid references profiles(id) not null,
  ciphertext text not null,
  nonce text not null,
  type text default 'text' check (type in ('text', 'photo', 'reaction')),
  reply_to uuid references messages(id),
  reaction text,
  seen_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz default now()
);
alter table messages enable row level security;
create policy "Couple members can read messages" on messages
  for select using (
    couple_id in (select id from couples where user_a = auth.uid() or user_b = auth.uid())
  );
create policy "Couple members can send messages" on messages
  for insert with check (
    sender_id = auth.uid() and
    couple_id in (select id from couples where user_a = auth.uid() or user_b = auth.uid())
  );
create policy "Sender can soft delete" on messages
  for update using (sender_id = auth.uid());

-- Photos
create table photos (
  id uuid default uuid_generate_v4() primary key,
  couple_id uuid references couples(id) on delete cascade not null,
  sender_id uuid references profiles(id) not null,
  storage_path text not null,
  encrypted_key text not null,
  nonce text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);
alter table photos enable row level security;
create policy "Couple members can view photos" on photos
  for select using (
    couple_id in (select id from couples where user_a = auth.uid() or user_b = auth.uid())
  );
create policy "Couple members can upload photos" on photos
  for insert with check (
    sender_id = auth.uid() and
    couple_id in (select id from couples where user_a = auth.uid() or user_b = auth.uid())
  );

-- Photo quota
create table photo_quota (
  user_id uuid references profiles(id) primary key,
  quota_date date not null,
  count int default 0
);
alter table photo_quota enable row level security;
create policy "Users manage own quota" on photo_quota
  for all using (user_id = auth.uid());

-- Call signals (WebRTC signaling)
create table call_signals (
  id uuid default uuid_generate_v4() primary key,
  couple_id uuid references couples(id) on delete cascade not null,
  caller_id uuid references profiles(id) not null,
  type text not null check (type in ('offer','answer','ice','end','reject')),
  payload jsonb not null,
  created_at timestamptz default now()
);
alter table call_signals enable row level security;
create policy "Couple members can read signals" on call_signals
  for select using (
    couple_id in (select id from couples where user_a = auth.uid() or user_b = auth.uid())
  );
create policy "Couple members can insert signals" on call_signals
  for insert with check (
    caller_id = auth.uid() and
    couple_id in (select id from couples where user_a = auth.uid() or user_b = auth.uid())
  );

-- Push subscriptions
create table push_subscriptions (
  user_id uuid references profiles(id) primary key,
  subscription jsonb not null,
  updated_at timestamptz default now()
);
alter table push_subscriptions enable row level security;
create policy "Users manage own push sub" on push_subscriptions
  for all using (user_id = auth.uid());

-- Enable realtime on messages and call_signals
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table call_signals;
alter publication supabase_realtime add table profiles;
```

### Supabase Storage:
Create a bucket called `photos` with the following settings:
- Public: false (private bucket)
- File size limit: 10MB
- Allowed MIME types: image/jpeg, image/png, image/webp

---

## PROJECT STRUCTURE

```
twoofus/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx          # Protected layout, checks auth + couple pairing
│   │   ├── home/page.tsx       # Couple home screen
│   │   ├── chat/page.tsx       # Main chat screen
│   │   ├── call/page.tsx       # Voice/video call screen
│   │   └── settings/page.tsx   # Profile, anniversary, our song
│   ├── invite/[token]/page.tsx # Partner invite acceptance
│   ├── api/
│   │   ├── push/subscribe/route.ts
│   │   ├── push/send/route.ts
│   │   └── vapid-key/route.ts
│   ├── layout.tsx
│   ├── page.tsx                # Landing/redirect
│   └── globals.css
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   ├── chat/
│   │   ├── ChatWindow.tsx
│   │   ├── MessageBubble.tsx
│   │   ├── MessageInput.tsx
│   │   ├── TypingIndicator.tsx
│   │   ├── PhotoUploader.tsx
│   │   └── ReactionPicker.tsx
│   ├── call/
│   │   ├── CallScreen.tsx
│   │   ├── IncomingCallModal.tsx
│   │   └── VideoCall.tsx
│   ├── home/
│   │   ├── DaysCounter.tsx
│   │   ├── MoodSelector.tsx
│   │   ├── LastPhoto.tsx
│   │   └── MemoryWall.tsx
│   ├── shared/
│   │   ├── PresenceIndicator.tsx
│   │   ├── InstallPrompt.tsx
│   │   └── LoadingScreen.tsx
│   └── ui/
│       ├── Button.tsx
│       ├── Input.tsx
│       └── Modal.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   └── server.ts           # Server Supabase client
│   ├── crypto/
│   │   ├── keyManager.ts       # Key gen, storage, retrieval
│   │   └── e2ee.ts             # Encrypt/decrypt functions
│   ├── webrtc/
│   │   └── callManager.ts      # simple-peer WebRTC logic
│   ├── push/
│   │   └── pushManager.ts      # Push subscription logic
│   └── store/
│       ├── authStore.ts        # Zustand: user, couple, keys
│       └── chatStore.ts        # Zustand: messages, typing
├── hooks/
│   ├── useRealtimeMessages.ts
│   ├── usePresence.ts
│   ├── useCall.ts
│   └── usePhotoQuota.ts
├── types/
│   └── index.ts
├── public/
│   ├── manifest.json
│   ├── sw.js                   # Service worker (next-pwa generates)
│   ├── icons/                  # PWA icons: 192, 512, maskable
│   └── install-ios.png         # iOS install instruction image
├── next.config.js              # next-pwa config
├── vercel.json
└── .env.local
```

---

## KEY IMPLEMENTATION DETAILS

### 1. E2EE Key Management (`lib/crypto/keyManager.ts`)

```typescript
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64 } from 'tweetnacl-util';

const PRIVATE_KEY_STORAGE = 'twoofus_private_key';
const PUBLIC_KEY_STORAGE = 'twoofus_public_key';

export function generateKeyPair() {
  const keyPair = nacl.box.keyPair();
  const publicKeyB64 = encodeBase64(keyPair.publicKey);
  const secretKeyB64 = encodeBase64(keyPair.secretKey);
  localStorage.setItem(PRIVATE_KEY_STORAGE, secretKeyB64);
  localStorage.setItem(PUBLIC_KEY_STORAGE, publicKeyB64);
  return { publicKey: publicKeyB64, secretKey: secretKeyB64 };
}

export function getMyKeys() {
  const secretKey = localStorage.getItem(PRIVATE_KEY_STORAGE);
  const publicKey = localStorage.getItem(PUBLIC_KEY_STORAGE);
  if (!secretKey || !publicKey) return null;
  return {
    secretKey: decodeBase64(secretKey),
    publicKey: decodeBase64(publicKey)
  };
}

export function exportPrivateKey(): string {
  return localStorage.getItem(PRIVATE_KEY_STORAGE) || '';
}

export function importPrivateKey(b64: string) {
  const keyPair = nacl.box.keyPair.fromSecretKey(decodeBase64(b64));
  localStorage.setItem(PRIVATE_KEY_STORAGE, b64);
  localStorage.setItem(PUBLIC_KEY_STORAGE, encodeBase64(keyPair.publicKey));
}
```

### 2. E2EE Encrypt/Decrypt (`lib/crypto/e2ee.ts`)

```typescript
import nacl from 'tweetnacl';
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util';

export function encryptMessage(
  plaintext: string,
  theirPublicKey: Uint8Array,
  mySecretKey: Uint8Array
): { ciphertext: string; nonce: string } {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const messageUint8 = encodeUTF8(plaintext);
  const encrypted = nacl.box(messageUint8, nonce, theirPublicKey, mySecretKey);
  return {
    ciphertext: encodeBase64(encrypted),
    nonce: encodeBase64(nonce)
  };
}

export function decryptMessage(
  ciphertextB64: string,
  nonceB64: string,
  theirPublicKey: Uint8Array,
  mySecretKey: Uint8Array
): string | null {
  try {
    const ciphertext = decodeBase64(ciphertextB64);
    const nonce = decodeBase64(nonceB64);
    const decrypted = nacl.box.open(ciphertext, nonce, theirPublicKey, mySecretKey);
    if (!decrypted) return null;
    return decodeUTF8(decrypted);
  } catch {
    return null;
  }
}

export function encryptFile(
  fileBytes: Uint8Array
): { encrypted: Uint8Array; key: Uint8Array; nonce: Uint8Array } {
  const key = nacl.randomBytes(nacl.secretbox.keyLength);
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
  const encrypted = nacl.secretbox(fileBytes, nonce, key);
  return { encrypted, key, nonce };
}

export function encryptSymmetricKey(
  symKey: Uint8Array,
  theirPublicKey: Uint8Array,
  mySecretKey: Uint8Array
): { encryptedKey: string; keyNonce: string } {
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const encrypted = nacl.box(symKey, nonce, theirPublicKey, mySecretKey);
  return {
    encryptedKey: encodeBase64(encrypted),
    keyNonce: encodeBase64(nonce)
  };
}
```

### 3. Supabase Realtime Messages Hook (`hooks/useRealtimeMessages.ts`)

```typescript
'use client';
import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useChatStore } from '@/lib/store/chatStore';
import { decryptMessage } from '@/lib/crypto/e2ee';
import { getMyKeys } from '@/lib/crypto/keyManager';
import { decodeBase64 } from 'tweetnacl-util';

export function useRealtimeMessages(coupleId: string, partnerPublicKey: string) {
  const addMessage = useChatStore(s => s.addMessage);

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${coupleId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `couple_id=eq.${coupleId}`
      }, (payload) => {
        const msg = payload.new;
        const keys = getMyKeys();
        if (!keys) return;
        const plaintext = decryptMessage(
          msg.ciphertext,
          msg.nonce,
          decodeBase64(partnerPublicKey),
          keys.secretKey
        );
        if (plaintext) {
          addMessage({ ...msg, plaintext });
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [coupleId, partnerPublicKey]);
}
```

### 4. WebRTC Call Manager (`lib/webrtc/callManager.ts`)

```typescript
import SimplePeer from 'simple-peer';
import { supabase } from '@/lib/supabase/client';

export class CallManager {
  private peer: SimplePeer.Instance | null = null;
  private coupleId: string;
  private myId: string;
  private isVideo: boolean;

  constructor(coupleId: string, myId: string, isVideo: boolean) {
    this.coupleId = coupleId;
    this.myId = myId;
    this.isVideo = isVideo;
  }

  async startCall(localStream: MediaStream, onRemoteStream: (s: MediaStream) => void) {
    this.peer = new SimplePeer({ initiator: true, stream: localStream, trickle: true });
    this.setupPeer(onRemoteStream);
  }

  async answerCall(localStream: MediaStream, offer: any, onRemoteStream: (s: MediaStream) => void) {
    this.peer = new SimplePeer({ initiator: false, stream: localStream, trickle: true });
    this.setupPeer(onRemoteStream);
    this.peer.signal(offer);
  }

  signal(data: any) { this.peer?.signal(data); }

  private setupPeer(onRemoteStream: (s: MediaStream) => void) {
    this.peer!.on('signal', async (data) => {
      await supabase.from('call_signals').insert({
        couple_id: this.coupleId,
        caller_id: this.myId,
        type: data.type === 'offer' ? 'offer' : data.type === 'answer' ? 'answer' : 'ice',
        payload: data
      });
    });
    this.peer!.on('stream', onRemoteStream);
    this.peer!.on('error', (err) => console.error('WebRTC error:', err));
  }

  destroy() { this.peer?.destroy(); this.peer = null; }
}
```

### 5. Photo Upload with E2EE (`components/chat/PhotoUploader.tsx` logic)

```typescript
async function uploadEncryptedPhoto(file: File, coupleId: string, senderId: string, partnerPublicKey: string) {
  // 1. Read file as bytes
  const arrayBuffer = await file.arrayBuffer();
  const fileBytes = new Uint8Array(arrayBuffer);

  // 2. Encrypt file with symmetric key
  const { encrypted, key, nonce } = encryptFile(fileBytes);

  // 3. Encrypt symmetric key with partner's public key
  const myKeys = getMyKeys();
  const { encryptedKey, keyNonce } = encryptSymmetricKey(key, decodeBase64(partnerPublicKey), myKeys!.secretKey);

  // 4. Upload encrypted bytes to Supabase Storage
  const path = `${coupleId}/${Date.now()}.enc`;
  const blob = new Blob([encrypted]);
  await supabase.storage.from('photos').upload(path, blob, { contentType: 'application/octet-stream' });

  // 5. Store photo metadata in DB
  await supabase.from('photos').insert({
    couple_id: coupleId,
    sender_id: senderId,
    storage_path: path,
    encrypted_key: encryptedKey,
    nonce: encodeBase64(nonce),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  });

  // 6. Check and update quota
  const today = new Date().toISOString().split('T')[0];
  const { data: quota } = await supabase.from('photo_quota').select('*').eq('user_id', senderId).single();
  if (quota && quota.quota_date === today) {
    if (quota.count >= 5) throw new Error('Daily photo limit reached (5/5)');
    await supabase.from('photo_quota').update({ count: quota.count + 1 }).eq('user_id', senderId);
  } else {
    await supabase.from('photo_quota').upsert({ user_id: senderId, quota_date: today, count: 1 });
  }
}
```

### 6. PWA Config (`next.config.js`)

```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: { cacheName: 'supabase-cache', expiration: { maxEntries: 32, maxAgeSeconds: 24 * 60 * 60 } }
    }
  ]
});

module.exports = withPWA({
  reactStrictMode: true,
  images: { domains: ['your-supabase-project.supabase.co'] }
});
```

### 7. `public/manifest.json`

```json
{
  "name": "TwoOfUs",
  "short_name": "TwoOfUs",
  "description": "Your private universe",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#0a0a0a",
  "background_color": "#0a0a0a",
  "categories": ["lifestyle", "social"],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### 8. Presence Hook (`hooks/usePresence.ts`)

```typescript
export function usePresence(coupleId: string, myId: string) {
  const [partnerPresence, setPartnerPresence] = useState<'online' | 'offline'>('offline');

  useEffect(() => {
    const channel = supabase.channel(`presence:${coupleId}`, {
      config: { presence: { key: myId } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const partnerOnline = Object.keys(state).some(k => k !== myId);
        setPartnerPresence(partnerOnline ? 'online' : 'offline');
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: myId, online_at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(channel); };
  }, [coupleId, myId]);

  return partnerPresence;
}
```

---

## UI / DESIGN REQUIREMENTS

Design the UI to be **more modern and emotionally resonant than Instagram**. Here is the design system:

### Color Palette (Dark Mode First)
```css
:root {
  --bg-primary: #080808;
  --bg-secondary: #111111;
  --bg-card: #161616;
  --bg-input: #1e1e1e;
  --accent-primary: #ff4d6d;       /* Romantic red-pink */
  --accent-secondary: #ff8fa3;     /* Soft pink */
  --accent-glow: rgba(255, 77, 109, 0.3);
  --text-primary: #f8f8f8;
  --text-secondary: #888888;
  --text-muted: #444444;
  --border: #222222;
  --message-mine: linear-gradient(135deg, #ff4d6d, #c9184a);
  --message-theirs: #1e1e1e;
  --glass: rgba(255, 255, 255, 0.04);
  --blur: blur(20px);
}
```

### Typography
- **Display font:** `Fraunces` (Google Fonts) — for logo, headings, days counter
- **Body font:** `DM Sans` (Google Fonts) — for all UI text
- **Mono font:** `JetBrains Mono` — for timestamps

### Key UI Patterns
- **Glassmorphism cards** with `backdrop-filter: blur(20px)` and subtle borders
- **Message bubbles:** Pill-shaped, my messages on right with gradient, partner's on left with dark card
- **Typing indicator:** Three animated dots with bounce animation
- **Call screen:** Full-screen with radial gradient blur, floating control buttons
- **Home screen:** Full-bleed background photo (blurred partner's last photo), days counter in large serif, mood emojis
- **Scroll behavior:** Smooth scroll to bottom on new message
- **Micro-animations:** Message appear (slide up + fade), photo reveal (scale up), reaction pop (spring)
- **Navigation:** Bottom tab bar on mobile (5px border-radius, glass bg)
- **Install banner:** Custom animated banner at top for iOS, native prompt captured for Android

### Screens

1. **Landing / Onboarding** — Full-screen gradient with app name in serif, "Start your story" CTA
2. **Login / Signup** — Minimal floating card, email + password, glass effect
3. **Pairing Screen** — After signup, show invite link with copy button + QR code
4. **Home** — Couple home with days counter, mood, last photo, memory
5. **Chat** — Full-screen chat with bottom input, media button, call button in header
6. **Call Screen** — Full-screen video/audio with floating controls
7. **Settings** — Profile edit, anniversary date, export keys, our song link

---

## ROUTING & AUTH FLOW

```
/ → if not authed → /login
    if authed + no couple → /pair
    if authed + has couple → /home

/login → /signup
/signup → generates keys → creates profile → /pair
/pair → shows invite link
/invite/[token] → accepts invite → joins couple → /home
/home → couple dashboard
/chat → main chat
/call → call screen (query: ?type=audio|video)
/settings → settings
```

---

## VERCEL DEPLOYMENT

Create `vercel.json`:
```json
{
  "buildCommand": "next build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "regions": ["sin1"],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" },
        { "key": "Service-Worker-Allowed", "value": "/" }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    }
  ]
}
```

---

## WHAT TO BUILD — STEP BY STEP

Build in this order:

1. **Project scaffold** — Next.js 14 + Tailwind + TypeScript setup with all dependencies installed:
   `npm install @supabase/supabase-js @supabase/auth-helpers-nextjs tweetnacl tweetnacl-util simple-peer zustand next-pwa web-push`

2. **Supabase client** — `/lib/supabase/client.ts` and `/lib/supabase/server.ts`

3. **Auth pages** — Login and Signup with Supabase email auth. On signup: generate nacl key pair, store private key in localStorage, store public key in Supabase profiles table.

4. **Pairing system** — Create couple record with invite_token (crypto.randomUUID()), generate shareable `/invite/[token]` link, handle acceptance.

5. **E2EE crypto utils** — All functions from the keyManager.ts and e2ee.ts above.

6. **Chat screen** — Full realtime E2EE chat with Supabase Realtime subscriptions, message input, send/receive, read receipts, typing indicators via presence channels.

7. **Photo upload** — E2EE photo upload with 5/day quota, display in chat as image cards with decrypt-on-view.

8. **Home screen** — Days together counter, mood selector (updates Supabase profile), last photo tile, our song link.

9. **WebRTC calls** — Voice and video call using simple-peer + Supabase signaling. Incoming call modal with push notification.

10. **Push notifications** — VAPID key setup, Web Push subscription stored in Supabase, Edge Function to send notifications.

11. **PWA setup** — next-pwa config, manifest.json, icons, iOS install banner component, Android beforeinstallprompt capture.

12. **Settings** — Profile edit, anniversary date picker, our song URL, private key export/import backup.

13. **Polish** — All animations, transitions, loading states, empty states, error toasts.

14. **Vercel config** — vercel.json, env vars documentation, deployment README.

---

## IMPORTANT NOTES

- Never send the private key to the server. It lives only in localStorage.
- If localStorage is cleared, show a "Restore key backup" option to import their downloaded key file.
- Use Supabase RLS on EVERY table — test that a user cannot read another couple's data.
- Photos must be decrypted on the client side before displaying. Never store plaintext.
- The app must work offline for reading cached messages (service worker caching).
- Use `navigator.mediaDevices.getUserMedia` for camera/mic access — handle permission denied gracefully.
- For iOS PWA: add `<meta name="apple-mobile-web-app-capable" content="yes">` and splash screens.
- All dates/times in UTC, display in user's local timezone.
- Implement skeleton loaders for all async data — no blank flashes.

Build the complete, working application with all of the above. Every file should be production-ready, typed, and styled. The end result should feel like a premium product.
```

---
*End of prompt. Paste the content between the triple backticks into Claude Antigravity.*
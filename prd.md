# 📄 Product Requirements Document
## App Name: **TwoOfUs** — A Private Universe for Two

**Version:** 1.0  
**Author:** Generated via Claude  
**Date:** May 2026  
**Platform:** Progressive Web App (PWA) — installable on iOS & Android directly from browser, deployed on Vercel  
**Backend:** Supabase (Auth + DB + Realtime + Storage)  
**Encryption:** End-to-End Encrypted (E2EE) via libsodium / tweetnacl  

---

## 1. Overview

TwoOfUs is a private, intimate real-time communication app built exclusively for two people — a couple. It is more visually refined and emotionally resonant than Instagram or iMessage. It supports instant messaging, voice calls, video calls, live photo sharing with a daily limit, and is end-to-end encrypted by default.

The app is a **PWA** — meaning it is accessed via the browser but can be installed directly to the iOS/Android home screen like a native app (no App Store needed). Deployed fully on **Vercel**, with **Supabase** as the sole backend.

---

## 2. Goals

- Give couples a **private, beautiful space** to communicate — no ads, no other users, no noise.
- Achieve **feature parity with modern chat apps** (messages, calls, video, photos) with **superior aesthetics**.
- Be fully **installable on mobile** without needing native app stores.
- Be **end-to-end encrypted** — Supabase stores only ciphertext; nobody else can read your messages.
- Be **deployable in one click** on Vercel with Supabase as the only external dependency.

---

## 3. Target Users

- **Primary:** Two people in a romantic relationship, typically long-distance or who want a dedicated private communication channel.
- **Secondary:** Best friends or close partners who want a private, beautiful shared space.

---

## 4. Authentication

- **Provider:** Supabase Auth — Email/Password only.
- On first signup, each user generates an **asymmetric key pair** (public + private key via TweetNaCl/libsodium).
- Private key is stored **only in the browser** (localStorage, never sent to server).
- Public key is stored in Supabase `profiles` table.
- **Pairing:** After both users sign up, User A sends an invite link (deep link with a token). User B accepts. This creates a `couple` record in Supabase linking both `user_id`s. Once paired, the app is locked to these two users only — no new pairings allowed.
- The invite link expires in 24 hours.

---

## 5. Features

### 5.1 Instant Messaging (Chat)

| Attribute | Detail |
|-----------|--------|
| Protocol | Supabase Realtime (Postgres changes) |
| Encryption | E2EE — messages encrypted with partner's public key before sending |
| Message types | Text, emoji, reactions (heart, fire, laughing, sad), reply-to, deleted messages |
| Read receipts | ✅ Yes — "Seen" with timestamp |
| Typing indicator | ✅ Yes — via Supabase Realtime presence |
| Message persistence | ✅ Stored in Supabase (encrypted ciphertext only) |
| Timestamps | Relative ("just now", "2m ago") with full datetime on hover |
| Offline support | Message queue — sends when reconnected |

### 5.2 Voice Calls

| Attribute | Detail |
|-----------|--------|
| Technology | WebRTC (peer-to-peer) via simple-peer or Agora Free Tier |
| Signaling | Supabase Realtime (offer/answer/ICE exchange) |
| STUN servers | Google STUN (free) |
| TURN fallback | Metered.ca free TURN or Twilio STUN/TURN |
| UI | Full-screen call screen with animated waveform, mute, end call |
| Notifications | PWA push notification for incoming call |

### 5.3 Video Calls

| Attribute | Detail |
|-----------|--------|
| Technology | WebRTC — same as voice with video stream enabled |
| UI | Picture-in-picture for self, full screen for partner |
| Controls | Mute audio, toggle video, flip camera (mobile), end call |
| Quality | Adaptive bitrate |
| Background blur | Optional (via TensorFlow.js BodyPix or MediaPipe, if performance allows) |

### 5.4 Live Photo Sharing (Limited)

| Attribute | Detail |
|-----------|--------|
| Daily limit | **5 photos per person per day** (resets at midnight UTC) |
| Upload | Direct to Supabase Storage (encrypted before upload) |
| Delivery | Appears in chat as a full-bleed image card |
| Expiry | Photos auto-delete from storage after **7 days** (Supabase Storage lifecycle policy) |
| Counter | UI shows "3/5 photos used today" |
| Format | JPEG/PNG/HEIC (converted to JPEG on client before upload) |
| Compression | Client-side resize to max 1920px before upload |

### 5.5 Presence & Status

- **Online/Offline** indicator (green dot / grey dot)
- **Last seen** timestamp when offline
- **Typing...** indicator in chat
- **In a call** status badge

### 5.6 Push Notifications (PWA)

- New message
- Incoming call (with Accept/Decline actions)
- Photo received
- Partner came online

Implemented via the **Web Push API** + Supabase Edge Function as the push sender.

### 5.7 Shared Space / Home Screen

- A beautiful **home screen** unique to the couple — shows:
  - Days together counter (set on pairing date)
  - Last photo shared (blurred, tap to reveal)
  - Mood status (each person can set: 🥰 😴 😭 🔥 etc.)
  - A pinned "our song" — a YouTube/Spotify link that autoplays softly
  - Memory wall — random past photo from the archive

---

## 6. End-to-End Encryption Design

### Key Generation (on first login)
```
const { publicKey, secretKey } = nacl.box.keyPair();
// secretKey stored in localStorage (never leaves device)
// publicKey stored in Supabase profiles table
```

### Encrypting a Message (before sending)
```
const partnerPublicKey = fetchedFromSupabase;
const nonce = nacl.randomBytes(nacl.box.nonceLength);
const ciphertext = nacl.box(message, nonce, partnerPublicKey, mySecretKey);
// Store ciphertext + nonce in Supabase
```

### Decrypting on Receipt
```
const plaintext = nacl.box.open(ciphertext, nonce, partnerPublicKey, mySecretKey);
```

### Photos
- Photo is encrypted with a random symmetric key (nacl.secretbox)
- Symmetric key is then encrypted with partner's public key (nacl.box)
- Both are uploaded to Supabase Storage / DB

> ⚠️ Important: If a user loses their device/localStorage, message history is unrecoverable by design (true E2EE). Offer an optional "export key backup" flow where users can download their private key as a file.

---

## 7. Database Schema (Supabase)

### `profiles`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | = auth.users.id |
| display_name | text | |
| avatar_url | text | Supabase Storage URL |
| public_key | text | Base64 nacl public key |
| mood | text | Emoji mood |
| created_at | timestamptz | |

### `couples`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | |
| user_a | uuid | FK profiles.id |
| user_b | uuid | FK profiles.id |
| paired_at | timestamptz | |
| anniversary_date | date | User-set |
| our_song_url | text | |

### `messages`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | |
| couple_id | uuid | FK couples.id |
| sender_id | uuid | FK profiles.id |
| ciphertext | text | Base64 nacl ciphertext |
| nonce | text | Base64 nacl nonce |
| type | enum | 'text', 'photo', 'reaction' |
| reply_to | uuid | nullable FK messages.id |
| seen_at | timestamptz | nullable |
| deleted_at | timestamptz | nullable (soft delete) |
| created_at | timestamptz | |

### `photos`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | |
| couple_id | uuid | |
| sender_id | uuid | |
| storage_path | text | Supabase Storage path |
| encrypted_key | text | Symmetric key encrypted with partner pubkey |
| nonce | text | |
| expires_at | timestamptz | created_at + 7 days |
| created_at | timestamptz | |

### `photo_quota`
| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid | |
| date | date | UTC date |
| count | int | max 5 |

### `call_signals`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | |
| couple_id | uuid | |
| caller_id | uuid | |
| type | enum | 'offer','answer','ice','end' |
| payload | jsonb | SDP / ICE candidate |
| created_at | timestamptz | |

### `push_subscriptions`
| Column | Type | Notes |
|--------|------|-------|
| user_id | uuid | |
| subscription | jsonb | Web Push subscription object |

---

## 8. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS + custom CSS variables |
| State | Zustand |
| Realtime | Supabase Realtime (channels + presence) |
| Auth | Supabase Auth (email/password) |
| Database | Supabase Postgres |
| Storage | Supabase Storage |
| E2EE | TweetNaCl.js (nacl-fast) |
| WebRTC | simple-peer |
| Push | Web Push API + Supabase Edge Function |
| PWA | next-pwa + Web App Manifest |
| Deployment | Vercel |
| Domain | Custom (optional) or vercel.app subdomain |

---

## 9. PWA Installation Flow

### iOS (Safari)
1. User opens the URL in Safari.
2. App shows a custom **"Add to Home Screen"** banner with animation.
3. Tapping shows step-by-step: Share → Add to Home Screen.
4. App icon, splash screen, and standalone mode all configured in `manifest.json`.

### Android (Chrome)
1. Chrome shows native **"Add to Home Screen"** / "Install App" prompt.
2. App captures `beforeinstallprompt` event and shows a beautiful custom install button.
3. After install, launches in standalone mode (no browser chrome).

### Manifest Config
```json
{
  "name": "TwoOfUs",
  "short_name": "TwoOfUs",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#0a0a0a",
  "background_color": "#0a0a0a",
  "start_url": "/",
  "icons": [/* 192x192, 512x512, maskable */]
}
```

---

## 10. Vercel Deployment

- Single `vercel.json` config
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- Edge Functions via Vercel API routes (for push notifications)
- No Docker, no separate server — fully serverless

---

## 11. Security Considerations

- All messages: E2EE — server sees only ciphertext
- Supabase RLS (Row Level Security) enforced on all tables — users can only read their couple's data
- Photo URLs: signed URLs with 1-hour expiry (Supabase Storage)
- Auth tokens: Supabase JWT, rotated automatically
- No message content logged anywhere
- Rate limiting on photo upload endpoint (Edge Function)
- CORS locked to app domain

---



## 13. Success Metrics

| Metric | Target |
|--------|--------|
| Message delivery latency | < 200ms (Supabase Realtime) |
| App install rate (PWA) | > 60% of users who visit |
| Daily active sessions | Both users open app daily |
| Photo feature daily usage | > 3 photos/day per couple |
| Call connection success rate | > 95% |

---
*Built with love. For two people only.* 💌
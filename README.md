# 💌 TwoOfUs — Complete Project Documentation

> **A private, end-to-end encrypted real-time communication app for two people.**
> More modern than Instagram. Built on Next.js + Supabase. Deployed on Vercel. Installable as a PWA on iOS & Android.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Architecture Diagram](#3-architecture-diagram)
4. [Repository Structure](#4-repository-structure)
5. [Environment Variables](#5-environment-variables)
6. [Supabase Setup](#6-supabase-setup)
   - [Database Schema](#61-database-schema)
   - [RLS Policies](#62-rls-policies)
   - [Storage Buckets](#63-storage-buckets)
   - [Realtime Config](#64-realtime-config)
7. [End-to-End Encryption](#7-end-to-end-encryption)
8. [Feature Specifications](#8-feature-specifications)
   - [Auth & Pairing](#81-auth--pairing)
   - [Instant Messaging](#82-instant-messaging)
   - [Photo Sharing](#83-photo-sharing)
   - [Voice Calls](#84-voice-calls)
   - [Video Calls](#85-video-calls)
   - [Presence & Typing](#86-presence--typing)
   - [Push Notifications](#87-push-notifications)
   - [Home Screen](#88-home-screen)
9. [PWA Configuration](#9-pwa-configuration)
10. [Design System](#10-design-system)
11. [API Routes](#11-api-routes)
12. [Deployment Guide](#12-deployment-guide)
13. [Testing Guide](#13-testing-guide)
14. [Security Model](#14-security-model)
15. [Known Limitations](#15-known-limitations)
16. [Roadmap](#16-roadmap)
17. [Prompts Reference](#17-prompts-reference)

---

## 1. Project Overview

**TwoOfUs** is a zero-noise, private communication app designed exclusively for two people. There are no groups, no ads, no followers, no stories for the world. Just one person, their partner, and a beautiful shared space.

### Core Principles
- **Private by design** — Only two accounts can ever exist in one "universe". No third person can join.
- **Encrypted by default** — End-to-end encrypted using NaCl box encryption. Supabase stores only ciphertext. Even Supabase admins cannot read your messages.
- **Installable anywhere** — A PWA that installs directly from Safari (iOS) or Chrome (Android) without any App Store.
- **No backend to manage** — Supabase handles everything. Deployed to Vercel. Zero DevOps.
- **More beautiful than Instagram** — Dark luxury aesthetic, cinematic typography, micro-animations throughout.

### What it does
| Feature | Status |
|---------|--------|
| Email auth (Supabase) | ✅ |
| Two-person pairing via invite link | ✅ |
| End-to-end encrypted messages | ✅ |
| Real-time delivery (Supabase Realtime) | ✅ |
| Read receipts + typing indicator | ✅ |
| Message reactions | ✅ |
| Reply to messages | ✅ |
| E2EE photo sharing (5/day, 7-day expiry) | ✅ |
| WebRTC voice calls | ✅ |
| WebRTC video calls | ✅ |
| Push notifications (Web Push) | ✅ |
| Couple home screen (days counter, moods) | ✅ |
| Private key backup / restore | ✅ |
| PWA — iOS + Android installable | ✅ |
| Vercel deployment | ✅ |

---

## 2. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Framework | Next.js 14 (App Router, TypeScript) | RSC + streaming, easy Vercel deploy |
| Styling | Tailwind CSS + CSS custom properties | Speed + theming control |
| Auth | Supabase Auth (email/password) | Simple, no extra service |
| Database | Supabase Postgres | Realtime, RLS, single backend |
| Realtime | Supabase Realtime (channels + presence) | Built-in, no Socket.io needed |
| File Storage | Supabase Storage | Co-located, signed URLs |
| E2EE | TweetNaCl.js (`tweetnacl`) | Battle-tested, fast, tiny |
| WebRTC | `simple-peer` | Minimal wrapper over browser WebRTC |
| State | Zustand | Lightweight, no boilerplate |
| Push | Web Push API + Supabase Edge Function | No FCM/APNs account needed |
| PWA | `next-pwa` | Service worker + manifest generation |
| Deployment | Vercel | Zero-config Next.js deployment |

### Dependencies
```bash
# Core
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs

# Encryption
npm install tweetnacl tweetnacl-util

# WebRTC
npm install simple-peer
npm install -D @types/simple-peer

# State
npm install zustand

# PWA
npm install next-pwa

# Push notifications (server-side)
npm install web-push
npm install -D @types/web-push

# Utilities
npm install date-fns clsx tailwind-merge
```

---

## 3. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        USER DEVICES                         │
│                                                             │
│   ┌──────────────────┐         ┌──────────────────┐        │
│   │   User A (PWA)   │         │   User B (PWA)   │        │
│   │  iPhone/Android  │         │  iPhone/Android  │        │
│   │                  │         │                  │        │
│   │ Private Key 🔑   │         │ Private Key 🔑   │        │
│   │ (localStorage)   │         │ (localStorage)   │        │
│   └────────┬─────────┘         └────────┬─────────┘        │
│            │                            │                   │
└────────────┼────────────────────────────┼───────────────────┘
             │                            │
             │  HTTPS (all traffic)       │
             │                            │
┌────────────▼────────────────────────────▼───────────────────┐
│                         VERCEL                              │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │              Next.js 14 App                         │  │
│   │                                                     │  │
│   │  /app pages        /api routes (Edge Functions)     │  │
│   │  - /login          - /api/push/subscribe            │  │
│   │  - /signup         - /api/push/send                 │  │
│   │  - /home           - /api/vapid-key                 │  │
│   │  - /chat                                            │  │
│   │  - /call                                            │  │
│   │  - /invite/[token]                                  │  │
│   └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ Supabase JS Client
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                       SUPABASE                              │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │   Auth       │  │  Postgres DB │  │  Storage         │  │
│  │              │  │              │  │                  │  │
│  │ email/pass   │  │ profiles     │  │ photos/ bucket   │  │
│  │ JWT tokens   │  │ couples      │  │ (encrypted bin)  │  │
│  │              │  │ messages     │  │                  │  │
│  │              │  │ photos       │  │                  │  │
│  │              │  │ call_signals │  │                  │  │
│  │              │  │ push_subs    │  │                  │  │
│  └──────────────┘  └──────┬───────┘  └──────────────────┘  │
│                           │                                 │
│                    ┌──────▼───────┐                         │
│                    │  Realtime    │                         │
│                    │  (WebSocket) │                         │
│                    │              │                         │
│                    │ messages     │                         │
│                    │ call_signals │                         │
│                    │ presence     │                         │
│                    └──────────────┘                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

E2EE DATA FLOW:
─────────────────────────────────────────────────────────────
User A types "I love you"
    → encrypt with User B's public key + User A's private key (NaCl box)
    → send ciphertext + nonce to Supabase
    → Supabase stores ONLY ciphertext (cannot read it)
    → Realtime pushes ciphertext to User B
    → User B decrypts with User B's private key + User A's public key
    → "I love you" appears on User B's screen
─────────────────────────────────────────────────────────────

WebRTC CALL FLOW:
─────────────────────────────────────────────────────────────
User A initiates call
    → Creates SimplePeer (initiator: true)
    → Peer generates SDP offer
    → Offer stored in call_signals (Supabase)
    → Realtime delivers offer to User B
    → User B creates SimplePeer (initiator: false), signals offer
    → Peer generates SDP answer
    → Answer stored in call_signals
    → ICE candidates exchanged same way
    → P2P audio/video connection established ✅
─────────────────────────────────────────────────────────────
```

---

## 4. Repository Structure

```
twoofus/
│
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Unauthenticated routes
│   │   ├── login/
│   │   │   └── page.tsx
│   │   └── signup/
│   │       └── page.tsx
│   │
│   ├── (app)/                        # Authenticated routes (protected layout)
│   │   ├── layout.tsx                # Auth guard + couple check
│   │   ├── home/
│   │   │   └── page.tsx              # Couple home screen
│   │   ├── chat/
│   │   │   └── page.tsx              # Main chat
│   │   ├── call/
│   │   │   └── page.tsx              # Voice/video call
│   │   └── settings/
│   │       └── page.tsx              # Profile & settings
│   │
│   ├── invite/
│   │   └── [token]/
│   │       └── page.tsx              # Partner invite acceptance
│   │
│   ├── api/
│   │   ├── push/
│   │   │   ├── subscribe/
│   │   │   │   └── route.ts          # Save push subscription
│   │   │   └── send/
│   │   │       └── route.ts          # Send push notification
│   │   └── vapid-key/
│   │       └── route.ts              # Return public VAPID key
│   │
│   ├── layout.tsx                    # Root layout (fonts, metadata, manifest link)
│   ├── page.tsx                      # Root redirect (→ /home or /login)
│   └── globals.css                   # CSS custom properties + base styles
│
├── components/
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   └── SignupForm.tsx
│   │
│   ├── chat/
│   │   ├── ChatWindow.tsx            # Full chat container + realtime subscription
│   │   ├── MessageBubble.tsx         # Single message (mine/theirs/photo/reaction)
│   │   ├── MessageInput.tsx          # Text input + send + photo button
│   │   ├── TypingIndicator.tsx       # Animated dots
│   │   ├── PhotoUploader.tsx         # E2EE photo upload flow
│   │   ├── ReactionPicker.tsx        # Emoji reaction sheet
│   │   └── MessageActionSheet.tsx    # Long-press menu (reply, react, delete)
│   │
│   ├── call/
│   │   ├── CallScreen.tsx            # Active call UI (audio + video)
│   │   ├── IncomingCallModal.tsx     # Accept / Decline UI
│   │   └── CallControls.tsx          # Mute, video, flip, end buttons
│   │
│   ├── home/
│   │   ├── DaysCounter.tsx           # Days together hero number
│   │   ├── MoodSelector.tsx          # Emoji mood picker + display
│   │   ├── LastPhoto.tsx             # Blurred last shared photo
│   │   ├── OurSong.tsx               # Song card with link
│   │   └── MemoryWall.tsx            # Random past photo display
│   │
│   ├── shared/
│   │   ├── PresenceIndicator.tsx     # Online/offline dot + last seen
│   │   ├── InstallPrompt.tsx         # iOS banner + Android beforeinstallprompt
│   │   ├── KeyRestorePrompt.tsx      # Shown when private key missing
│   │   ├── LoadingScreen.tsx         # Splash loader
│   │   └── BottomNav.tsx             # Mobile navigation bar
│   │
│   └── ui/                           # Primitive UI components
│       ├── Button.tsx
│       ├── Input.tsx
│       ├── Modal.tsx
│       ├── Toast.tsx
│       └── Avatar.tsx
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                 # Browser Supabase client (createClientComponentClient)
│   │   └── server.ts                 # Server Supabase client (createServerComponentClient)
│   │
│   ├── crypto/
│   │   ├── keyManager.ts             # Key gen, localStorage get/set, export, import
│   │   └── e2ee.ts                   # encryptMessage, decryptMessage, encryptFile, etc.
│   │
│   ├── webrtc/
│   │   └── callManager.ts            # SimplePeer wrapper + Supabase signaling
│   │
│   ├── push/
│   │   └── pushManager.ts            # Subscribe to Web Push, store in Supabase
│   │
│   └── store/
│       ├── authStore.ts              # Zustand: user, couple, partnerProfile
│       └── chatStore.ts              # Zustand: messages[], typing state
│
├── hooks/
│   ├── useRealtimeMessages.ts        # Subscribe to messages channel
│   ├── usePresence.ts                # Track online/offline presence
│   ├── useCall.ts                    # Incoming call detection + WebRTC setup
│   ├── usePhotoQuota.ts              # Fetch + track daily photo quota
│   └── useInstallPrompt.ts           # Capture beforeinstallprompt event
│
├── types/
│   └── index.ts                      # All TypeScript types and interfaces
│
├── public/
│   ├── manifest.json                 # PWA manifest
│   ├── sw.js                         # Service worker (generated by next-pwa)
│   └── icons/
│       ├── icon-192.png
│       ├── icon-512.png
│       └── icon-512-maskable.png
│
├── supabase/
│   └── schema.sql                    # Full SQL schema (copy-paste into Supabase editor)
│
├── .env.local                        # Local environment variables (never commit)
├── .env.example                      # Template for env vars
├── next.config.js                    # Next.js + next-pwa config
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
└── README.md
```

---

## 5. Environment Variables

### `.env.example`
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here   # NEVER expose to client

# Web Push (VAPID)
# Generate with: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key               # Server only

# App
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

> ⚠️ `SUPABASE_SERVICE_ROLE_KEY` and `VAPID_PRIVATE_KEY` must NEVER be prefixed with `NEXT_PUBLIC_`. They are server-only secrets.

---

## 6. Supabase Setup

### 6.1 Database Schema

Run the following SQL in your Supabase project → SQL Editor:

```sql
-- =============================================
-- TwoOfUs — Full Database Schema
-- Run this in Supabase SQL Editor
-- =============================================

create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- PROFILES
-- ─────────────────────────────────────────────
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null,
  avatar_url text,
  public_key text not null,       -- Base64 NaCl public key (safe to store)
  mood text default '🥰',
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- COUPLES
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- MESSAGES
-- ─────────────────────────────────────────────
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

-- ─────────────────────────────────────────────
-- PHOTOS
-- ─────────────────────────────────────────────
create table photos (
  id uuid default uuid_generate_v4() primary key,
  couple_id uuid references couples(id) on delete cascade not null,
  sender_id uuid references profiles(id) not null,
  storage_path text not null,
  encrypted_key text not null,    -- Symmetric key encrypted with partner's NaCl pubkey
  nonce text not null,
  expires_at timestamptz not null,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- PHOTO QUOTA
-- ─────────────────────────────────────────────
create table photo_quota (
  user_id uuid references profiles(id) primary key,
  quota_date date not null,
  count int default 0,
  constraint max_five check (count <= 5)
);

-- ─────────────────────────────────────────────
-- CALL SIGNALS (WebRTC Signaling)
-- ─────────────────────────────────────────────
create table call_signals (
  id uuid default uuid_generate_v4() primary key,
  couple_id uuid references couples(id) on delete cascade not null,
  caller_id uuid references profiles(id) not null,
  type text not null check (type in ('offer', 'answer', 'ice', 'end', 'reject')),
  payload jsonb not null,
  created_at timestamptz default now()
);

-- ─────────────────────────────────────────────
-- PUSH SUBSCRIPTIONS
-- ─────────────────────────────────────────────
create table push_subscriptions (
  user_id uuid references profiles(id) primary key,
  subscription jsonb not null,
  updated_at timestamptz default now()
);
```

### 6.2 RLS Policies

```sql
-- ─────────────────────────────────────────────
-- RLS: PROFILES
-- ─────────────────────────────────────────────
alter table profiles enable row level security;

create policy "profiles_select" on profiles for select
  using (
    id = auth.uid()
    or id in (
      select case when user_a = auth.uid() then user_b else user_a end
      from couples
      where user_a = auth.uid() or user_b = auth.uid()
    )
  );

create policy "profiles_insert" on profiles for insert
  with check (id = auth.uid());

create policy "profiles_update" on profiles for update
  using (id = auth.uid());

-- ─────────────────────────────────────────────
-- RLS: COUPLES
-- ─────────────────────────────────────────────
alter table couples enable row level security;

create policy "couples_select" on couples for select
  using (user_a = auth.uid() or user_b = auth.uid());

create policy "couples_insert" on couples for insert
  with check (user_a = auth.uid());

create policy "couples_update" on couples for update
  using (user_a = auth.uid() or user_b = auth.uid());

-- Allow unauthenticated read of invite token (for invite link flow)
create policy "couples_invite_read" on couples for select
  using (true);  -- restrict to invite_token lookup only in app logic

-- ─────────────────────────────────────────────
-- RLS: MESSAGES
-- ─────────────────────────────────────────────
alter table messages enable row level security;

create policy "messages_select" on messages for select
  using (
    couple_id in (
      select id from couples
      where user_a = auth.uid() or user_b = auth.uid()
    )
  );

create policy "messages_insert" on messages for insert
  with check (
    sender_id = auth.uid()
    and couple_id in (
      select id from couples
      where user_a = auth.uid() or user_b = auth.uid()
    )
  );

create policy "messages_update" on messages for update
  using (sender_id = auth.uid());

-- ─────────────────────────────────────────────
-- RLS: PHOTOS
-- ─────────────────────────────────────────────
alter table photos enable row level security;

create policy "photos_select" on photos for select
  using (
    couple_id in (
      select id from couples
      where user_a = auth.uid() or user_b = auth.uid()
    )
  );

create policy "photos_insert" on photos for insert
  with check (
    sender_id = auth.uid()
    and couple_id in (
      select id from couples
      where user_a = auth.uid() or user_b = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- RLS: PHOTO QUOTA
-- ─────────────────────────────────────────────
alter table photo_quota enable row level security;

create policy "quota_all" on photo_quota for all
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- RLS: CALL SIGNALS
-- ─────────────────────────────────────────────
alter table call_signals enable row level security;

create policy "signals_select" on call_signals for select
  using (
    couple_id in (
      select id from couples
      where user_a = auth.uid() or user_b = auth.uid()
    )
  );

create policy "signals_insert" on call_signals for insert
  with check (
    caller_id = auth.uid()
    and couple_id in (
      select id from couples
      where user_a = auth.uid() or user_b = auth.uid()
    )
  );

-- ─────────────────────────────────────────────
-- RLS: PUSH SUBSCRIPTIONS
-- ─────────────────────────────────────────────
alter table push_subscriptions enable row level security;

create policy "push_all" on push_subscriptions for all
  using (user_id = auth.uid());

-- ─────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table call_signals;
alter publication supabase_realtime add table profiles;
```

### 6.3 Storage Buckets

In Supabase Dashboard → Storage → New Bucket:

| Setting | Value |
|---------|-------|
| Name | `photos` |
| Public | ❌ No |
| File size limit | 10 MB |
| Allowed MIME types | `image/jpeg, image/png, image/webp` |

Storage RLS (add in SQL Editor):
```sql
create policy "Couple members can upload photos"
  on storage.objects for insert
  with check (
    bucket_id = 'photos'
    and auth.uid() is not null
  );

create policy "Couple members can read their photos"
  on storage.objects for select
  using (
    bucket_id = 'photos'
    and auth.uid() is not null
  );
```

### 6.4 Realtime Config

In Supabase Dashboard → Database → Replication:
- Enable replication for: `messages`, `call_signals`, `profiles`

---

## 7. End-to-End Encryption

### How it works

TwoOfUs uses **NaCl Box encryption** (X25519 + XSalsa20 + Poly1305) via TweetNaCl.js.

```
Key Setup (once, on signup):
─────────────────────────────
User generates key pair:
  public_key  → stored in Supabase profiles (safe, everyone can see)
  private_key → stored ONLY in localStorage (never sent to server)

Sending a message:
─────────────────────────────
plaintext = "I love you"
nonce     = nacl.randomBytes(24)   ← unique per message
encrypted = nacl.box(plaintext, nonce, partner_public_key, my_private_key)
→ Store { ciphertext: encrypted, nonce } in Supabase

Receiving a message:
─────────────────────────────
plaintext = nacl.box.open(ciphertext, nonce, sender_public_key, my_private_key)
→ Display plaintext in UI

Photo encryption:
─────────────────────────────
sym_key   = nacl.randomBytes(32)                          ← random per photo
encrypted_photo = nacl.secretbox(photo_bytes, nonce, sym_key)
encrypted_sym_key = nacl.box(sym_key, nonce2, partner_pubkey, my_privkey)
→ Upload encrypted_photo to Supabase Storage
→ Store { encrypted_key, nonce } in photos table
```

### What Supabase stores

| Data | In Supabase | Readable by Supabase? |
|------|-------------|----------------------|
| Message content | `ciphertext` (base64) | ❌ No |
| Message nonce | `nonce` (base64) | ❌ Not useful alone |
| Photo file | Encrypted binary | ❌ No |
| Photo sym key | Encrypted with partner pubkey | ❌ No |
| Your private key | **Never sent** | ❌ Never |
| Your public key | `profiles.public_key` | ✅ Yes (safe by design) |

### Key Recovery

If a user loses their device or clears localStorage:
1. App detects missing private key on login
2. Shows "Restore Key Backup" screen
3. User uploads their previously downloaded `.key` file
4. Key imported back into localStorage
5. All historical messages decrypt again

> Without the private key backup file, historical messages are **permanently unrecoverable**. This is intentional — true E2EE.

---

## 8. Feature Specifications

### 8.1 Auth & Pairing

**Signup flow:**
1. User enters email + password
2. Supabase Auth creates account
3. App generates NaCl key pair → stores private key in localStorage
4. Creates `profiles` record with public key
5. Creates `couples` record with `user_a = user.id`, `invite_token = randomUUID()`, `invite_expires_at = now() + 24h`
6. Redirects to `/pair`

**Pairing flow:**
1. User A shares `/invite/[token]` link with partner
2. User B opens link → signs up (or logs in)
3. App updates `couples` record: `user_b = user.id`, `paired_at = now()`
4. Both users redirected to `/home`

**Guards:**
- User cannot create a second couple if already paired
- Cannot pair with themselves
- Expired tokens rejected
- Used tokens rejected

### 8.2 Instant Messaging

- **Protocol:** Supabase Realtime postgres_changes subscription
- **Encryption:** NaCl box per message (unique nonce)
- **Types:** text, photo reference, reaction
- **Features:** reply-to, soft delete, emoji reactions, read receipts, typing presence
- **Pagination:** Last 50 messages loaded on open, infinite scroll for history
- **Offline:** Messages queued in Zustand store, flushed on reconnect

### 8.3 Photo Sharing

- **Limit:** 5 photos per user per UTC day
- **Expiry:** Photos deleted from storage after 7 days
- **Encryption:** Symmetric key (NaCl secretbox) + key encrypted with partner's public key
- **Compression:** Client-side resize to max 1920px before encryption
- **Display:** Tap to view full-screen, pinch to zoom

### 8.4 Voice Calls

- **Technology:** WebRTC via `simple-peer`
- **Signaling:** Supabase Realtime on `call_signals` table
- **STUN:** `stun:stun.l.google.com:19302`
- **TURN:** Metered.ca free tier (configure in `callManager.ts`)
- **Flow:** offer → answer → ICE exchange → P2P audio

### 8.5 Video Calls

- Same as voice + `video: true` in getUserMedia constraints
- PiP self-view (90px circle, draggable)
- Controls: mute, toggle video, flip camera, end

### 8.6 Presence & Typing

- **Presence:** Supabase channel presence (`channel.track()`)
- **Typing:** Debounced (500ms) presence update with `typing: true` flag
- **Display:** Partner's typing shows animated 3-dot indicator

### 8.7 Push Notifications

- **API:** Web Push (VAPID)
- **Subscription stored in:** `push_subscriptions` Supabase table
- **Trigger:** Supabase Database Webhook → Vercel Edge Function (`/api/push/send`) → Web Push
- **Triggers:** new message, incoming call, photo received
- **iOS:** Requires PWA installed + iOS 16.4+

### 8.8 Home Screen

| Element | Data Source |
|---------|-------------|
| Days counter | `couples.anniversary_date` → today diff |
| Partner mood | `profiles.mood` (Realtime) |
| My mood | `profiles.mood` (local + Realtime) |
| Last photo | Latest row in `photos` table |
| Our Song | `couples.our_song_url` |
| Memory | Random row from `photos` |

---

## 9. PWA Configuration

### `next.config.js`
```javascript
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

module.exports = withPWA({
  reactStrictMode: true,
});
```

### `public/manifest.json`
```json
{
  "name": "TwoOfUs",
  "short_name": "TwoOfUs",
  "description": "Your private universe",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#080808",
  "background_color": "#080808",
  "categories": ["lifestyle"],
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/icon-512-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```

### iOS meta tags (in `app/layout.tsx`)
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="TwoOfUs" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

### Android install flow
```typescript
// hooks/useInstallPrompt.ts
let deferredPrompt: BeforeInstallPromptEvent | null = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Show custom install button
});

// When user clicks install:
deferredPrompt?.prompt();
const { outcome } = await deferredPrompt?.userChoice;
```

---

## 10. Design System

### Colors
```css
:root {
  --bg-primary:     #080808;
  --bg-secondary:   #111111;
  --bg-card:        #161616;
  --bg-input:       #1e1e1e;
  --accent:         #ff4d6d;
  --accent-soft:    #ff8fa3;
  --accent-glow:    rgba(255, 77, 109, 0.25);
  --text-primary:   #f8f8f8;
  --text-secondary: #888888;
  --text-muted:     #444444;
  --border:         rgba(255, 255, 255, 0.06);
  --msg-mine:       linear-gradient(135deg, #ff4d6d, #c9184a);
  --msg-theirs:     #1e1e1e;
  --glass:          rgba(255, 255, 255, 0.04);
  --radius-sm:      8px;
  --radius-md:      14px;
  --radius-lg:      24px;
  --radius-pill:    999px;
}
```

### Typography
| Role | Font | Weight | Size |
|------|------|--------|------|
| Display / Logo | Fraunces | 700 | 48–72px |
| Headings | Fraunces | 600 | 24–32px |
| Body | DM Sans | 400 | 15–16px |
| UI Labels | DM Sans | 500 | 13–14px |
| Timestamps | JetBrains Mono | 400 | 11px |

### Component Patterns
- **Glass card:** `background: var(--glass); backdrop-filter: blur(20px); border: 1px solid var(--border); border-radius: var(--radius-lg);`
- **Message bubble mine:** `background: var(--msg-mine); border-radius: 20px 20px 4px 20px;`
- **Message bubble theirs:** `background: var(--msg-theirs); border: 1px solid var(--border); border-radius: 20px 20px 20px 4px;`
- **Primary button:** `background: var(--accent); border-radius: var(--radius-pill); height: 56px;`
- **Input:** `background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius-md);`

### Animations
| Interaction | Animation |
|-------------|-----------|
| Message appear | `translateY(8px) opacity(0) → translateY(0) opacity(1)` 200ms ease-out |
| Reaction pop | Spring scale 0 → 1.2 → 1 |
| Typing dots | Bounce stagger 150ms each |
| Call ring | Pulse scale 1 → 1.15 → 1 repeat |
| Photo expand | Scale 0.95 → 1 + fade, 250ms |
| Nav active | Scale 1 → 1.1, accent glow |

---

## 11. API Routes

### `POST /api/push/subscribe`
Saves a Web Push subscription for the current user.
```typescript
// Body: { subscription: PushSubscription }
// Auth: Supabase JWT in cookie
// Action: Upsert into push_subscriptions table
```

### `POST /api/push/send`
Sends a push notification to a specific user. Called by Supabase webhook or server action.
```typescript
// Body: { userId: string, title: string, body: string, url: string }
// Auth: SUPABASE_SERVICE_ROLE_KEY (server only)
// Action: Fetch subscription from DB, call webpush.sendNotification()
```

### `GET /api/vapid-key`
Returns the public VAPID key to the client for push subscription setup.
```typescript
// Returns: { publicKey: NEXT_PUBLIC_VAPID_PUBLIC_KEY }
```

---

## 12. Deployment Guide

### Step 1: Supabase Setup
1. Create new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor → paste and run the full schema SQL from Section 6
3. Go to Storage → create `photos` bucket (private, 10MB limit)
4. Copy your Project URL and anon key from Settings → API

### Step 2: VAPID Keys
```bash
npx web-push generate-vapid-keys
# Outputs: Public Key + Private Key
# Save both
```

### Step 3: Vercel Deployment
1. Push code to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Add all environment variables:

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | From Supabase settings |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | From Supabase settings |
| `SUPABASE_SERVICE_ROLE_KEY` | From Supabase settings (secret) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | From step 2 |
| `VAPID_PRIVATE_KEY` | From step 2 (secret) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL |

4. Deploy. Done.

### `vercel.json`
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

## 13. Testing Guide

### Test Environments

| Environment | Purpose |
|-------------|---------|
| Local (`localhost:3000`) | Development + unit testing |
| Vercel Preview (branch deploy) | Integration testing |
| Vercel Production | Final QA before launch |

### Testing Checklist (Quick)

**Auth**
- [ ] Signup creates profile + key pair
- [ ] Private key in localStorage, never in network
- [ ] Login restores session
- [ ] Signout clears localStorage

**Pairing**
- [ ] Invite link generated on signup
- [ ] Partner can accept within 24h
- [ ] Expired / used links rejected
- [ ] Cannot pair with self

**E2EE**
- [ ] Supabase messages table shows only ciphertext
- [ ] Messages decrypt correctly on partner device
- [ ] Different nonce per message
- [ ] Key export + import + old messages still work

**Chat**
- [ ] Messages appear < 500ms
- [ ] Typing indicator works
- [ ] Read receipts update
- [ ] Photos upload + display with quota counter

**Calls**
- [ ] Voice call connects
- [ ] Video call connects
- [ ] Mute / end call work
- [ ] Incoming call notification

**PWA**
- [ ] iOS: Custom install banner + Add to Home Screen
- [ ] Android: Install prompt
- [ ] Standalone mode (no browser chrome)
- [ ] Offline: app opens from cache

**Security (RLS)**
- [ ] Third user cannot read any couple data
- [ ] Service role key not in client bundle

> See `TESTING_AND_BUG_ANALYSIS_PROMPT.md` for 119 detailed test cases with exact steps, expected vs actual, and bug report format.

---

## 14. Security Model

| Threat | Mitigation |
|--------|-----------|
| Messages read from Supabase DB | E2EE — ciphertext only stored |
| Man-in-the-middle | HTTPS enforced by Vercel + Supabase |
| Unauthorized DB access | Supabase RLS on all tables |
| Third user reads couple data | RLS policies filter by couple membership |
| Private key exfiltration | Key never leaves device (localStorage only) |
| XSS reading localStorage | React auto-escaping + Content-Security-Policy |
| Photo storage unauthorized access | Private bucket + signed URLs (1h expiry) |
| Service role key exposure | Server-only env var, never `NEXT_PUBLIC_` |
| Invite link abuse | UUID token + 24h expiry + single-use |
| Photo spam | Server-enforced 5/day quota via DB constraint |
| WebRTC eavesdropping | P2P encrypted by WebRTC spec (DTLS-SRTP) |

---

## 15. Known Limitations

| Limitation | Notes |
|------------|-------|
| iOS Push Notifications | Requires iOS 16.4+ and PWA to be installed to home screen |
| Key loss = message loss | True E2EE means no server-side key recovery — user must backup key |
| WebRTC behind symmetric NAT | TURN server required; free tier may have limits |
| Offline message send | Messages queued locally — if app closed before reconnect, they're lost |
| Photo quota is per-user not per-couple | Both users get 5 each (10 total per day) |
| No multi-device key sync | Private key is per-device; second device requires key import |
| Service worker on iOS | iOS PWA service worker support is limited — test thoroughly |

---

## 16. Roadmap

### v1.0 (Launch)
- [x] Auth + pairing
- [x] E2EE messaging
- [x] Photo sharing (limited)
- [x] Voice + video calls
- [x] Push notifications
- [x] Home screen
- [x] PWA (iOS + Android)

### v1.1
- [ ] Screen sharing during video calls
- [ ] Message scheduling ("Send at midnight")
- [ ] Custom couple themes / wallpapers
- [ ] Voice messages (E2EE audio blobs)

### v1.2
- [ ] Multi-device key sync (via password-based key derivation)
- [ ] Disappearing messages (configurable timer)
- [ ] Shared journal / notes page
- [ ] Location sharing (ephemeral, E2EE)

### v2.0
- [ ] Native iOS app (Swift, sharing same Supabase backend)
- [ ] Native Android app (Kotlin)
- [ ] Video voice notes

---

## 17. Prompts Reference

This project was built using a set of AI prompts. Here's the full reference:

| Prompt File | Purpose | Use With |
|-------------|---------|----------|
| `CLAUDE_ANTIGRAVITY_PROMPT.md` | Full spoon-fed build prompt | Claude (Antigravity / Claude Code) |
| `PRD_TwoOfUs_App.md` | Product Requirements Document | Reference / stakeholder review |
| `GOOGLE_STITCH_UI_PROMPT.md` | Full UI design prompt | Google Stitch / Figma AI |
| `TESTING_AND_BUG_ANALYSIS_PROMPT.md` | 119 test cases + bug report format | Claude (after build) |
| `PROJECT_DOCUMENTATION.md` | This file — full project reference | Ongoing development |

---

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/yourname/twoofus
cd twoofus
npm install

# 2. Set up environment variables
cp .env.example .env.local
# Fill in your Supabase + VAPID keys

# 3. Run Supabase SQL schema
# → Go to supabase.com → SQL Editor → paste schema.sql

# 4. Start development server
npm run dev

# 5. Open http://localhost:3000
# → Sign up as User A → Get invite link
# → Open link in incognito as User B → Sign up → Paired ✅
```

---

*Built with love. For two people only. 💌*

---

**Last updated:** May 2026  
**Version:** 1.0.0  
**License:** Private
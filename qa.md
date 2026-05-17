# 🧪 TESTING & BUG ANALYSIS PROMPT
## App: TwoOfUs — Private Couples Communication App

> Paste this into Claude (Antigravity / Claude Code) after the app is built. This prompt covers end-to-end testing, bug detection, edge case analysis, and a structured QA report.

---

## THE PROMPT

```
You are a senior QA engineer and security auditor. The app you are testing is called **TwoOfUs** — a private, end-to-end encrypted real-time couples communication PWA built with Next.js 14, Supabase, TweetNaCl, simple-peer WebRTC, and deployed on Vercel.

Your job is to:
1. Systematically test every feature
2. Identify bugs, broken flows, and edge cases
3. Audit E2EE correctness and security holes
4. Check PWA install behavior on iOS and Android
5. Verify Supabase RLS policies are airtight
6. Produce a structured bug report with severity ratings

Do not skip any section. Be exhaustive. For every bug found, provide:
- **Location** (file + line if visible, or screen/feature)
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Severity** (Critical / High / Medium / Low / Cosmetic)
- **Fix suggestion**

---

## SECTION 1 — AUTH FLOW TESTING

### Test Cases

#### TC-AUTH-01: Signup with valid email + password
- Input: valid email, password ≥ 8 chars
- Expected: Account created, key pair generated, public key stored in `profiles`, private key in localStorage, redirected to `/pair`
- Check: Does `profiles.public_key` exist in Supabase after signup?
- Check: Is `localStorage['twoofus_private_key']` present in browser devtools?

#### TC-AUTH-02: Signup with already-used email
- Input: email that already has a Supabase account
- Expected: Error message shown: "An account with this email already exists"
- Check: No duplicate profile created

#### TC-AUTH-03: Signup with weak password (< 8 chars)
- Expected: Inline validation error before form submits
- Check: Supabase auth is NOT called

#### TC-AUTH-04: Login with correct credentials
- Expected: Redirected to `/home` if already paired, `/pair` if not
- Check: Supabase session established, `authStore` populated

#### TC-AUTH-05: Login with wrong password
- Expected: Error toast "Incorrect email or password"
- Check: No session created

#### TC-AUTH-06: Session persistence across browser refresh
- Steps: Login → Close tab → Reopen app URL
- Expected: Still logged in, no redirect to login
- Check: Supabase session restored from cookies/localStorage

#### TC-AUTH-07: Login on a new device (no private key in localStorage)
- Steps: Login on device B where private key doesn't exist
- Expected: App detects missing private key, shows "Restore Key Backup" screen with file import option
- Check: App does NOT crash or show blank screen

#### TC-AUTH-08: Sign out
- Steps: Settings → Sign Out
- Expected: Supabase session cleared, localStorage cleared (private key removed), redirected to `/login`
- Security check: Private key MUST be cleared from localStorage on signout

#### TC-AUTH-09: Deep link while not authenticated
- Steps: Open `/chat` directly in browser while not logged in
- Expected: Redirected to `/login`, then back to `/chat` after login
- Check: No protected data visible before auth

---

## SECTION 2 — PAIRING FLOW TESTING

#### TC-PAIR-01: Generate invite link
- Steps: Complete signup → arrive at `/pair`
- Expected: Unique invite link generated with UUID token, stored in `couples.invite_token`
- Check: Link format is `[APP_URL]/invite/[uuid]`

#### TC-PAIR-02: Invite link copied to clipboard
- Steps: Tap "Copy Link"
- Expected: Link in clipboard, success toast shown
- Check: Works on both iOS Safari and Android Chrome

#### TC-PAIR-03: Partner accepts valid invite link
- Steps: User B opens invite link in browser
- Expected: User B (if not signed in) is redirected to signup, then automatically joins couple on completion. If already signed in, directly joins.
- Check: `couples.user_b` updated, `couples.paired_at` set

#### TC-PAIR-04: Invite link expired (> 24 hours old)
- Steps: Open an expired invite link
- Expected: Error screen "This invite link has expired. Ask your partner to generate a new one."
- Check: `couples.invite_expires_at < now()` handled gracefully

#### TC-PAIR-05: Invite link used twice
- Steps: Partner B accepts. Then a third person tries the same link.
- Expected: Error "This invite has already been used."
- Check: `couples.user_b` already set → reject

#### TC-PAIR-06: User A tries to generate a second couple
- Steps: User A is already paired, navigates to `/pair` manually
- Expected: Redirected to `/home` — cannot create a second pairing
- Check: RLS or app logic blocks this

#### TC-PAIR-07: User tries to accept their own invite link
- Steps: User A sends themselves the invite link and opens it
- Expected: Error "You cannot pair with yourself"
- Check: `invite.user_a === current_user.id` → reject

---

## SECTION 3 — END-TO-END ENCRYPTION TESTING

#### TC-E2EE-01: Message stored as ciphertext in Supabase
- Steps: Send a message "Hello secret"
- Expected: In Supabase `messages` table, `ciphertext` column contains base64-encoded encrypted data — NOT plaintext
- Verification: Open Supabase Table Editor → messages → confirm no plaintext visible

#### TC-E2EE-02: Message decrypts correctly on recipient's device
- Steps: User A sends "Meet me at 8". User B receives it.
- Expected: User B sees "Meet me at 8" in chat
- Check: Decryption using User B's private key + User A's public key succeeds

#### TC-E2EE-03: Message cannot be decrypted without private key
- Steps: Manually copy ciphertext + nonce from Supabase. Attempt to decrypt without the correct private key.
- Expected: `nacl.box.open()` returns null. Nothing displayed.

#### TC-E2EE-04: Key pair persists across sessions
- Steps: Login → Send message → Refresh browser → Receive new message
- Expected: Messages still decrypt correctly (localStorage persisted)

#### TC-E2EE-05: Private key never sent to server
- Steps: Open Network tab in browser DevTools. Send a message, upload a photo.
- Expected: Inspect ALL network requests. `twoofus_private_key` value should NEVER appear in any request payload, header, or URL.
- This is a CRITICAL security check.

#### TC-E2EE-06: Different nonce per message
- Steps: Send 3 identical messages "hi"
- Expected: In Supabase, all 3 rows have different `nonce` values
- Check: Nonce reuse would be a critical cryptographic vulnerability

#### TC-E2EE-07: Photo encryption
- Steps: Send a photo
- Expected: File in Supabase Storage is binary/encrypted (not viewable as image), `photos.encrypted_key` is present
- Check: Downloading the storage file directly should produce unreadable binary data

#### TC-E2EE-08: Key backup export and import
- Steps: Settings → Export Key → Download file → Sign out → Sign in → Import Key → Read old messages
- Expected: All old messages decrypt correctly after key import
- Check: Imported key matches original key pair

#### TC-E2EE-09: Missing public key scenario
- Steps: Delete a user's `public_key` from Supabase `profiles` manually
- Expected: App shows error "Cannot encrypt — partner's key not found" rather than crashing or sending unencrypted data

---

## SECTION 4 — CHAT FEATURE TESTING

#### TC-CHAT-01: Send a text message
- Expected: Message appears immediately on sender's screen (optimistic UI), delivered to partner via Realtime

#### TC-CHAT-02: Real-time delivery latency
- Steps: Send a message, measure time until it appears on partner's device
- Expected: < 500ms on good connection
- Log: Actual observed latency

#### TC-CHAT-03: Typing indicator appears
- Steps: User A starts typing
- Expected: User B sees "typing..." indicator within ~1 second
- Check: Disappears when A stops typing (after 2-3 second debounce)

#### TC-CHAT-04: Read receipts
- Steps: User A sends message. User B opens chat and sees it.
- Expected: User A sees "Seen" + timestamp below the message
- Check: `messages.seen_at` updated in Supabase

#### TC-CHAT-05: Long message handling
- Input: Send a 5000-character message
- Expected: Bubble wraps properly, no UI overflow, no truncation, scrollable

#### TC-CHAT-06: Emoji-only message
- Input: Send "🥰💕🔥"
- Expected: Large emoji display, correct decryption

#### TC-CHAT-07: Reply to a message
- Steps: Long-press a message → Reply
- Expected: Reply bubble shows quoted original message above the new message
- Check: `messages.reply_to` set correctly

#### TC-CHAT-08: Delete a message
- Steps: Long-press own message → Delete
- Expected: Message shows "This message was deleted" placeholder. `messages.deleted_at` set. Partner sees same placeholder.
- Check: Ciphertext still in DB (soft delete), but UI shows placeholder

#### TC-CHAT-09: React to a message
- Steps: Long-press a message → Pick reaction emoji
- Expected: Reaction appears below bubble. Partner sees it in realtime.

#### TC-CHAT-10: Scroll to bottom on new message
- Steps: Scroll up in chat history. Partner sends a message.
- Expected: "New message ↓" pill appears. Tap it to scroll to bottom.

#### TC-CHAT-11: Offline message queue
- Steps: Turn off network on sender's device → Type message → Hit send → Reconnect
- Expected: Message queued locally → automatically sent on reconnect
- Check: No duplicate sends

#### TC-CHAT-12: Chat with no messages (empty state)
- Expected: A beautiful empty state illustration/text, not a blank white screen

#### TC-CHAT-13: Chat history loads on app open
- Steps: Close app → Reopen
- Expected: Last 50 messages load from Supabase, properly decrypted
- Check: Pagination / infinite scroll for older messages

---

## SECTION 5 — PHOTO SHARING TESTING

#### TC-PHOTO-01: Upload a photo
- Steps: Tap photo icon → Select image → Send
- Expected: Photo appears in chat as image card, decrypted and displayed

#### TC-PHOTO-02: Daily quota enforcement (5/day)
- Steps: Send 5 photos in one day
- Expected: 6th attempt shows error "You've used all 5 photos for today. Come back tomorrow!"
- Check: `photo_quota` table has count = 5 for today's date

#### TC-PHOTO-03: Quota resets at midnight UTC
- Steps: Hit 5/5 limit → Wait for midnight UTC → Try again
- Expected: Quota resets to 0, photo sends successfully

#### TC-PHOTO-04: Photo quota counter UI
- Expected: "3 of 5 photos used today" shown on photo send screen, updates in realtime

#### TC-PHOTO-05: Large photo upload (> 5MB)
- Steps: Select a 8MB photo
- Expected: Client-side compression/resize to max 1920px before upload, final file < 3MB

#### TC-PHOTO-06: Photo auto-deletion after 7 days
- Check: `photos.expires_at` = `created_at + 7 days` in DB
- Check: Supabase Storage lifecycle policy removes file after expiry (or a cron Edge Function handles cleanup)

#### TC-PHOTO-07: View expired photo
- Steps: Try to view a photo past its expiry
- Expected: Placeholder "This photo has expired 🌸" rather than broken image

#### TC-PHOTO-08: Unsupported file type
- Steps: Try to upload a .pdf or .gif
- Expected: Error "Only JPEG and PNG photos supported"

#### TC-PHOTO-09: Photo fullscreen view
- Steps: Tap a photo in chat
- Expected: Opens fullscreen with pinch-to-zoom, close button, timestamp

---

## SECTION 6 — VOICE & VIDEO CALL TESTING

#### TC-CALL-01: Initiate voice call
- Steps: User A taps voice call button in chat header
- Expected: User B receives incoming call modal with ringtone (or vibration), User A sees "Calling..." state

#### TC-CALL-02: Accept voice call
- Steps: User B taps Accept
- Expected: Both users connected, audio flows bidirectionally within 3 seconds

#### TC-CALL-03: Decline call
- Steps: User B taps Decline
- Expected: User A sees "Call declined", call screen closes

#### TC-CALL-04: Call ends automatically if not answered (60s)
- Steps: User A calls → User B doesn't answer
- Expected: Call auto-ends after 60 seconds, User A sees "No answer"

#### TC-CALL-05: Mute microphone during call
- Steps: Tap mute button
- Expected: Partner cannot hear User A, mute button shows active state (red/highlighted)

#### TC-CALL-06: End call from either side
- Steps: Either user taps end call
- Expected: Both users' call screens close, call duration shown briefly

#### TC-CALL-07: Video call — camera toggle
- Steps: Start video call → toggle camera off
- Expected: Partner sees black/placeholder instead of video. Toggle icon shows off state.

#### TC-CALL-08: Video call — flip camera (mobile)
- Steps: Tap flip camera button
- Expected: Switches between front and rear camera

#### TC-CALL-09: Call on bad network
- Steps: Throttle network to "Slow 3G" in DevTools → Start call
- Expected: Adaptive bitrate reduces quality gracefully, call stays connected. Does NOT crash.

#### TC-CALL-10: WebRTC ICE failure (no STUN/TURN)
- Steps: Block STUN server URLs in network settings → Attempt call
- Expected: Error shown "Call failed — check your connection" rather than infinite loading

#### TC-CALL-11: Call permissions denied
- Steps: Deny mic/camera permission → Attempt call
- Expected: Friendly error "Microphone access is required to make calls. Please enable it in your browser settings."

#### TC-CALL-12: Push notification for incoming call
- Steps: User B has app backgrounded or closed → User A calls
- Expected: Push notification arrives on User B's device with "Accept" and "Decline" actions

#### TC-CALL-13: Simultaneous call attempt (both call each other at same time)
- Expected: One call takes precedence, no deadlock or crash

---

## SECTION 7 — PRESENCE & REALTIME TESTING

#### TC-PRESENCE-01: Online status shows correctly
- Steps: User A opens app
- Expected: User B sees green presence dot + "Online now" within 2 seconds

#### TC-PRESENCE-02: Offline status on app close
- Steps: User A closes app / loses connection
- Expected: User B sees presence dot go grey + "Last seen [time]" within ~10 seconds

#### TC-PRESENCE-03: Presence survives page refresh
- Steps: User A refreshes browser
- Expected: Brief offline blip, then back to online — User B sees it recover

#### TC-PRESENCE-04: Multiple tabs open
- Steps: User A opens app in 2 browser tabs
- Expected: Presence still shows as online. Closing one tab doesn't show as offline.

---

## SECTION 8 — PWA INSTALL TESTING

#### TC-PWA-01: iOS Safari — Install prompt visible
- Steps: Open app URL in Safari on iPhone
- Expected: Custom install banner appears at top within 3 seconds
- Check: Banner shows app icon + "Add to Home Screen" instructions with animated arrow

#### TC-PWA-02: iOS Safari — App installs correctly
- Steps: Follow banner → Share → Add to Home Screen
- Expected: App icon appears on home screen with correct name "TwoOfUs" and icon

#### TC-PWA-03: iOS PWA — Standalone mode
- Steps: Launch from home screen icon
- Expected: No Safari browser chrome (no URL bar, no share bar), full-screen app feel

#### TC-PWA-04: iOS PWA — Splash screen
- Steps: Launch from home screen (slow connection)
- Expected: App splash screen shows (#080808 background + logo) rather than white flash

#### TC-PWA-05: Android Chrome — Install prompt
- Steps: Open app URL in Chrome on Android
- Expected: Custom install button visible (captures `beforeinstallprompt`), OR Chrome's native "Add to Home screen" banner appears

#### TC-PWA-06: Android PWA — Standalone mode
- Steps: Install and launch from Android home screen
- Expected: No Chrome address bar, standalone app behavior

#### TC-PWA-07: Offline mode
- Steps: Install PWA → Disconnect network → Open app
- Expected: App opens (from service worker cache), shows cached messages, offline banner shown
- Check: Does NOT show blank screen or browser error page

#### TC-PWA-08: manifest.json validation
- Steps: Chrome DevTools → Application → Manifest
- Expected: All fields valid, no warnings, icons load correctly (192 + 512 + maskable)

#### TC-PWA-09: Service worker registration
- Steps: DevTools → Application → Service Workers
- Expected: Service worker registered and active, no errors

---

## SECTION 9 — SUPABASE RLS SECURITY AUDIT

For each check below, create a **second test Supabase account** (User C, not in the couple) and attempt the queries using Supabase JS client with User C's session.

#### TC-RLS-01: Cannot read another couple's messages
```javascript
// Logged in as User C (not in couple)
const { data } = await supabase.from('messages').select('*');
// Expected: data = [] (empty, not an error, but no rows returned)
```

#### TC-RLS-02: Cannot insert message into another couple's chat
```javascript
await supabase.from('messages').insert({
  couple_id: 'some-other-couple-uuid',
  sender_id: userC.id,
  ciphertext: 'attack',
  nonce: 'abc'
});
// Expected: RLS violation error, insert rejected
```

#### TC-RLS-03: Cannot read another user's profile public key via direct query
```javascript
const { data } = await supabase.from('profiles').select('*').eq('id', 'userA-uuid');
// Expected: [] — User C cannot read User A's profile unless they are coupled
```

#### TC-RLS-04: Cannot read another couple's photos
```javascript
const { data } = await supabase.from('photos').select('*');
// Expected: [] for User C
```

#### TC-RLS-05: Cannot read call signals from another couple
```javascript
const { data } = await supabase.from('call_signals').select('*');
// Expected: [] for User C
```

#### TC-RLS-06: Cannot update another user's profile
```javascript
await supabase.from('profiles').update({ display_name: 'Hacked' }).eq('id', 'userA-uuid');
// Expected: 0 rows updated (RLS blocks it)
```

#### TC-RLS-07: Cannot access Supabase Storage photos directly
- Steps: Get storage path of another couple's photo. Try to download using Storage API with User C's session.
- Expected: 403 Forbidden

#### TC-RLS-08: Service role key not exposed to client
- Steps: Search entire codebase for `SUPABASE_SERVICE_ROLE_KEY`
- Expected: Only used in server-side files (`/app/api/...` or Edge Functions). NEVER in client components or `NEXT_PUBLIC_` prefixed variables.

---

## SECTION 10 — PERFORMANCE TESTING

#### TC-PERF-01: Initial load time
- Tool: Lighthouse in Chrome DevTools
- Expected: Performance score > 80, First Contentful Paint < 2s on mobile (throttled 4G)

#### TC-PERF-02: Chat scrollback performance
- Steps: Load chat with 500+ messages
- Expected: No janky scrolling, virtualized list if needed

#### TC-PERF-03: Photo upload time
- Input: 2MB photo on 4G
- Expected: Upload completes < 5 seconds including encryption

#### TC-PERF-04: Realtime message latency
- Steps: Send 20 messages rapidly
- Expected: No messages dropped, all appear in correct order

#### TC-PERF-05: Memory leak check
- Steps: Keep chat open for 30 minutes with active messaging
- Expected: Browser memory usage stable, no unbounded growth (Supabase channel not duplicated on re-renders)

#### TC-PERF-06: WebRTC call quality metrics
- Steps: 5-minute video call
- Check in DevTools: `chrome://webrtc-internals` — acceptable packet loss (< 2%), jitter (< 30ms)

---

## SECTION 11 — MOBILE UX TESTING

#### TC-MOB-01: Virtual keyboard pushes input up
- Steps: Open chat on mobile → Tap message input
- Expected: Input field moves above keyboard, not obscured

#### TC-MOB-02: Safe area insets respected
- Steps: Test on iPhone with notch / Dynamic Island + Android with gesture nav bar
- Expected: Bottom nav and input not obscured by system UI

#### TC-MOB-03: Pinch-to-zoom disabled on app chrome
- Expected: `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">` — app doesn't zoom accidentally

#### TC-MOB-04: Pull-to-refresh disabled in PWA mode
- Expected: No accidental page refresh when scrolling to top of chat

#### TC-MOB-05: Long-press message opens action menu (not browser context menu)
- Expected: Custom action sheet (Reply, React, Delete) appears, not browser's default context menu

#### TC-MOB-06: Back button / swipe behavior (Android)
- Steps: Android → In chat → Press back button
- Expected: Goes to home screen, not closes the app

---

## SECTION 12 — EDGE CASES & ADVERSARIAL INPUTS

#### TC-EDGE-01: XSS in message content
- Input: Send `<script>alert('xss')</script>` as a message
- Expected: Displays as literal text, script does NOT execute
- Check: React's JSX auto-escaping should handle this, but verify

#### TC-EDGE-02: SQL injection via message
- Input: `'; DROP TABLE messages; --`
- Expected: Stored as literal text (Supabase parameterized queries handle this). Table not dropped.

#### TC-EDGE-03: Extremely long display name
- Input: 500-character display name in settings
- Expected: Truncated in UI with ellipsis, no layout break

#### TC-EDGE-04: Unicode / RTL text in messages
- Input: Arabic text "مرحبا" or Hebrew
- Expected: Correct RTL rendering in message bubble

#### TC-EDGE-05: Empty message send attempt
- Steps: Hit send with blank input
- Expected: Send button disabled or no-op, no empty message inserted to DB

#### TC-EDGE-06: Rapid fire 50 messages
- Steps: Paste script to send 50 messages in 2 seconds
- Expected: All delivered, correct order, no crash, no duplicates

#### TC-EDGE-07: App behavior when Supabase is down
- Steps: Set wrong Supabase URL in env → Load app
- Expected: Graceful error page "Connection error. Please try again." — not a white crash screen

#### TC-EDGE-08: Photo upload with no storage quota remaining
- Steps: Fill Supabase Storage quota (if on free tier)
- Expected: Error toast "Storage full. Contact support." rather than silent failure

#### TC-EDGE-09: Concurrent logins from 2 devices
- Steps: Log into same account on Phone + Laptop simultaneously
- Expected: Both sessions work, messages appear on both, no conflict

#### TC-EDGE-10: Invalid/tampered JWT token
- Steps: Manually edit Supabase JWT token in localStorage to an invalid value
- Expected: App detects invalid session, signs out, redirects to login

---

## SECTION 13 — PUSH NOTIFICATION TESTING

#### TC-PUSH-01: Permission request
- Steps: First app open after install
- Expected: Browser push permission dialog shown at appropriate moment (after user interaction, not immediately on load)

#### TC-PUSH-02: Subscription stored in Supabase
- Steps: Grant push permission
- Expected: `push_subscriptions` table has entry for this user with full Web Push subscription JSON

#### TC-PUSH-03: Notification received when app is backgrounded
- Steps: Background app → Partner sends message
- Expected: OS notification appears with sender name and message preview (or "New message" if E2EE prevents preview)

#### TC-PUSH-04: Notification received when app is closed
- Steps: Fully close PWA → Partner sends message
- Expected: Push notification still received via service worker

#### TC-PUSH-05: Tapping notification opens correct screen
- Steps: Receive notification → Tap it
- Expected: App opens directly to chat screen

#### TC-PUSH-06: VAPID key validation
- Steps: DevTools → Application → Push Messaging
- Expected: Subscription present, endpoint valid

---

## SECTION 14 — HOME SCREEN TESTING

#### TC-HOME-01: Days counter accuracy
- Steps: Set anniversary date to exactly 100 days ago
- Expected: Counter shows "100"

#### TC-HOME-02: Days counter on anniversary date
- Steps: Set anniversary to today
- Expected: "0 days" or "Today is your day! 🎉"

#### TC-HOME-03: Mood update syncs to partner
- Steps: User A changes mood to 😴
- Expected: User B sees updated mood in realtime (Supabase Realtime on profiles)

#### TC-HOME-04: Last photo shown on home
- Steps: Send a photo in chat
- Expected: Home screen updates to show this as the "last photo" (blurred background or tile)

#### TC-HOME-05: Our Song link
- Steps: Add a Spotify/YouTube URL in settings
- Expected: Home screen shows song card, tapping opens link in browser

#### TC-HOME-06: Home screen with no photos yet (empty state)
- Expected: Graceful placeholder, not broken image

---

## BUG REPORT FORMAT

After completing all tests, produce a structured bug report in this format:

---

# 🐛 TwoOfUs — Bug Report
**Test Date:** [date]
**Tester:** [name/AI]
**App Version:** [commit hash or version]
**Environment:** [browser, OS, device]

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 Critical | X |
| 🟠 High | X |
| 🟡 Medium | X |
| 🟢 Low | X |
| ⚪ Cosmetic | X |

---

## Critical Bugs (Fix immediately — app unusable or insecure)

### BUG-001: [Title]
- **TC Reference:** TC-XXX-XX
- **Location:** `components/chat/ChatWindow.tsx` line 142
- **Steps to Reproduce:**
  1. Step one
  2. Step two
- **Expected:** What should happen
- **Actual:** What actually happens
- **Severity:** 🔴 Critical
- **Fix:** Specific code change or approach to fix

---

## High Bugs

### BUG-002: [Title]
[same format]

---

## Medium Bugs

[same format]

---

## Low / Cosmetic Bugs

[same format]

---

## Security Findings

| # | Finding | Risk | Status |
|---|---------|------|--------|
| S-001 | Private key exposed in network request | Critical | Open |
| S-002 | RLS missing on push_subscriptions | High | Open |

---

## Performance Findings

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Lighthouse Score | > 80 | 74 | ⚠️ Needs work |
| FCP (4G throttle) | < 2s | 1.8s | ✅ Pass |
| Message latency | < 500ms | 180ms | ✅ Pass |

---

## Test Coverage Summary

| Section | Tests Run | Passed | Failed | Skipped |
|---------|-----------|--------|--------|---------|
| Auth | 9 | 8 | 1 | 0 |
| Pairing | 7 | 7 | 0 | 0 |
| E2EE | 9 | 8 | 1 | 0 |
| Chat | 13 | 11 | 2 | 0 |
| Photos | 9 | 9 | 0 | 0 |
| Calls | 13 | 10 | 3 | 0 |
| Presence | 4 | 4 | 0 | 0 |
| PWA | 9 | 7 | 2 | 0 |
| RLS Security | 8 | 8 | 0 | 0 |
| Performance | 6 | 5 | 1 | 0 |
| Mobile UX | 6 | 5 | 1 | 0 |
| Edge Cases | 10 | 9 | 1 | 0 |
| Push Notifications | 6 | 5 | 1 | 0 |
| Home Screen | 6 | 6 | 0 | 0 |
| **TOTAL** | **119** | **X** | **X** | **X** |

---

## Recommended Fix Priority

1. [List bugs in order of: Critical → High → Medium → Low]
2. [Note any bugs that are blockers for production launch]

---

## Sign-off

- [ ] All Critical bugs resolved
- [ ] All High bugs resolved or have accepted workaround
- [ ] E2EE audit passed — no plaintext leakage
- [ ] RLS audit passed — no data leakage between users
- [ ] PWA installs correctly on iOS Safari and Android Chrome
- [ ] Performance score > 80 on Lighthouse
- [ ] App ready for production ✅

```
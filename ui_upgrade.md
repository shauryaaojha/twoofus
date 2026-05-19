# 🎨 TwoOfUs UI Feature Upgrade Plan
## Comprehensive Theme System + AI-Generated Chat Backgrounds

> **Version:** 2.0 Feature Set  
> **Priority:** High (visual differentiation + emotional resonance)  


---

## 📋 Table of Contents

1. [Overview](#1-overview)
2. [Feature Breakdown](#2-feature-breakdown)
3. [Architecture & Data Model](#3-architecture--data-model)
4. [UI Themes](#4-ui-themes)
5. [Chat Themes](#5-chat-themes)
6. [Preloaded Theme Assets (Antigravity Nanobanana)](#6-preloaded-theme-assets-antigravity-nanobanana)
7. [Implementation Guide](#7-implementation-guide)
8. [Component Updates](#8-component-updates)
9. [Database Changes](#9-database-changes)
10. [API Routes](#10-api-routes)
11. [Settings UI](#11-settings-ui)
12. [Figma/Design Specs](#12-figmadesign-specs)

---

## 1. Overview

### What We're Adding

**Three-layer theming system:**

| Layer | Scope | User Control |
|-------|-------|--------------|
| **Global UI Theme** | App chrome, nav, buttons, inputs, backgrounds | Per-user preference (Settings) |
| **Chat Theme** | Chat bubble colors, message backgrounds, borders | Per-couple setting (both users see same) |
| **Chat Background** | Full-screen wallpaper behind chat | AI-generated OR picked from gallery |

### Key Goals

1. **Visual Differentiation** — Each couple feels unique
2. **Emotional Resonance** — Themes tie to couple's vibe (romantic, minimal, playful, dark, light, etc.)
3. **Aesthetic Backgrounds** — Unique chat wallpapers pre-generated using Antigravity's inbuilt nanobanana image generator
4. **Seamless UX** — Switch themes instantly, preview before applying
5. **Couple Sync** — Chat theme + background sync in realtime between devices

---

## 2. Feature Breakdown

### 2.1 Global UI Themes (7 total)

Each theme includes: background colors, text colors, accent colors, button styles, card styles.

| Theme | Vibe | Key Colors | Use Case |
|-------|------|-----------|----------|
| **Midnight** (default) | Ultra-dark luxury | `#080808` + pink accent | Romantic, premium feel |
| **Sunrise** | Warm, optimistic | `#fef3c7` + `#f59e0b` | Bright, energetic couples |
| **Forest** | Nature-inspired | `#064e3b` + `#10b981` | Calm, grounded feeling |
| **Ocean** | Cool, serene | `#0c4a6e` + `#06b6d4` | Peaceful, dreamy |
| **Rose Gold** | Feminine, glam | `#fae8ff` + `#d946ef` | Luxe, fashion-forward |
| **Monochrome** | Minimal, bold | `#000000` + `#ffffff` | Clean, no-nonsense |
| **Cyberpunk** | Futuristic, edgy | `#0f0f0f` + `#ff00ff` | Bold, adventurous |

### 2.2 Chat Themes (10 total, independent of UI theme)

Chat themes control the message bubble colors, shapes, and message container background.

| Chat Theme | Bubble Style | Background | Mood |
|------------|--------------|-----------|------|
| **Soft Blush** | Pill-shaped, pastel pink/white | Blurred romance photo | Intimate, dreamy |
| **Bold Gradient** | Rounded rect, vibrant gradients | AI-generated art | Energetic |
| **Minimal Light** | Flat cards, light mode | Subtle pattern | Clean |
| **Dark Elegant** | Glass morphism with borders | Solid dark + texture | Sophisticated |
| **Playful Bubbles** | Extra rounded, emoji-colored | Pastel gradient background | Fun, casual |
| **Neon Glow** | Sharp edges, neon outlines | Dark grid pattern | Cyberpunk feel |
| **Watercolor** | Soft, artistic bubbles | Watercolor wash background | Artistic, bohemian |
| **Film Strip** | Retro Polaroid-style cards | Vintage filter overlay | Nostalgic |
| **Glassmorphic** | Frosted glass, translucent | Blurred bokeh | Modern, premium |
| **Couple Custom** | User-defined colors | AI-generated from prompt | Unique to each couple |

### 2.3 Chat Backgrounds (Preloaded & Bundled)

**Option A: Preloaded Theme Backgrounds (Generated via Antigravity Nanobanana)**
- Backgrounds are pre-generated using Antigravity's inbuilt nanobanana image generator.
- Curated and bundled directly in `/public/chat-bg/` corresponding to each chat theme.
- Fast, instant load times, zero runtime API latency or cost.

**Option B: Upload Custom**
- Couple uploads their own photo.
- Compressed, stored in Supabase Storage.
- Used as chat wallpaper.

---

## 3. Architecture & Data Model

### 3.1 Theme Data Flow

```
User Device A (Settings)
    ↓
    User selects theme
    ↓
    PUT /api/themes/ui (update profiles.ui_theme)
    ↓
    Supabase Realtime notifies Device B
    ↓
    Device B receives realtime update
    ↓
    React re-renders with new theme colors

Chat Theme (Couple Setting)
    ↓
    Either user changes chat theme
    ↓
    PUT /api/themes/chat (update couples.chat_theme)
    ↓
    Supabase Realtime → Both devices update
    ↓
    Message bubbles re-render instantly
```

### 3.2 Color Token System

Instead of hardcoding colors per theme, use **CSS custom properties** that switch based on data attribute:

```typescript
// lib/themes/colorTokens.ts
export const themes = {
  midnight: {
    bg: { primary: '#080808', secondary: '#111111', card: '#161616' },
    text: { primary: '#f8f8f8', secondary: '#888888' },
    accent: '#ff4d6d',
    msg: { mine: 'linear-gradient(135deg, #ff4d6d, #c9184a)', theirs: '#1e1e1e' }
  },
  sunrise: {
    bg: { primary: '#fef3c7', secondary: '#fde68a', card: '#fcd34d' },
    text: { primary: '#1f2937', secondary: '#6b7280' },
    accent: '#f59e0b',
    msg: { mine: 'linear-gradient(135deg, #f59e0b, #d97706)', theirs: '#fef3c7' }
  },
  // ... 5 more themes
};

export const chatThemes = {
  softBlush: {
    myBubble: { bg: '#ffe0ec', text: '#333', shape: 'pill', border: 'none' },
    theirBubble: { bg: '#fff5f7', text: '#333', shape: 'pill', border: '1px solid #ffc9dc' },
    containerBg: 'url(/chat-bg/soft-blush.webp)' // or AI-generated
  },
  // ... 9 more
};
```

---

## 4. UI Themes

### 4.1 Midnight Theme (Current Default)

Already built. Keep as-is.

### 4.2 Sunrise Theme

```css
:root[data-theme="sunrise"] {
  --bg-primary: #fef3c7;
  --bg-secondary: #fde68a;
  --bg-card: #fcd34d;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --accent: #f59e0b;
  --border: rgba(0, 0, 0, 0.1);
  --glass: rgba(255, 255, 255, 0.6);
  --msg-mine: linear-gradient(135deg, #f59e0b, #d97706);
  --msg-theirs: #fff9e6;
}
```

### 4.3 Forest Theme

```css
:root[data-theme="forest"] {
  --bg-primary: #064e3b;
  --bg-secondary: #047857;
  --bg-card: #10b981;
  --text-primary: #ecfdf5;
  --text-secondary: #a7f3d0;
  --accent: #06b6d4;
  --border: rgba(16, 185, 129, 0.3);
  --glass: rgba(16, 185, 129, 0.1);
  --msg-mine: linear-gradient(135deg, #059669, #10b981);
  --msg-theirs: rgba(16, 185, 129, 0.2);
}
```

### 4.4 Ocean Theme

```css
:root[data-theme="ocean"] {
  --bg-primary: #0c4a6e;
  --bg-secondary: #0e7490;
  --bg-card: #164e63;
  --text-primary: #e0f2fe;
  --text-secondary: #7dd3fc;
  --accent: #06b6d4;
  --border: rgba(6, 182, 212, 0.2);
  --glass: rgba(6, 182, 212, 0.08);
  --msg-mine: linear-gradient(135deg, #0891b2, #06b6d4);
  --msg-theirs: rgba(6, 182, 212, 0.15);
}
```

### 4.5 Rose Gold Theme

```css
:root[data-theme="rose-gold"] {
  --bg-primary: #fae8ff;
  --bg-secondary: #f5d0fe;
  --bg-card: #f3e8ff;
  --text-primary: #4c0519;
  --text-secondary: #a855f7;
  --accent: #d946ef;
  --border: rgba(217, 70, 239, 0.2);
  --glass: rgba(217, 70, 239, 0.06);
  --msg-mine: linear-gradient(135deg, #d946ef, #a855f7);
  --msg-theirs: #fff1f9;
}
```

### 4.6 Monochrome Theme

```css
:root[data-theme="monochrome"] {
  --bg-primary: #000000;
  --bg-secondary: #1a1a1a;
  --bg-card: #333333;
  --text-primary: #ffffff;
  --text-secondary: #999999;
  --accent: #ffffff;
  --border: rgba(255, 255, 255, 0.2);
  --glass: rgba(255, 255, 255, 0.05);
  --msg-mine: #ffffff;
  --msg-theirs: #333333;
}
```

### 4.7 Cyberpunk Theme

```css
:root[data-theme="cyberpunk"] {
  --bg-primary: #0f0f0f;
  --bg-secondary: #1a0033;
  --bg-card: #2d005c;
  --text-primary: #00ff00;
  --text-secondary: #ff00ff;
  --accent: #ff00ff;
  --border: 2px solid #ff00ff;
  --glass: rgba(255, 0, 255, 0.1);
  --msg-mine: linear-gradient(135deg, #ff00ff, #00ffff);
  --msg-theirs: #1a0033;
}
```

---

## 5. Chat Themes

### 5.1 Soft Blush

**My Messages:**
```css
{
  background: linear-gradient(135deg, #ffe0ec, #ffc9d8);
  border-radius: 20px 20px 4px 20px;
  padding: 12px 16px;
  color: #4a0e4e;
  box-shadow: 0 4px 12px rgba(255, 192, 203, 0.2);
}
```

**Their Messages:**
```css
{
  background: #fff5f7;
  border: 1px solid #ffc9dc;
  border-radius: 20px 20px 20px 4px;
  color: #4a0e4e;
}
```

**Chat Container Background:**
```css
{
  background-image: url('/chat-themes/soft-blush.webp');
  background-size: cover;
  background-attachment: fixed;
  filter: brightness(0.95);
  /* OR AI-generated image from Nano Banana */
}
```

### 5.2 Bold Gradient

**My Messages:**
```css
{
  background: linear-gradient(135deg, #ff6b6b, #ff8e53);
  border-radius: 16px;
  padding: 12px 16px;
  color: #ffffff;
  font-weight: 500;
}
```

**Their Messages:**
```css
{
  background: linear-gradient(135deg, #4ecdc4, #44a08d);
  border-radius: 16px;
  color: #ffffff;
  padding: 12px 16px;
}
```

### 5.3 Minimal Light

**My Messages:**
```css
{
  background: #e0f2fe;
  border-radius: 12px;
  padding: 10px 14px;
  color: #0c4a6e;
  border: none;
  box-shadow: none;
}
```

**Their Messages:**
```css
{
  background: #f3f4f6;
  border-radius: 12px;
  padding: 10px 14px;
  color: #374151;
}
```

### 5.4 Dark Elegant

**My Messages:**
```css
{
  background: rgba(255, 77, 109, 0.8);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 77, 109, 0.5);
  border-radius: 16px;
  padding: 12px 16px;
  color: #ffffff;
}
```

**Their Messages:**
```css
{
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  color: #e5e7eb;
}
```

### 5.5 Playful Bubbles

**My Messages:**
```css
{
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  border-radius: 32px;  /* Extra rounded */
  padding: 14px 18px;
  color: #78350f;
  font-weight: 600;
}
```

**Their Messages:**
```css
{
  background: linear-gradient(135deg, #86efac, #4ade80);
  border-radius: 32px;
  color: #15803d;
  padding: 14px 18px;
  font-weight: 600;
}
```

### 5.6 Neon Glow

**My Messages:**
```css
{
  background: transparent;
  border: 2px solid #ff00ff;
  border-radius: 4px;
  padding: 10px 14px;
  color: #ff00ff;
  box-shadow: 0 0 10px rgba(255, 0, 255, 0.5);
  font-family: monospace;
}
```

**Their Messages:**
```css
{
  background: transparent;
  border: 2px solid #00ffff;
  color: #00ffff;
  box-shadow: 0 0 10px rgba(0, 255, 255, 0.5);
  border-radius: 4px;
  padding: 10px 14px;
  font-family: monospace;
}
```

### 5.7 Watercolor

**My Messages:**
```css
{
  background: linear-gradient(135deg, #fca5a5, #fbbf24);
  border-radius: 20px;
  padding: 12px 16px;
  color: #7c2d12;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
  /* Paint-brush effect via SVG filter */
}
```

**Their Messages:**
```css
{
  background: linear-gradient(135deg, #a5f3fc, #86efac);
  border-radius: 20px;
  color: #164e63;
  padding: 12px 16px;
}
```

### 5.8 Film Strip

**My Messages (Polaroid style):**
```css
{
  background: #fffbeb;
  border: 8px solid #fffbeb;
  border-bottom-width: 32px;  /* Thick bottom for Polaroid label */
  border-radius: 2px;
  padding: 8px 12px;
  color: #1f2937;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: rotate(-1deg);
  max-width: 85%;
}
```

**Their Messages:**
```css
{
  background: #f3f4f6;
  border: 8px solid #f3f4f6;
  border-bottom-width: 32px;
  border-radius: 2px;
  color: #111827;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  transform: rotate(1deg);
}
```

### 5.9 Glassmorphic

**My Messages:**
```css
{
  background: rgba(255, 77, 109, 0.15);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 77, 109, 0.3);
  border-radius: 20px;
  padding: 12px 16px;
  color: #fff5fa;
}
```

**Their Messages:**
```css
{
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  color: #d1d5db;
}
```

### 5.10 Couple Custom

Allow couple to:
1. Pick base colors (my message color + their message color) via color picker
2. Pick shape (pill, rounded, square, custom)
3. AI-generate a custom background prompt
4. Preview live before saving

---

## 6. Preloaded Theme Assets (Antigravity Nanobanana)

### 6.1 Antigravity Nanobanana Asset Generation

Instead of using an external runtime API that incurs latency and costs, we leverage Antigravity's developer-time/inbuilt **nanobanana** image generation capabilities during development to pre-generate high-quality chat backgrounds for each theme.

**Benefits:**
- **Zero Runtime Cost:** No subscription or usage fees for end-users.
- **Instant Load Times:** Wallpapers are loaded directly from local static assets.
- **Consistent Aesthetics:** Pre-vetted high-quality images that guarantee text readability over chat bubbles.

### 6.2 Pre-Generated & Bundled Gallery

We preload 20 curated backgrounds matching each chat theme, generated by Antigravity's generator and bundled with the app.

Each background image is:
- Optimized (< 150KB, WebP format)
- 1080x1920px (mobile-first aspect ratio)
- Tested/filtered for text readability over message bubbles.



---

## 7. Implementation Guide

### Phase 1: Theme Infrastructure (1 week)

- [ ] Create `lib/themes/colorTokens.ts` with all 7 UI theme + 10 chat theme definitions
- [ ] Update `app/globals.css` to support `data-theme` attribute switching
- [ ] Create `hooks/useTheme.ts` hook (read from Zustand store)
- [ ] Add `ui_theme` column to `profiles` table (default: 'midnight')
- [ ] Add `chat_theme` column to `couples` table (default: 'softBlush')
- [ ] Add `chat_bg_url` column to `couples` table
- [ ] Create Zustand store slices for theme management
- [ ] Test all 7 UI themes on all screens (no broken layouts)

### Phase 2: UI Theme Switcher (3 days)

- [ ] Create `<ThemeSwitcher />` component (7 theme pills with color previews)
- [ ] Add to Settings page
- [ ] Wire up theme change → Supabase update → Realtime broadcast
- [ ] Add "Preview" toggle before applying
- [ ] Test on both devices (realtime sync)

### Phase 3: Chat Theme Switcher (3 days)

- [ ] Create `<ChatThemePicker />` component (10 theme cards with previews)
- [ ] Add to Home screen OR Chat header
- [ ] Show live preview of message bubbles in different chat themes
- [ ] Wire up change → update `couples.chat_theme`
- [ ] Animate transition between chat themes

### Phase 4: Chat Background System (3 days)

- [ ] Create Supabase storage bucket `chat-backgrounds`
- [ ] Upload 20 pre-generated backgrounds (or use placeholder PNGs)
- [ ] Create `<ChatBgGallery />` component (grid of backgrounds)
- [ ] Add to settings/home screen
- [ ] Implement background selection → `couples.chat_bg_url` update

### Phase 5: Theme Asset Bundling & Custom Uploads (4 days)

- [ ] Generate backgrounds for all 10 chat themes using Antigravity Nanobanana generator
- [ ] Bundle pre-generated backgrounds in `/public/chat-bg/`
- [ ] Wire up theme metadata definitions to reference local bundled background assets
- [ ] Implement Option B: Custom photo upload using Supabase Storage bucket
- [ ] Add loading states + preview logic for selected/uploaded backgrounds

### Phase 6: Polish & Testing (3 days)

- [ ] Test all theme combinations on iOS PWA + Android PWA
- [ ] Test realtime sync between 2 devices
- [ ] Performance: ensure theme switching doesn't cause lag
- [ ] Accessibility: ensure text is readable in all themes
- [ ] Generate UI component storybook

---

## 8. Component Updates

### 8.1 New Components to Create

```
components/themes/
├── ThemeSwitcher.tsx           # 7 UI theme pills
├── ChatThemePicker.tsx         # 10 chat theme cards
├── ChatBgGallery.tsx           # Background selection grid (including custom upload)
├── ThemePreview.tsx            # Live preview of themes
└── ThemeColorPicker.tsx        # Custom color picker (couple custom)

lib/themes/
├── colorTokens.ts             # All theme definitions
└── chatThemes.ts              # Chat theme CSS snippets

hooks/
├── useTheme.ts                # Read/write current theme
├── useThemeChange.ts          # Handle theme switching logic
└── useChatBackground.ts       # Chat bg management
```

### 8.2 Updated Components

**`app/(app)/layout.tsx`** — Apply theme to root:
```typescript
export default function AppLayout({ children }) {
  const theme = useTheme(s => s.uiTheme);
  
  return (
    <html data-theme={theme}>
      <body>{children}</body>
    </html>
  );
}
```

**`components/chat/ChatWindow.tsx`** — Background support:
```typescript
export function ChatWindow() {
  const chatBg = useCoupleStore(s => s.chatBgUrl);
  const chatTheme = useCoupleStore(s => s.chatTheme);
  
  return (
    <div 
      className="chat-window"
      style={{
        backgroundImage: chatBg ? `url(${chatBg})` : undefined,
        backgroundColor: chatTheme === 'dark' ? '#080808' : '#f8f8f8'
      }}
    >
      {/* messages */}
    </div>
  );
}
```

**`components/chat/MessageBubble.tsx`** — Dynamic styling:
```typescript
export function MessageBubble({ message, isMe }) {
  const chatTheme = useCoupleStore(s => s.chatTheme);
  const bubbleClass = isMe 
    ? `msg-${chatTheme}-mine` 
    : `msg-${chatTheme}-theirs`;
  
  return (
    <div className={`bubble ${bubbleClass}`}>
      {message.text}
    </div>
  );
}
```

---

## 9. Database Changes

### 9.1 New Columns

```sql
-- Add to profiles table
ALTER TABLE profiles ADD COLUMN ui_theme text DEFAULT 'midnight';
-- Options: 'midnight', 'sunrise', 'forest', 'ocean', 'rose-gold', 'monochrome', 'cyberpunk'

-- Add to couples table
ALTER TABLE couples ADD COLUMN chat_theme text DEFAULT 'soft-blush';
-- Options: 'soft-blush', 'bold-gradient', 'minimal-light', 'dark-elegant', 'playful-bubbles', 'neon-glow', 'watercolor', 'film-strip', 'glassmorphic', 'couple-custom'

ALTER TABLE couples ADD COLUMN chat_bg_url text;
-- Bundled static path (e.g. /chat-bg/...) or Supabase Storage public URL (for custom uploads)

ALTER TABLE couples ADD COLUMN chat_bg_custom_colors jsonb;
-- For 'couple-custom' theme: { myColor: '#ffe0ec', theirColor: '#fff5f7', shape: 'pill' }
```

### 9.2 Storage Bucket for Generated Backgrounds

```sql
-- In Supabase Storage:
-- Bucket name: "chat-backgrounds"
-- Public: true (for fast display)
-- File size limit: 5MB
-- Allowed MIME: image/jpeg, image/webp, image/png
```

---

## 10. API Routes

### 10.1 `POST /api/themes/ui`
Set the user's UI theme preference.

```typescript
// Body: { theme: 'midnight' | 'sunrise' | ... }
// Updates profiles.ui_theme
// Realtime broadcast to partner (via profiles subscription)
```

### 10.2 `POST /api/themes/chat`
Set the couple's chat theme.

```typescript
// Body: { theme: 'soft-blush' | 'bold-gradient' | ... }
// Updates couples.chat_theme
// Realtime broadcast to both devices
```

### 10.3 `POST /api/themes/chat-bg`
Set the couple's chat background (gallery selection).

```typescript
// Body: { bgUrl: 'https://...' }
// Updates couples.chat_bg_url
// Realtime broadcast
```

### 10.4 `POST /api/themes/upload-bg`
Upload a custom couple background photo to Supabase Storage.

```typescript
// Body: FormData containing image file and coupleId
// Uploads to Supabase Storage bucket 'chat-backgrounds'
// Updates couples.chat_bg_url
// Returns: { imageUrl }
```

---

## 11. Settings UI

### 11.1 Settings Page Layout

```
Settings
├─ Profile
│  ├─ Avatar (upload)
│  ├─ Display Name
│  └─ Email
│
├─ Appearance
│  ├─🎨 UI Theme
│  │  ├─ Midnight (selected, pink accent)
│  │  ├─ Sunrise (warm yellow preview)
│  │  ├─ Forest (green preview)
│  │  ├─ Ocean (blue preview)
│  │  ├─ Rose Gold (pink preview)
│  │  ├─ Monochrome (B&W preview)
│  │  └─ Cyberpunk (neon preview)
│  │
│  └─ 💬 Chat Theme & Background
│     ├─ Chat Theme Picker (10 cards)
│     ├─ "Pick Background" button
│     │  └─ Gallery (20 pre-generated images in grid)
│     │  └─ "Upload Photo" tab (drag & drop custom upload)
│     └─ Current BG preview
│
├─ Couple Settings
│  ├─ Anniversary Date 
│  ├─ Our Song
│  └─ Couple Name (optional)
│
├─ Privacy & Security
│  ├─ Export Private Key
│  └─ Import Key Backup
│
└─ Sign Out
```

### 11.2 Theme Switcher Component

```typescript
// components/themes/ThemeSwitcher.tsx
export function ThemeSwitcher() {
  const currentTheme = useTheme(s => s.uiTheme);
  const setTheme = useTheme(s => s.setUiTheme);

  const themes = [
    { id: 'midnight', label: 'Midnight', colors: ['#080808', '#ff4d6d'] },
    { id: 'sunrise', label: 'Sunrise', colors: ['#fef3c7', '#f59e0b'] },
    { id: 'forest', label: 'Forest', colors: ['#064e3b', '#10b981'] },
    // ... more
  ];

  return (
    <div className="theme-grid">
      {themes.map(theme => (
        <button
          key={theme.id}
          onClick={() => setTheme(theme.id)}
          className={`theme-pill ${currentTheme === theme.id ? 'active' : ''}`}
        >
          <div className="color-preview">
            <div style={{ backgroundColor: theme.colors[0] }} />
            <div style={{ backgroundColor: theme.colors[1] }} />
          </div>
          <span>{theme.label}</span>
        </button>
      ))}
    </div>
  );
}
```

### 11.3 Chat Theme Picker

```typescript
// components/themes/ChatThemePicker.tsx
export function ChatThemePicker() {
  const coupleTheme = useCoupleStore(s => s.chatTheme);
  const setChatTheme = useCoupleStore(s => s.setChatTheme);

  const chatThemes = [
    { id: 'soft-blush', label: 'Soft Blush', preview: SoftBlushPreview },
    { id: 'bold-gradient', label: 'Bold Gradient', preview: BoldGradientPreview },
    // ... more
  ];

  return (
    <div className="chat-theme-grid">
      {chatThemes.map(theme => (
        <div
          key={theme.id}
          onClick={() => setChatTheme(theme.id)}
          className={`chat-theme-card ${coupleTheme === theme.id ? 'selected' : ''}`}
        >
          <theme.preview />
          <label>{theme.label}</label>
        </div>
      ))}
    </div>
  );
}
```

### 11.4 Custom Background Uploader

```typescript
// components/themes/CustomBgUploader.tsx
export function CustomBgUploader() {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const coupleId = useCoupleStore(s => s.couple?.id);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('coupleId', coupleId || '');

    try {
      const res = await fetch('/api/themes/upload-bg', {
        method: 'POST',
        body: formData
      });
      
      const { imageUrl } = await res.json();
      setPreview(imageUrl);
      toast.success('Upload successful!');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="custom-bg-uploader">
      <input type="file" accept="image/*" onChange={handleUpload} disabled={loading} />
      {loading && <p>Uploading...</p>}
      
      {preview && (
        <div className="preview">
          <img src={preview} alt="Custom background" />
          <button onClick={() => applyChatBg(preview)}>
            Apply to Chat
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## 12. Figma/Design Specs

### 12.1 Figma Components to Create

**Frames:**
- Frame: "UI Themes" (7 screenshots of app in each theme)
- Frame: "Chat Themes" (10 message bubble variations)
- Frame: "Chat Backgrounds" (20 gallery images generated via Antigravity Nanobanana)
- Frame: "Settings Screens" (theme switcher screens)
- Frame: "Component States" (theme switcher buttons, selected/hover/inactive states)

**Assets:**
- Colors: All 7 UI themes (primary, secondary, accent, text, borders)
- Typography: Existing (Fraunces, DM Sans, JetBrains Mono)
- Chat bubble shapes: 10 variations (pill, round, square, glass, neon, etc.)
- Icons: Theme icon (palette), backgrounds icon, etc.

### 12.2 Prototype Flow

1. **Home Screen** → Tap "Themes" → Settings
2. **Settings** → Scroll to "Appearance" → Show UI Theme Switcher
3. **Click Theme** → Full app re-renders with new colors ✨
4. **Scroll down** → Chat Theme Picker cards
5. **Click Chat Theme** → Preview message bubbles update
6. **Background section** → Gallery grid + "Upload Photo" tab
7. **Upload Photo** → Choose image file → Uploading... → Preview → Apply

### 12.3 Accessibility Specs

- All themes must pass **WCAG AA contrast** (text vs background ≥ 4.5:1)
- Cyberpunk theme especially needs care (bright neon on dark)
- Test with Figma Accessibility plugin
- Include "High Contrast" variant if needed

---

## Implementation Checklist

### Week 1: Infrastructure
- [ ] Define all color tokens in TypeScript
- [ ] Update CSS to support `data-theme` switching
- [ ] Add database columns for ui_theme, chat_theme, chat_bg_url
- [ ] Create Zustand store slices
- [ ] Implement useTheme hook

### Week 2: UI Theming
- [ ] Build ThemeSwitcher component
- [ ] Add to Settings page
- [ ] Test all 7 themes across all screens
- [ ] Implement realtime sync (both devices)
- [ ] Styling + animations

### Week 2-3: Chat Theming & Backgrounds
- [ ] Build ChatThemePicker component
- [ ] Build ChatBgGallery component
- [ ] Create 20 pre-generated backgrounds
- [ ] Upload to Supabase Storage
- [ ] Implement background selection
- [ ] Test realtime sync

### Week 3: Asset Bundling & Custom Uploads
- [ ] Generate 20 high-quality background images using Antigravity Nanobanana generator
- [ ] Bundle preloaded assets in `/public/chat-bg/`
- [ ] Implement custom image upload endpoint `/api/themes/upload-bg`
- [ ] Build CustomBgUploader component
- [ ] Test local background rendering and custom upload flows

### Week 3-4: Polish
- [ ] Test on iOS PWA + Android PWA
- [ ] Performance testing (no lag on theme switch)
- [ ] Accessibility audit (contrast, color blindness)
- [ ] Create Figma component storybook
- [ ] Document theme system for future devs

---

## Cost Estimate

| Service | Cost | Notes |
|---------|------|-------|
| Antigravity Generator | Free | Dev-time asset generation |
| Supabase Storage | Free (1GB tier) | Only used for optional custom photo uploads |
| Figma | $0 (if already paid) | Create theme components |
| Dev time | ~30-40 hours | 1.5 - 2 dev weeks (faster due to no complex AI runtime APIs) |
| **Total** | **$0/month** | Completely free |

---

## Success Metrics

After launch, track:

| Metric | Target | How to measure |
|--------|--------|-----------------|
| Theme switch rate | > 40% of users change theme | Mixpanel / Supabase event logging |
| Background customization rate | > 50% of couples select a custom or preloaded background | Action log events |
| Settings page visits | > 60% of DAU | Page view analytics |
| User satisfaction | > 4.5/5 on theme design | In-app survey |
| Performance (theme switch) | < 100ms | React Profiler |

---

## Future Enhancements (v2.1+)

1. **More themes** — Add 5 more UI themes based on user feedback
2. **Custom theme builder** — Couple defines exact colors for all elements
3. **Animated backgrounds** — Subtle particle effects, gradients that shift
7. **In-app Custom AI Backgrounds** — Future integration of in-app AI generator once API costs stabilize
8. **Photo-as-background** — Couple's own photos become chat background (with blur + overlay for readability)

---

## Questions & Decisions

| Question | Decision |
|----------|----------|
| Should UI theme affect chat theme? | **No** — Independent. Couple can have dark UI + light chat theme |
| Should partner see theme changes in realtime? | **Yes** — Realtime sync is core feature. Should be instant. |
| What if one partner doesn't like the chat theme? | Either can change it (affects both). Ideally, both must agree, but that's UX polish for v1.1 |
| Can couple revert to previous background? | **Yes** — Store last 5 backgrounds, show "Recent" section in gallery |
| How are theme backgrounds loaded? | **Statically** — Preloaded from app bundle, leading to zero latency and cost. |
| Should backgrounds have text overlay? | **Yes** — Darken/blur background behind message bubbles for readability |

---

*Built with love for visual diversity. Let's make TwoOfUs beautifully unique for every couple.* 🎨💌
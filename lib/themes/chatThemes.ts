import type { ChatTheme } from '@/types';

export interface ChatThemeTokens {
    myBubble: {
        background: string;
        color: string;
        borderRadius: string;
        border: string;
        boxShadow: string;
        backdropFilter?: string;
        fontFamily?: string;
        fontWeight?: string;
        padding: string;
        transform?: string;
        borderBottomWidth?: string;
    };
    theirBubble: {
        background: string;
        color: string;
        borderRadius: string;
        border: string;
        boxShadow: string;
        backdropFilter?: string;
        fontFamily?: string;
        fontWeight?: string;
        padding: string;
        transform?: string;
        borderBottomWidth?: string;
    };
    containerBg: string; // CSS background value for the chat window
    defaultBgImage: string; // path to bundled background image
}

export const chatThemes: Record<ChatTheme, ChatThemeTokens> = {
    'soft-blush': {
        myBubble: {
            background: 'linear-gradient(135deg, #ffe0ec, #ffc9d8)',
            color: '#4a0e4e',
            borderRadius: '20px 20px 4px 20px',
            border: 'none',
            boxShadow: '0 4px 12px rgba(255, 192, 203, 0.2)',
            padding: '12px 16px',
        },
        theirBubble: {
            background: '#fff5f7',
            color: '#4a0e4e',
            borderRadius: '20px 20px 20px 4px',
            border: '1px solid #ffc9dc',
            boxShadow: 'none',
            padding: '12px 16px',
        },
        containerBg: 'linear-gradient(180deg, #fff0f5 0%, #ffe4ec 100%)',
        defaultBgImage: '/chat-bg/soft-blush.webp',
    },
    'bold-gradient': {
        myBubble: {
            background: 'linear-gradient(135deg, #ff6b6b, #ff8e53)',
            color: '#ffffff',
            borderRadius: '16px',
            border: 'none',
            boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)',
            fontWeight: '500',
            padding: '12px 16px',
        },
        theirBubble: {
            background: 'linear-gradient(135deg, #4ecdc4, #44a08d)',
            color: '#ffffff',
            borderRadius: '16px',
            border: 'none',
            boxShadow: '0 4px 15px rgba(78, 205, 196, 0.3)',
            padding: '12px 16px',
        },
        containerBg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        defaultBgImage: '/chat-bg/bold-gradient.webp',
    },
    'minimal-light': {
        myBubble: {
            background: '#e0f2fe',
            color: '#0c4a6e',
            borderRadius: '12px',
            border: 'none',
            boxShadow: 'none',
            padding: '10px 14px',
        },
        theirBubble: {
            background: '#f3f4f6',
            color: '#374151',
            borderRadius: '12px',
            border: 'none',
            boxShadow: 'none',
            padding: '10px 14px',
        },
        containerBg: '#f8fafc',
        defaultBgImage: '/chat-bg/minimal-light.webp',
    },
    'dark-elegant': {
        myBubble: {
            background: 'rgba(255, 77, 109, 0.8)',
            color: '#ffffff',
            borderRadius: '16px',
            border: '1px solid rgba(255, 77, 109, 0.5)',
            boxShadow: '0 4px 20px rgba(255, 77, 109, 0.15)',
            backdropFilter: 'blur(10px)',
            padding: '12px 16px',
        },
        theirBubble: {
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#e5e7eb',
            borderRadius: '16px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            backdropFilter: 'blur(10px)',
            padding: '12px 16px',
        },
        containerBg: '#0a0a0a',
        defaultBgImage: '/chat-bg/dark-elegant.webp',
    },
    'playful-bubbles': {
        myBubble: {
            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
            color: '#78350f',
            borderRadius: '32px',
            border: 'none',
            boxShadow: '0 4px 15px rgba(251, 191, 36, 0.3)',
            fontWeight: '600',
            padding: '14px 18px',
        },
        theirBubble: {
            background: 'linear-gradient(135deg, #86efac, #4ade80)',
            color: '#15803d',
            borderRadius: '32px',
            border: 'none',
            boxShadow: '0 4px 15px rgba(134, 239, 172, 0.3)',
            fontWeight: '600',
            padding: '14px 18px',
        },
        containerBg: 'linear-gradient(180deg, #fef9c3 0%, #dcfce7 100%)',
        defaultBgImage: '/chat-bg/playful-bubbles.webp',
    },
    'neon-glow': {
        myBubble: {
            background: 'transparent',
            color: '#ff00ff',
            borderRadius: '4px',
            border: '2px solid #ff00ff',
            boxShadow: '0 0 10px rgba(255, 0, 255, 0.5), inset 0 0 10px rgba(255, 0, 255, 0.1)',
            fontFamily: 'monospace',
            padding: '10px 14px',
        },
        theirBubble: {
            background: 'transparent',
            color: '#00ffff',
            borderRadius: '4px',
            border: '2px solid #00ffff',
            boxShadow: '0 0 10px rgba(0, 255, 255, 0.5), inset 0 0 10px rgba(0, 255, 255, 0.1)',
            fontFamily: 'monospace',
            padding: '10px 14px',
        },
        containerBg: '#050505',
        defaultBgImage: '/chat-bg/neon-glow.webp',
    },
    'watercolor': {
        myBubble: {
            background: 'linear-gradient(135deg, #fca5a5, #fbbf24)',
            color: '#7c2d12',
            borderRadius: '20px',
            border: 'none',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            padding: '12px 16px',
        },
        theirBubble: {
            background: 'linear-gradient(135deg, #a5f3fc, #86efac)',
            color: '#164e63',
            borderRadius: '20px',
            border: 'none',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.08)',
            padding: '12px 16px',
        },
        containerBg: 'linear-gradient(180deg, #fef3c7 0%, #dbeafe 50%, #dcfce7 100%)',
        defaultBgImage: '/chat-bg/watercolor.webp',
    },
    'film-strip': {
        myBubble: {
            background: '#fffbeb',
            color: '#1f2937',
            borderRadius: '2px',
            border: '6px solid #fffbeb',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            padding: '8px 12px',
            transform: 'rotate(-1deg)',
            borderBottomWidth: '24px',
        },
        theirBubble: {
            background: '#f3f4f6',
            color: '#111827',
            borderRadius: '2px',
            border: '6px solid #f3f4f6',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.12)',
            padding: '8px 12px',
            transform: 'rotate(1deg)',
            borderBottomWidth: '24px',
        },
        containerBg: '#1c1917',
        defaultBgImage: '/chat-bg/film-strip.webp',
    },
    'glassmorphic': {
        myBubble: {
            background: 'rgba(255, 77, 109, 0.15)',
            color: '#fff5fa',
            borderRadius: '20px',
            border: '1px solid rgba(255, 77, 109, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(20px)',
            padding: '12px 16px',
        },
        theirBubble: {
            background: 'rgba(255, 255, 255, 0.06)',
            color: '#d1d5db',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            backdropFilter: 'blur(20px)',
            padding: '12px 16px',
        },
        containerBg: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        defaultBgImage: '/chat-bg/glassmorphic.webp',
    },
    'couple-custom': {
        myBubble: {
            background: '#ffe0ec',
            color: '#333333',
            borderRadius: '20px 20px 4px 20px',
            border: 'none',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
            padding: '12px 16px',
        },
        theirBubble: {
            background: '#fff5f7',
            color: '#333333',
            borderRadius: '20px 20px 20px 4px',
            border: '1px solid #ffc9dc',
            boxShadow: 'none',
            padding: '12px 16px',
        },
        containerBg: '#0a0a0a',
        defaultBgImage: '/chat-bg/soft-blush.webp',
    },
};

/** Metadata for rendering chat theme picker cards */
export const chatThemeMeta: Array<{ id: ChatTheme; label: string; mood: string; previewColors: [string, string] }> = [
    { id: 'soft-blush', label: 'Soft Blush', mood: 'Intimate', previewColors: ['#ffe0ec', '#fff5f7'] },
    { id: 'bold-gradient', label: 'Bold Gradient', mood: 'Energetic', previewColors: ['#ff6b6b', '#4ecdc4'] },
    { id: 'minimal-light', label: 'Minimal Light', mood: 'Clean', previewColors: ['#e0f2fe', '#f3f4f6'] },
    { id: 'dark-elegant', label: 'Dark Elegant', mood: 'Sophisticated', previewColors: ['#ff4d6d', '#1a1a1a'] },
    { id: 'playful-bubbles', label: 'Playful Bubbles', mood: 'Fun', previewColors: ['#fbbf24', '#86efac'] },
    { id: 'neon-glow', label: 'Neon Glow', mood: 'Cyberpunk', previewColors: ['#ff00ff', '#00ffff'] },
    { id: 'watercolor', label: 'Watercolor', mood: 'Artistic', previewColors: ['#fca5a5', '#a5f3fc'] },
    { id: 'film-strip', label: 'Film Strip', mood: 'Nostalgic', previewColors: ['#fffbeb', '#f3f4f6'] },
    { id: 'glassmorphic', label: 'Glassmorphic', mood: 'Premium', previewColors: ['rgba(255,77,109,0.3)', 'rgba(255,255,255,0.1)'] },
    { id: 'couple-custom', label: 'Custom', mood: 'Unique', previewColors: ['#ffe0ec', '#e0f2fe'] },
];

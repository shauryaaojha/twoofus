import type { UITheme } from '@/types';

export interface ThemeTokens {
    bgPrimary: string;
    bgSecondary: string;
    bgCard: string;
    textPrimary: string;
    textSecondary: string;
    accent: string;
    border: string;
    glass: string;
    msgMine: string;
    msgTheirs: string;
    // Extra tokens for matching the existing MD3 system
    surfaceContainer: string;
    surfaceContainerHigh: string;
    outline: string;
    outlineVariant: string;
    colorScheme: 'dark' | 'light';
    // Text color on accent bubbles
    msgMineText: string;
    msgTheirsText: string;
}

export const uiThemes: Record<UITheme, ThemeTokens> = {
    midnight: {
        bgPrimary: '#080808',
        bgSecondary: '#111111',
        bgCard: '#161616',
        textPrimary: '#f8f8f8',
        textSecondary: '#888888',
        accent: '#ff4d6d',
        border: 'rgba(255, 255, 255, 0.06)',
        glass: 'rgba(255, 255, 255, 0.04)',
        msgMine: 'linear-gradient(135deg, #ff4d6d, #c9184a)',
        msgTheirs: '#1e1e1e',
        surfaceContainer: '#1a1a1a',
        surfaceContainerHigh: '#252525',
        outline: '#666666',
        outlineVariant: '#333333',
        colorScheme: 'dark',
        msgMineText: '#ffffff',
        msgTheirsText: '#e5e7eb',
    },
    sunrise: {
        bgPrimary: '#fffbf0',
        bgSecondary: '#fef3c7',
        bgCard: '#fff9e6',
        textPrimary: '#1f2937',
        textSecondary: '#6b7280',
        accent: '#f59e0b',
        border: 'rgba(0, 0, 0, 0.08)',
        glass: 'rgba(255, 255, 255, 0.7)',
        msgMine: 'linear-gradient(135deg, #f59e0b, #d97706)',
        msgTheirs: '#fef3c7',
        surfaceContainer: '#fde68a',
        surfaceContainerHigh: '#fcd34d',
        outline: '#9ca3af',
        outlineVariant: 'rgba(0, 0, 0, 0.1)',
        colorScheme: 'light',
        msgMineText: '#ffffff',
        msgTheirsText: '#1f2937',
    },
    forest: {
        bgPrimary: '#042f2e',
        bgSecondary: '#064e3b',
        bgCard: '#065f46',
        textPrimary: '#ecfdf5',
        textSecondary: '#a7f3d0',
        accent: '#10b981',
        border: 'rgba(16, 185, 129, 0.2)',
        glass: 'rgba(16, 185, 129, 0.08)',
        msgMine: 'linear-gradient(135deg, #059669, #10b981)',
        msgTheirs: 'rgba(16, 185, 129, 0.15)',
        surfaceContainer: '#064e3b',
        surfaceContainerHigh: '#047857',
        outline: '#6ee7b7',
        outlineVariant: 'rgba(16, 185, 129, 0.3)',
        colorScheme: 'dark',
        msgMineText: '#ffffff',
        msgTheirsText: '#d1fae5',
    },
    ocean: {
        bgPrimary: '#082f49',
        bgSecondary: '#0c4a6e',
        bgCard: '#164e63',
        textPrimary: '#e0f2fe',
        textSecondary: '#7dd3fc',
        accent: '#06b6d4',
        border: 'rgba(6, 182, 212, 0.15)',
        glass: 'rgba(6, 182, 212, 0.06)',
        msgMine: 'linear-gradient(135deg, #0891b2, #06b6d4)',
        msgTheirs: 'rgba(6, 182, 212, 0.12)',
        surfaceContainer: '#0c4a6e',
        surfaceContainerHigh: '#0e7490',
        outline: '#67e8f9',
        outlineVariant: 'rgba(6, 182, 212, 0.2)',
        colorScheme: 'dark',
        msgMineText: '#ffffff',
        msgTheirsText: '#e0f2fe',
    },
    'rose-gold': {
        bgPrimary: '#fdf2f8',
        bgSecondary: '#fce7f3',
        bgCard: '#f3e8ff',
        textPrimary: '#4c0519',
        textSecondary: '#a855f7',
        accent: '#d946ef',
        border: 'rgba(217, 70, 239, 0.15)',
        glass: 'rgba(217, 70, 239, 0.05)',
        msgMine: 'linear-gradient(135deg, #d946ef, #a855f7)',
        msgTheirs: '#fff1f9',
        surfaceContainer: '#fce7f3',
        surfaceContainerHigh: '#f5d0fe',
        outline: '#c084fc',
        outlineVariant: 'rgba(217, 70, 239, 0.2)',
        colorScheme: 'light',
        msgMineText: '#ffffff',
        msgTheirsText: '#4c0519',
    },
    monochrome: {
        bgPrimary: '#000000',
        bgSecondary: '#111111',
        bgCard: '#1a1a1a',
        textPrimary: '#ffffff',
        textSecondary: '#999999',
        accent: '#ffffff',
        border: 'rgba(255, 255, 255, 0.12)',
        glass: 'rgba(255, 255, 255, 0.04)',
        msgMine: '#ffffff',
        msgTheirs: '#222222',
        surfaceContainer: '#1a1a1a',
        surfaceContainerHigh: '#333333',
        outline: '#666666',
        outlineVariant: 'rgba(255, 255, 255, 0.2)',
        colorScheme: 'dark',
        msgMineText: '#000000',
        msgTheirsText: '#e5e7eb',
    },
    cyberpunk: {
        bgPrimary: '#0a0a0a',
        bgSecondary: '#12001f',
        bgCard: '#1a0033',
        textPrimary: '#e0ffe0',
        textSecondary: '#ff00ff',
        accent: '#ff00ff',
        border: 'rgba(255, 0, 255, 0.2)',
        glass: 'rgba(255, 0, 255, 0.06)',
        msgMine: 'linear-gradient(135deg, #ff00ff, #00ffff)',
        msgTheirs: '#1a0033',
        surfaceContainer: '#12001f',
        surfaceContainerHigh: '#2d005c',
        outline: '#ff00ff',
        outlineVariant: 'rgba(255, 0, 255, 0.3)',
        colorScheme: 'dark',
        msgMineText: '#ffffff',
        msgTheirsText: '#e0ffe0',
    },
};

/** Metadata for rendering theme pills in the picker */
export const uiThemeMeta: Array<{ id: UITheme; label: string; colors: [string, string]; emoji: string }> = [
    { id: 'midnight', label: 'Midnight', colors: ['#080808', '#ff4d6d'], emoji: '🌙' },
    { id: 'sunrise', label: 'Sunrise', colors: ['#fef3c7', '#f59e0b'], emoji: '🌅' },
    { id: 'forest', label: 'Forest', colors: ['#064e3b', '#10b981'], emoji: '🌲' },
    { id: 'ocean', label: 'Ocean', colors: ['#0c4a6e', '#06b6d4'], emoji: '🌊' },
    { id: 'rose-gold', label: 'Rose Gold', colors: ['#fce7f3', '#d946ef'], emoji: '🌸' },
    { id: 'monochrome', label: 'Monochrome', colors: ['#000000', '#ffffff'], emoji: '◾' },
    { id: 'cyberpunk', label: 'Cyberpunk', colors: ['#0f0f0f', '#ff00ff'], emoji: '⚡' },
];

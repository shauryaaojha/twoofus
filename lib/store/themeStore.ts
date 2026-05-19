import { create } from 'zustand';
import type { UITheme, ChatTheme } from '@/types';
import { uiThemes } from '@/lib/themes/colorTokens';

interface ThemeState {
    // UI Theme (per-user)
    uiTheme: UITheme;
    setUiTheme: (theme: UITheme) => void;

    // Chat Theme (per-couple)
    chatTheme: ChatTheme;
    setChatTheme: (theme: ChatTheme) => void;

    // Chat Background
    chatBgUrl: string | null;
    setChatBgUrl: (url: string | null) => void;

    // Custom colors for couple-custom theme
    customColors: { myColor: string; theirColor: string; shape: 'pill' | 'rounded' | 'square' } | null;
    setCustomColors: (colors: { myColor: string; theirColor: string; shape: 'pill' | 'rounded' | 'square' } | null) => void;

    // Apply theme CSS variables to document
    applyTheme: (theme: UITheme) => void;
}

function applyThemeToDOM(theme: UITheme) {
    if (typeof document === 'undefined') return;

    const tokens = uiThemes[theme];
    const root = document.documentElement;

    root.setAttribute('data-theme', theme);

    // Set CSS custom properties
    root.style.setProperty('--theme-bg-primary', tokens.bgPrimary);
    root.style.setProperty('--theme-bg-secondary', tokens.bgSecondary);
    root.style.setProperty('--theme-bg-card', tokens.bgCard);
    root.style.setProperty('--theme-text-primary', tokens.textPrimary);
    root.style.setProperty('--theme-text-secondary', tokens.textSecondary);
    root.style.setProperty('--theme-accent', tokens.accent);
    root.style.setProperty('--theme-border', tokens.border);
    root.style.setProperty('--theme-glass', tokens.glass);
    root.style.setProperty('--theme-msg-mine', tokens.msgMine);
    root.style.setProperty('--theme-msg-theirs', tokens.msgTheirs);
    root.style.setProperty('--theme-surface-container', tokens.surfaceContainer);
    root.style.setProperty('--theme-surface-container-high', tokens.surfaceContainerHigh);
    root.style.setProperty('--theme-outline', tokens.outline);
    root.style.setProperty('--theme-outline-variant', tokens.outlineVariant);
    root.style.setProperty('--theme-msg-mine-text', tokens.msgMineText);
    root.style.setProperty('--theme-msg-theirs-text', tokens.msgTheirsText);

    // Update color-scheme for browser native elements
    root.style.colorScheme = tokens.colorScheme;

    // Update meta theme-color for mobile browsers
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', tokens.bgPrimary);
}

export const useThemeStore = create<ThemeState>((set) => ({
    uiTheme: 'midnight',
    setUiTheme: (theme) => {
        applyThemeToDOM(theme);
        set({ uiTheme: theme });
    },

    chatTheme: 'soft-blush',
    setChatTheme: (theme) => set({ chatTheme: theme }),

    chatBgUrl: null,
    setChatBgUrl: (url) => set({ chatBgUrl: url }),

    customColors: null,
    setCustomColors: (colors) => set({ customColors: colors }),

    applyTheme: (theme) => {
        applyThemeToDOM(theme);
        set({ uiTheme: theme });
    },
}));

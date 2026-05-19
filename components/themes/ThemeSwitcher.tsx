'use client';

import { useThemeStore } from '@/lib/store/themeStore';
import { changeUiTheme } from '@/hooks/useTheme';
import { uiThemeMeta } from '@/lib/themes/colorTokens';
import type { UITheme } from '@/types';
import { useToastStore } from '@/lib/store/toastStore';

export default function ThemeSwitcher() {
    const currentTheme = useThemeStore((s) => s.uiTheme);
    const showToast = useToastStore((s) => s.show);

    const handleThemeChange = async (themeId: UITheme) => {
        try {
            await changeUiTheme(themeId);
        } catch {
            showToast('Failed to save theme', 'error');
        }
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {uiThemeMeta.map((theme) => {
                const isActive = currentTheme === theme.id;
                return (
                    <button
                        key={theme.id}
                        onClick={() => handleThemeChange(theme.id)}
                        className={`
              relative overflow-hidden rounded-2xl border-2 transition-all duration-300
              ${isActive ? 'border-primary ring-2 ring-primary/20 scale-100 shadow-md' : 'border-surface-variant hover:border-outline scale-95 opacity-80 hover:opacity-100'}
            `}
                    >
                        {/* Color Preview Block */}
                        <div
                            className="h-20 w-full flex relative overflow-hidden"
                            style={{ backgroundColor: theme.colors[0] }}
                        >
                            <div
                                className="absolute top-0 right-0 bottom-0 w-1/3 skew-x-12 translate-x-4"
                                style={{ backgroundColor: theme.colors[1] }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center opacity-80">
                                <span className="text-2xl drop-shadow-md">{theme.emoji}</span>
                            </div>
                        </div>

                        {/* Label */}
                        <div className={`
              py-2 px-3 text-center text-sm font-medium
              ${isActive ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface'}
            `}>
                            {theme.label}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}

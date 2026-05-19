'use client';

import { useThemeStore } from '@/lib/store/themeStore';
import { changeChatTheme } from '@/hooks/useTheme';
import { chatThemeMeta, chatThemes } from '@/lib/themes/chatThemes';
import type { ChatTheme } from '@/types';
import { useToastStore } from '@/lib/store/toastStore';

export default function ChatThemePicker() {
    const currentTheme = useThemeStore((s) => s.chatTheme);
    const showToast = useToastStore((s) => s.show);

    const handleThemeChange = async (themeId: ChatTheme) => {
        try {
            await changeChatTheme(themeId);
        } catch {
            showToast('Failed to save chat theme', 'error');
        }
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Horizontal Scroll Area for Chat Themes */}
            <div className="flex overflow-x-auto gap-4 pb-4 -mx-5 px-5 md:mx-0 md:px-0 hide-scrollbar snap-x">
                {chatThemeMeta.map((theme) => {
                    const isActive = currentTheme === theme.id;
                    const tokens = chatThemes[theme.id];

                    return (
                        <button
                            key={theme.id}
                            onClick={() => handleThemeChange(theme.id)}
                            className={`
                flex-shrink-0 w-36 flex flex-col items-center gap-2 snap-center
                transition-transform duration-300 ${isActive ? 'scale-105' : 'scale-95 opacity-80'}
              `}
                        >
                            {/* Preview Card */}
                            <div
                                className={`
                  w-full h-48 rounded-2xl border-4 relative overflow-hidden flex flex-col justify-end p-2 gap-2
                  ${isActive ? 'border-primary shadow-lg shadow-primary/20' : 'border-surface-variant/50'}
                `}
                                style={{ background: tokens.containerBg }}
                            >
                                {/* Simulated partner bubble */}
                                <div
                                    className="w-[85%] self-start text-[8px] p-1.5"
                                    style={{
                                        background: tokens.theirBubble.background,
                                        color: tokens.theirBubble.color,
                                        borderRadius: tokens.theirBubble.borderRadius,
                                        border: tokens.theirBubble.border,
                                        boxShadow: tokens.theirBubble.boxShadow,
                                        backdropFilter: tokens.theirBubble.backdropFilter,
                                    }}
                                >
                                    Hey, how are you?
                                </div>
                                {/* Simulated my bubble */}
                                <div
                                    className="w-[85%] self-end text-[8px] p-1.5"
                                    style={{
                                        background: tokens.myBubble.background,
                                        color: tokens.myBubble.color,
                                        borderRadius: tokens.myBubble.borderRadius,
                                        border: tokens.myBubble.border,
                                        boxShadow: tokens.myBubble.boxShadow,
                                        backdropFilter: tokens.myBubble.backdropFilter,
                                    }}
                                >
                                    Thinking of you!
                                </div>
                            </div>

                            {/* Label */}
                            <div className="text-center">
                                <p className={`font-medium text-sm ${isActive ? 'text-primary' : 'text-on-surface'}`}>{theme.label}</p>
                                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">{theme.mood}</p>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/lib/store/themeStore';
import { useAuthStore } from '@/lib/store/authStore';
import { getSupabase } from '@/lib/supabase/client';
import type { UITheme, ChatTheme } from '@/types';

/**
 * Hook that initializes theme from the user's profile and couple data,
 * and provides methods to change themes with Supabase persistence.
 */
export function useThemeInit() {
    const { profile, couple } = useAuthStore();
    const { applyTheme, setChatTheme, setChatBgUrl, setCustomColors } = useThemeStore();

    // Initialize UI theme from profile
    useEffect(() => {
        if (profile?.ui_theme) {
            applyTheme(profile.ui_theme);
        }
    }, [profile?.ui_theme, applyTheme]);

    // Initialize chat theme from couple
    useEffect(() => {
        if (couple?.chat_theme) {
            setChatTheme(couple.chat_theme);
        }
        if (couple?.chat_bg_url !== undefined) {
            setChatBgUrl(couple.chat_bg_url);
        }
        if (couple?.chat_bg_custom_colors !== undefined) {
            setCustomColors(couple.chat_bg_custom_colors);
        }
    }, [couple?.chat_theme, couple?.chat_bg_url, couple?.chat_bg_custom_colors, setChatTheme, setChatBgUrl, setCustomColors]);

    // Realtime Sync for Couples (Chat Theme/BG changes)
    useEffect(() => {
        if (!couple?.id) return;

        const supabase = getSupabase();

        const channel = supabase
            .channel(`couples_theme_${couple.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'couples',
                    filter: `id=eq.${couple.id}`,
                },
                (payload) => {
                    const updatedCouple = payload.new;

                    if (updatedCouple.chat_theme && updatedCouple.chat_theme !== useThemeStore.getState().chatTheme) {
                        setChatTheme(updatedCouple.chat_theme);
                        useAuthStore.getState().setCouple({ ...useAuthStore.getState().couple, chat_theme: updatedCouple.chat_theme } as any);
                    }

                    if (updatedCouple.chat_bg_url !== undefined && updatedCouple.chat_bg_url !== useThemeStore.getState().chatBgUrl) {
                        setChatBgUrl(updatedCouple.chat_bg_url);
                        useAuthStore.getState().setCouple({ ...useAuthStore.getState().couple, chat_bg_url: updatedCouple.chat_bg_url } as any);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [couple?.id, setChatTheme, setChatBgUrl]);
}

/**
 * Change the UI theme and persist to Supabase
 */
export async function changeUiTheme(theme: UITheme) {
    const store = useThemeStore.getState();
    const { user } = useAuthStore.getState();

    // Apply immediately for instant feedback
    store.applyTheme(theme);

    // Persist to DB
    if (user?.id) {
        const supabase = getSupabase();
        await supabase
            .from('profiles')
            .update({ ui_theme: theme })
            .eq('id', user.id);
    }
}

/**
 * Change the chat theme and persist to Supabase
 */
export async function changeChatTheme(theme: ChatTheme) {
    const store = useThemeStore.getState();
    const { couple } = useAuthStore.getState();

    store.setChatTheme(theme);

    if (couple?.id) {
        const supabase = getSupabase();
        await supabase
            .from('couples')
            .update({ chat_theme: theme })
            .eq('id', couple.id);
    }
}

/**
 * Change the chat background URL and persist to Supabase
 */
export async function changeChatBg(url: string | null) {
    const store = useThemeStore.getState();
    const { couple } = useAuthStore.getState();

    store.setChatBgUrl(url);

    if (couple?.id) {
        const supabase = getSupabase();
        await supabase
            .from('couples')
            .update({ chat_bg_url: url })
            .eq('id', couple.id);
    }
}

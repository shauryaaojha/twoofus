'use client';

import { useThemeStore } from '@/lib/store/themeStore';
import { changeChatBg } from '@/hooks/useTheme';
import { useToastStore } from '@/lib/store/toastStore';
import { useState } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/store/authStore';

// Mock list of bundled backgrounds
const PRELOADED_BGS = Array.from({ length: 15 }, (_, i) => `/chat-bg/bg-${i + 1}.png`);

export default function ChatBgGallery() {
    const currentBg = useThemeStore((s) => s.chatBgUrl);
    const showToast = useToastStore((s) => s.show);
    const { couple } = useAuthStore();
    const [uploading, setUploading] = useState(false);
    const [activeTab, setActiveTab] = useState<'gallery' | 'custom'>('gallery');

    const handleSelectBg = async (url: string | null) => {
        try {
            await changeChatBg(url);
        } catch {
            showToast('Failed to save background', 'error');
        }
    };

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !couple?.id) return;

        if (file.size > 5 * 1024 * 1024) {
            showToast('Image must be under 5MB', 'error');
            return;
        }

        setUploading(true);
        const supabase = getSupabase();

        try {
            // Note: Assumes a public storage bucket named "chat-backgrounds" exists
            const fileName = `${couple.id}/${Date.now()}-${file.name}`;
            const { data, error } = await supabase.storage
                .from('chat-backgrounds')
                .upload(fileName, file, { cacheControl: '3600', upsert: false });

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('chat-backgrounds')
                .getPublicUrl(data.path);

            await handleSelectBg(publicUrl);
            showToast('Custom background applied!', 'success');
        } catch (err: any) {
            console.error(err);
            showToast(err.message || 'Upload failed', 'error');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col gap-6">
            {/* Tabs */}
            <div className="flex p-1 bg-surface-variant/30 rounded-xl max-w-xs mx-auto">
                <button
                    onClick={() => setActiveTab('gallery')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'gallery' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant'}`}
                >
                    Gallery
                </button>
                <button
                    onClick={() => setActiveTab('custom')}
                    className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === 'custom' ? 'bg-surface text-primary shadow-sm' : 'text-on-surface-variant'}`}
                >
                    Custom Photo
                </button>
            </div>

            {/* Default (No Background) Option */}
            <div className="flex justify-center">
                <button
                    onClick={() => handleSelectBg(null)}
                    className={`px-4 py-2 border rounded-full text-sm transition-colors ${!currentBg ? 'border-primary text-primary bg-primary/10' : 'border-surface-variant text-on-surface hover:bg-surface-variant/30'}`}
                >
                    Remove Background
                </button>
            </div>

            {activeTab === 'gallery' ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {PRELOADED_BGS.map((bg) => (
                        <button
                            key={bg}
                            onClick={() => handleSelectBg(bg)}
                            className={`
                relative aspect-[9/16] rounded-xl overflow-hidden border-2 transition-transform duration-200
                ${currentBg === bg ? 'border-primary scale-105 shadow-lg shadow-primary/20' : 'border-surface-variant hover:border-outline opacity-80 hover:opacity-100'}
              `}
                        >
                            {/* Using CSS gradient as placeholder since real images are missing */}
                            <div
                                className="absolute inset-0 bg-cover bg-center"
                                style={{
                                    backgroundImage: `url(${bg}), linear-gradient(135deg, var(--theme-surface-container), var(--theme-surface-container-high))`
                                }}
                            />
                            {currentBg === bg && (
                                <div className="absolute top-2 right-2 flex items-center justify-center w-6 h-6 bg-primary text-on-primary rounded-full shadow-md">
                                    <span className="material-symbols-outlined text-[14px]">check</span>
                                </div>
                            )}
                        </button>
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center gap-4 py-8 border-2 border-dashed border-outline-variant rounded-2xl bg-surface-container/30">
                    <span className="material-symbols-outlined text-4xl text-on-surface-variant">image</span>
                    <p className="text-on-surface text-sm text-center px-6">
                        Upload a photo to use as your custom chat background. It will be shared with your partner.
                    </p>
                    <label className={`cursor-pointer py-3 px-6 rounded-full bg-primary text-on-primary font-medium hover:bg-primary/90 transition-colors flex items-center gap-2 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                        <span className="material-symbols-outlined">{uploading ? 'sync' : 'upload'}</span>
                        {uploading ? 'Uploading...' : 'Choose Photo'}
                        <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" onChange={handleUpload} disabled={uploading} />
                    </label>
                </div>
            )}
        </div>
    );
}

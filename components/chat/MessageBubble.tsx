'use client';

import { useState, useEffect } from 'react';
import type { Message } from '@/types';
import { getSupabase } from '@/lib/supabase/client';
import { decryptFile, decryptSymmetricKey } from '@/lib/crypto/e2ee';
import { getMyKeys } from '@/lib/crypto/keyManager';
import { useAuthStore } from '@/lib/store/authStore';
import { decodeBase64 } from 'tweetnacl-util';
import { useToastStore } from '@/lib/store/toastStore';

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function E2EEImage({
  metadataStr,
  partnerPubKeyB64,
}: {
  metadataStr: string;
  partnerPubKeyB64: string;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    let active = true;
    let url: string | null = null;

    async function loadAndDecrypt() {
      try {
        const metadata = JSON.parse(metadataStr);
        const { storagePath, encryptedKey, keyNonce, fileNonce } = metadata;

        if (!storagePath || !encryptedKey || !keyNonce || !fileNonce) {
          throw new Error('Invalid photo metadata');
        }

        const keys = getMyKeys();
        if (!keys) throw new Error('Encryption keys not loaded');

        const partnerPub = decodeBase64(partnerPubKeyB64);

        // Decrypt symmetric key
        const symKey = decryptSymmetricKey(encryptedKey, keyNonce, partnerPub, keys.secretKey);
        if (!symKey) throw new Error('Failed to decrypt photo key');

        // Download encrypted photo bytes
        const supabase = getSupabase();
        const { data, error: downloadError } = await supabase.storage
          .from('photos')
          .download(storagePath);

        if (downloadError) throw downloadError;
        if (!data) throw new Error('No photo data received');

        const arrayBuffer = await data.arrayBuffer();
        const encryptedBytes = new Uint8Array(arrayBuffer);

        // Decrypt file bytes
        const decryptedBytes = decryptFile(encryptedBytes, symKey, decodeBase64(fileNonce));
        if (!decryptedBytes) throw new Error('Photo decryption failed');

        if (active) {
          const blob = new Blob([decryptedBytes as any], { type: 'image/jpeg' });
          url = URL.createObjectURL(blob);
          setImageUrl(url);
        }
      } catch (err: any) {
        console.error(err);
        if (active) setError(err.message || 'Decryption failed');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadAndDecrypt();

    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [metadataStr, partnerPubKeyB64]);

  if (loading) {
    return (
      <div className="w-full h-48 bg-surface-variant/30 flex flex-col items-center justify-center rounded-xl gap-2 mt-2">
        <span className="material-symbols-outlined animate-spin text-primary">sync</span>
        <span className="text-xs text-on-surface-variant/60">Decrypting secure photo...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-40 bg-error/10 border border-error/20 flex flex-col items-center justify-center rounded-xl gap-2 text-error mt-2">
        <span className="material-symbols-outlined">broken_image</span>
        <span className="text-xs">{error}</span>
      </div>
    );
  }

  return (
    <>
      <div className="mt-2 rounded-xl overflow-hidden cursor-pointer group relative shadow-md" onClick={() => setLightboxOpen(true)}>
        <img
          src={imageUrl!}
          alt="Shared Secure Image"
          className="w-full max-h-[320px] object-cover hover:scale-102 transition-transform duration-300"
        />
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-[32px]">fullscreen</span>
        </div>
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 bg-background/95 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
          onClick={() => setLightboxOpen(false)}
        >
          <img
            src={imageUrl!}
            alt="Zoomed Shared Image"
            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
          />
          <button className="absolute top-4 right-4 bg-surface-container/60 hover:bg-surface-container text-on-surface p-2 rounded-full transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}
    </>
  );
}

export default function MessageBubble({ message, isMine }: { message: Message; isMine: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { partner } = useAuthStore();
  const { show: showToast } = useToastStore();
  const isDeleted = !!message.deleted_at;

  const handleReact = async (emoji: string) => {
    try {
      const supabase = getSupabase();
      const newReaction = message.reaction === emoji ? null : emoji;
      await supabase
        .from('messages')
        .update({ reaction: newReaction })
        .eq('id', message.id);
      setMenuOpen(false);
    } catch (err) {
      showToast('Failed to send reaction', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      const supabase = getSupabase();
      await supabase
        .from('messages')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', message.id);
      showToast('Message deleted', 'success');
      setMenuOpen(false);
    } catch (err) {
      showToast('Failed to delete message', 'error');
    }
  };

  return (
    <div className={`flex flex-col relative group ${isMine ? 'items-end' : 'items-start'}`}>
      <div className={`flex items-center gap-2 max-w-[75%] md:max-w-[60%]`}>
        {isMine && !isDeleted && (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-primary transition-opacity p-1 rounded-full bg-surface-container/30 hover:bg-surface-container/80 flex-shrink-0"
            aria-label="Message options"
          >
            <span className="material-symbols-outlined text-[18px]">more_vert</span>
          </button>
        )}

        <div
          className={`px-4 py-3 relative ${
            isMine
              ? 'bg-gradient-to-br from-primary-container to-primary-container/85 text-on-primary-container rounded-[20px] rounded-br-md shadow-sm'
              : 'glass-card text-on-surface rounded-[20px] rounded-bl-md shadow-sm'
          }`}
        >
          {isDeleted ? (
            <p className="italic text-on-surface-variant/60 text-sm">Message deleted</p>
          ) : (
            <>
              {message.type === 'text' && (
                <p className="text-[16px] leading-[24px] break-words whitespace-pre-wrap" style={{ fontFamily: 'var(--font-body)' }}>
                  {message.plaintext || '[decryption failed]'}
                </p>
              )}
              {message.type === 'photo' && partner?.public_key && (
                <>
                  {message.plaintext && message.plaintext.startsWith('{') ? (
                    <E2EEImage metadataStr={message.plaintext} partnerPubKeyB64={partner.public_key} />
                  ) : (
                    <div className="w-full h-40 bg-surface-variant/30 flex items-center justify-center rounded-xl">
                      <span className="text-xs text-on-surface-variant/60">Decoding photo metadata...</span>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <div className={`flex items-center gap-1.5 mt-1.5 ${isMine ? 'justify-end' : 'justify-start'}`}>
            <span className="text-[10px] leading-[14px] opacity-60" style={{ fontFamily: 'var(--font-mono)' }}>
              {formatTime(message.created_at)}
            </span>
            {isMine && message.seen_at && (
              <span className="material-symbols-outlined text-[13px] text-tertiary" style={{ fontVariationSettings: "'FILL' 1" }}>
                done_all
              </span>
            )}
          </div>

          {/* Reaction display */}
          {message.reaction && (
            <div
              className={`absolute -bottom-2 ${
                isMine ? 'left-3' : 'right-3'
              } bg-surface-container-high border border-outline-variant/20 rounded-full px-1.5 py-0.5 text-xs shadow-md z-10`}
            >
              {message.reaction}
            </div>
          )}
        </div>

        {!isMine && !isDeleted && (
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="opacity-0 group-hover:opacity-100 text-on-surface-variant hover:text-primary transition-opacity p-1 rounded-full bg-surface-container/30 hover:bg-surface-container/80 flex-shrink-0"
            aria-label="Message options"
          >
            <span className="material-symbols-outlined text-[18px]">more_vert</span>
          </button>
        )}
      </div>

      {/* Floating Action Menu */}
      {menuOpen && (
        <div
          className={`absolute z-30 mt-1 top-full ${
            isMine ? 'right-0' : 'left-0'
          } bg-surface-container-high/95 backdrop-blur-xl border border-outline-variant/20 rounded-2xl shadow-xl p-3 flex flex-col gap-2.5 min-w-[200px] animate-fade-in`}
        >
          {/* Reaction row */}
          {!isDeleted && (
            <div className="flex items-center justify-between gap-1 pb-2 border-b border-outline-variant/10">
              {['❤️', '😂', '😮', '😢', '👍', '🔥'].map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleReact(emoji)}
                  className={`text-lg hover:scale-125 transition-transform p-1 rounded-md ${
                    message.reaction === emoji ? 'bg-primary/20' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}

          {/* Actions row */}
          <div className="flex flex-col gap-1 text-sm">
            {isMine && !isDeleted && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2.5 px-3 py-2 text-error hover:bg-error/10 rounded-xl transition-colors w-full text-left"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span>
                <span>Delete for everyone</span>
              </button>
            )}
            <button
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 hover:bg-surface-variant/30 rounded-xl transition-colors w-full text-left"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
              <span>Cancel</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

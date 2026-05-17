'use client';

import { useState, useRef, useEffect } from 'react';
import { getSupabase } from '@/lib/supabase/client';
import { encryptMessage, encryptFile, encryptSymmetricKey } from '@/lib/crypto/e2ee';
import { getMyKeys } from '@/lib/crypto/keyManager';
import { useAuthStore } from '@/lib/store/authStore';
import { decodeBase64, encodeBase64 } from 'tweetnacl-util';
import { usePhotoQuota } from '@/hooks/usePhotoQuota';
import { useToastStore } from '@/lib/store/toastStore';
import { useChatStore } from '@/lib/store/chatStore';

export default function MessageInput() {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const { couple, partner, user, profile } = useAuthStore();
  const { replyToMessage, setReplyToMessage } = useChatStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>['channel']> | null>(null);
  const { canUpload, incrementQuota, remaining } = usePhotoQuota();
  const { show: showToast } = useToastStore();

  // Subscribe to typing channel once
  useEffect(() => {
    if (!couple?.id) return;
    const supabase = getSupabase();
    const channel = supabase.channel(`typing:${couple.id}`);
    channel.subscribe();
    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [couple?.id]);

  const sendTypingIndicator = () => {
    if (!channelRef.current || !user?.id) return;
    channelRef.current.send({ type: 'broadcast', event: 'typing', payload: { userId: user.id } });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      channelRef.current?.send({ type: 'broadcast', event: 'stop_typing', payload: { userId: user?.id } });
    }, 2000);
  };

  const handleSend = async () => {
    if (!text.trim() || !couple?.id || !partner?.public_key || sending) return;
    setSending(true);

    const keys = getMyKeys();
    if (!keys) { setSending(false); return; }

    const partnerPub = decodeBase64(partner.public_key);
    const { ciphertext, nonce } = encryptMessage(text.trim(), partnerPub, keys.secretKey);

    const supabase = getSupabase();
    const { error: insertError } = await supabase.from('messages').insert({
      couple_id: couple.id,
      sender_id: user?.id,
      ciphertext,
      nonce,
      type: 'text',
      reply_to: replyToMessage?.id || null,
    });

    if (!insertError && partner?.id) {
      sendPushNotification(
        partner.id,
        profile?.display_name || 'Partner',
        text.trim()
      );
    }

    setText('');
    setReplyToMessage(null);
    setSending(false);
    inputRef.current?.focus();
  };

  const handlePhotoClick = () => {
    if (!canUpload) {
      showToast('Daily photo quota reached (5 photos max)', 'error');
      return;
    }
    fileInputRef.current?.click();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !couple?.id || !partner?.public_key || !user?.id || sending) return;

    setSending(true);
    showToast('Encrypting and uploading photo...', 'info');

    try {
      const keys = getMyKeys();
      if (!keys) {
        showToast('Decryption keys not loaded. Please re-login.', 'error');
        setSending(false);
        return;
      }

      // 1. Read file as ArrayBuffer & encrypt
      const arrayBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(arrayBuffer);
      const { encrypted, key, nonce } = encryptFile(fileBytes);

      // 2. Encrypt symmetric key with partner's public key
      const partnerPub = decodeBase64(partner.public_key);
      const { encryptedKey, keyNonce } = encryptSymmetricKey(key, partnerPub, keys.secretKey);

      // 3. Upload encrypted file to Supabase Storage
      const supabase = getSupabase();
      const fileExt = file.name.split('.').pop() || 'jpg';
      const storagePath = `${couple.id}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(storagePath, encrypted, {
          contentType: 'application/octet-stream',
          cacheControl: '3600',
        });

      if (uploadError) throw uploadError;

      // 4. Update local and remote photo quota
      const allowed = await incrementQuota();
      if (!allowed) {
        showToast('Daily photo quota reached!', 'error');
        setSending(false);
        return;
      }

      // 5. Insert into photos table
      const { error: photoDbError } = await supabase.from('photos').insert({
        couple_id: couple.id,
        sender_id: user.id,
        storage_path: storagePath,
        encrypted_key: `${encryptedKey}:${keyNonce}`,
        nonce: encodeBase64(nonce),
      });

      if (photoDbError) throw photoDbError;

      // 6. Create message containing E2EE details for partner to decrypt
      const photoMetadata = JSON.stringify({
        storagePath,
        encryptedKey,
        keyNonce,
        fileNonce: encodeBase64(nonce),
      });

      const { ciphertext, nonce: msgNonce } = encryptMessage(photoMetadata, partnerPub, keys.secretKey);

      const { error: messageDbError } = await supabase.from('messages').insert({
        couple_id: couple.id,
        sender_id: user.id,
        ciphertext,
        nonce: msgNonce,
        type: 'photo',
        reply_to: replyToMessage?.id || null,
      });

      if (messageDbError) throw messageDbError;

      if (partner?.id) {
        sendPushNotification(
          partner.id,
          profile?.display_name || 'Partner',
          '📷 Sent a photo'
        );
      }

      setReplyToMessage(null);
      showToast(`Photo shared! (${remaining - 1} remaining today)`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Failed to upload photo', 'error');
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full bg-surface-container/80 backdrop-blur-xl border-t border-outline-variant/10 px-4 py-3 z-10">
      {replyToMessage && (
        <div className="max-w-[1100px] mx-auto mb-3 flex items-center justify-between bg-surface-variant/20 backdrop-blur-md rounded-2xl px-4 py-2 border-l-4 border-primary border border-outline-variant/10 transition-all duration-300">
          <div className="flex-1 min-w-0 pr-4">
            <div className="text-xs text-primary font-bold">
              Replying to {replyToMessage.sender_id === user?.id ? 'You' : (partner?.display_name || 'Partner')}
            </div>
            <div className="text-sm text-on-surface-variant/80 truncate mt-0.5">
              {replyToMessage.type === 'photo' ? '📷 Photo' : (replyToMessage.plaintext || '[encrypted]')}
            </div>
          </div>
          <button
            onClick={() => setReplyToMessage(null)}
            className="text-on-surface-variant/60 hover:text-primary transition-colors flex-shrink-0 p-1 hover:bg-surface-variant/30 rounded-full"
            aria-label="Cancel reply"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>
      )}

      <div className="max-w-[1100px] mx-auto flex items-center gap-3">
        <button
          onClick={handlePhotoClick}
          disabled={sending}
          className="text-on-surface-variant hover:text-primary transition-colors flex-shrink-0 disabled:opacity-50"
          aria-label="Send photo"
        >
          <span className="material-symbols-outlined text-[24px]">photo_camera</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handlePhotoUpload}
        />
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => { setText(e.target.value); sendTypingIndicator(); }}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="w-full bg-surface-variant/30 text-on-surface rounded-full px-5 py-3 text-base outline-none border border-outline-variant/20 focus:border-primary/50 transition-colors placeholder:text-outline"
            style={{ fontFamily: 'var(--font-body)' }}
          />
        </div>
        <button onClick={handleSend} disabled={!text.trim() || sending} aria-label="Send message"
          className="w-12 h-12 rounded-full btn-primary flex items-center justify-center disabled:opacity-30 transition-all flex-shrink-0">
          <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
        </button>
      </div>
    </div>
  );
}

async function sendPushNotification(recipientId: string, title: string, body: string) {
  try {
    await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: recipientId,
        title,
        body,
      }),
    });
  } catch (err) {
    console.error('Failed to send push notification:', err);
  }
}

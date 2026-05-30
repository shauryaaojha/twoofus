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

type Heic2Any = (options: { blob: Blob; toType: string; quality: number }) => Promise<Blob | Blob[]>;
type WindowWithHeic = Window & typeof globalThis & { heic2any?: Heic2Any };
type AiResponse = { text?: string; error?: string };

function getErrorMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export default function MessageInput() {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [showAiPicker, setShowAiPicker] = useState(false);
  const { couple, partner, user, profile } = useAuthStore();
  const { replyToMessage, setReplyToMessage } = useChatStore();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<ReturnType<ReturnType<typeof getSupabase>['channel']> | null>(null);
  const { canUpload, incrementQuota, remaining } = usePhotoQuota();
  const { show: showToast } = useToastStore();

  useEffect(() => {
    // Dynamically load heic2any to avoid Next.js Turbopack crash
    if (typeof window !== 'undefined' && !(window as WindowWithHeic).heic2any) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    input.style.height = 'auto';
    input.style.height = `${Math.min(input.scrollHeight, 128)}px`;
  }, [text]);

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

  const updateText = (value: string) => {
    setText(value);
    setShowAiPicker(/(^|\s)@$/.test(value) || /(^|\s)@a?$/i.test(value));
    sendTypingIndicator();
  };

  const insertAiMention = () => {
    setText((current) => {
      const next = current.replace(/(^|\s)@a?$/i, '$1@ai ');
      return next === current ? `${current}@ai ` : next;
    });
    setShowAiPicker(false);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleSend = async () => {
    if (!text.trim() || !couple?.id || !partner?.public_key || sending) return;
    setSending(true);

    const messageText = text.trim();
    const isAiRequest = messageText.toLowerCase().includes('@ai') || replyToMessage?.type === 'ai';
    const repliedMessageText = (replyToMessage?.type === 'text' || replyToMessage?.type === 'ai') ? replyToMessage.plaintext : undefined;

    const keys = getMyKeys();
    if (!keys) { setSending(false); return; }

    const partnerPub = decodeBase64(partner.public_key);
    const { ciphertext, nonce } = encryptMessage(text.trim(), partnerPub, keys.secretKey);

    const supabase = getSupabase();
    const { data: insertedMessage, error: insertError } = await supabase.from('messages').insert({
      couple_id: couple.id,
      sender_id: user?.id,
      ciphertext,
      nonce,
      type: 'text',
      reply_to: replyToMessage?.id || null,
    }).select('id').single();

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

    if (isAiRequest && insertedMessage) {
      handleAiResponse(messageText, repliedMessageText, insertedMessage.id);
    }
  };

  const handleAiResponse = async (promptText: string, contextText?: string, replyToId?: string) => {
    try {
      showToast('AI is thinking...', 'info');
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, context: contextText }),
      });
      const data = (await res.json()) as AiResponse;
      if (!res.ok) throw new Error(data.error || 'AI request failed');
      if (!data.text) throw new Error('AI returned an empty response');

      const keys = getMyKeys();
      if (!keys || !partner?.public_key || !couple?.id || !user?.id) return;

      const partnerPub = decodeBase64(partner.public_key);
      const { ciphertext, nonce } = encryptMessage(data.text, partnerPub, keys.secretKey);

      const supabase = getSupabase();
      await supabase.from('messages').insert({
        couple_id: couple.id,
        sender_id: user.id, // Using user's ID but type 'ai'
        ciphertext,
        nonce,
        type: 'ai',
        reply_to: replyToId || null,
      });

      if (partner?.id) {
        sendPushNotification(
          partner.id,
          'AI Assistant',
          'Replied in your chat'
        );
      }
    } catch (err: unknown) {
      console.error(err);
      showToast(getErrorMessage(err, 'AI failed to respond'), 'error');
    }
  };

  const handleCameraClick = () => {
    if (!canUpload) {
      showToast('Daily photo quota reached (5 photos max)', 'error');
      return;
    }
    cameraInputRef.current?.click();
  };

  const handlePhotoClick = () => {
    if (!canUpload) {
      showToast('Daily photo quota reached (5 photos max)', 'error');
      return;
    }
    fileInputRef.current?.click();
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file || !couple?.id || !partner?.public_key || !user?.id || sending) return;

    setSending(true);

    try {
      // Handle HEIC/HEIF conversion
      if (file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif') || file.type === 'image/heic' || file.type === 'image/heif') {
        showToast('Converting HEIC image...', 'info');
        const heic2any = (window as WindowWithHeic).heic2any;
        if (!heic2any) throw new Error('HEIC converter not loaded yet. Please try again in a moment.');

        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8
        });
        
        const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        file = new File([blob], file.name.replace(/\.heic$|\.heif$/i, '.jpg'), { type: 'image/jpeg' });
      }

      showToast('Encrypting and uploading photo...', 'info');
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
    } catch (err: unknown) {
      console.error(err);
      showToast(getErrorMessage(err, 'Failed to upload photo'), 'error');
    } finally {
      setSending(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
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
          onClick={handleCameraClick}
          disabled={sending}
          className="text-on-surface-variant hover:text-primary transition-colors flex-shrink-0 disabled:opacity-50"
          aria-label="Take photo"
        >
          <span className="material-symbols-outlined text-[24px]">photo_camera</span>
        </button>
        <button
          onClick={handlePhotoClick}
          disabled={sending}
          className="text-on-surface-variant hover:text-primary transition-colors flex-shrink-0 disabled:opacity-50"
          aria-label="Send photo"
        >
          <span className="material-symbols-outlined text-[24px]">image</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*, .heic, .heif"
          className="hidden"
          onChange={handlePhotoUpload}
        />
        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*, .heic, .heif"
          capture="environment"
          className="hidden"
          onChange={handlePhotoUpload}
        />
        <div className="flex-1 relative min-w-0">
          {showAiPicker && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                insertAiMention();
              }}
              className="absolute bottom-full left-0 mb-2 flex w-full max-w-[220px] items-center gap-2 rounded-2xl border border-primary/20 bg-surface-container-high/95 px-3 py-2 text-left shadow-xl backdrop-blur-xl"
            >
              <span className="material-symbols-outlined text-[18px] text-primary">smart_toy</span>
              <span className="text-sm font-semibold text-on-surface">AI Assistant</span>
              <span className="ml-auto text-xs text-primary">@ai</span>
            </button>
          )}
          <textarea
            ref={inputRef}
            value={text}
            rows={1}
            onChange={(e) => updateText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="max-h-32 min-h-12 w-full resize-none rounded-3xl border border-outline-variant/20 bg-surface-variant/30 px-5 py-3 text-base leading-6 text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary/50"
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

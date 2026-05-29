'use client';

import type { Message } from '@/types';
import { useRouter } from 'next/navigation';
import { memo } from 'react';

interface CallData {
  callType: 'voice' | 'video';
  status: 'started' | 'ended' | 'missed' | 'declined';
  duration?: number;
}

function formatCallDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s > 0 ? s + 's' : ''}`.trim();
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h ${rm > 0 ? rm + 'm' : ''}`.trim();
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export default memo(function CallEventBubble({ message, isMine }: { message: Message; isMine: boolean }) {
  const router = useRouter();

  let callData: CallData | null = null;
  try {
    if (message.plaintext) {
      callData = JSON.parse(message.plaintext);
    }
  } catch {
    callData = null;
  }

  if (!callData) {
    return (
      <div className="call-event-bubble">
        <span className="material-symbols-outlined text-[18px] text-on-surface-variant">call</span>
        <span className="text-sm text-on-surface-variant">Call</span>
      </div>
    );
  }

  const isVideo = callData.callType === 'video';
  const icon = isVideo ? 'videocam' : 'call';
  
  let statusIcon = '';
  let statusText = '';
  let statusColor = '';
  let showJoinButton = false;

  switch (callData.status) {
    case 'started':
      statusIcon = isVideo ? 'videocam' : 'call';
      statusText = isVideo ? 'Video call' : 'Voice call';
      statusColor = 'text-tertiary';
      showJoinButton = false; // Could enable for group calls
      break;
    case 'ended':
      statusIcon = isVideo ? 'videocam' : 'call';
      statusText = callData.duration
        ? `${isVideo ? 'Video' : 'Voice'} call · ${formatCallDuration(callData.duration)}`
        : `${isVideo ? 'Video' : 'Voice'} call ended`;
      statusColor = 'text-on-surface-variant';
      break;
    case 'missed':
      statusIcon = 'call_missed';
      statusText = isMine
        ? `No answer`
        : `Missed ${isVideo ? 'video' : 'voice'} call`;
      statusColor = 'text-error';
      break;
    case 'declined':
      statusIcon = 'call_end';
      statusText = isMine
        ? `You declined the call`
        : `Call declined`;
      statusColor = 'text-error';
      break;
  }

  const handleCallBack = () => {
    router.push('/call');
  };

  return (
    <div className="call-event-bubble">
      <div className="call-event-content">
        {/* Icon */}
        <div className={`call-event-icon ${
          callData.status === 'missed' || callData.status === 'declined'
            ? 'call-event-icon--missed'
            : 'call-event-icon--normal'
        }`}>
          <span
            className="material-symbols-outlined text-[20px]"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {statusIcon}
          </span>
        </div>

        {/* Text */}
        <div className="call-event-info">
          <span className={`call-event-status ${statusColor}`}>
            {statusText}
          </span>
          <span className="call-event-time">
            {formatDate(message.created_at)} · {formatTime(message.created_at)}
          </span>
        </div>

        {/* Callback button for missed/declined calls */}
        {(callData.status === 'missed' || callData.status === 'declined') && !isMine && (
          <button
            onClick={handleCallBack}
            className="call-event-callback"
            aria-label="Call back"
          >
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {icon}
            </span>
          </button>
        )}
      </div>
    </div>
  );
});

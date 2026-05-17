'use client';

export default function SongCard({ url }: { url: string | null }) {
  if (!url) return null;

  return (
    <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-secondary/30 flex items-center justify-center flex-shrink-0">
        <span className="material-symbols-outlined text-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>music_note</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold tracking-[0.1em] uppercase text-on-surface-variant mb-1" style={{ fontFamily: 'var(--font-label)' }}>
          Our Song
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary truncate block hover:text-primary-fixed transition-colors"
        >
          {url.includes('spotify') ? '🎵 Open in Spotify' : url.includes('apple') ? '🎵 Open in Apple Music' : '🎵 Listen Now'}
        </a>
      </div>
    </div>
  );
}

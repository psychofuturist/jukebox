import { useEffect, useState } from 'react';

const STROBE = ['#ff003c', '#ffff00', '#00ff80', '#00ffff', '#0000ff'];

export default function Reveal({ open, tokens, onClose }) {
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (!open) { setRevealed(0); return; }
    setRevealed(0);
    const timers = tokens.map((_, i) =>
      setTimeout(() => setRevealed((n) => Math.max(n, i + 1)), 400 + i * 600)
    );
    return () => timers.forEach(clearTimeout);
  }, [open, tokens]);

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20, fontFamily: 'monospace', color: '#fff',
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '100%' }}>
        <div style={{ fontSize: 20, letterSpacing: 2, marginBottom: 24 }}>
          YOU WON {tokens.length} {tokens.length === 1 ? 'SONG' : 'SONGS'}
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(tokens.length, 5)}, minmax(0, 1fr))`,
          gap: 16,
          justifyContent: 'center',
        }}>
          {tokens.map((t, i) => (
            <div
              key={i}
              style={{
                width: 160, minWidth: 0,
                border: `3px solid ${STROBE[i % STROBE.length]}`,
                background: '#000', padding: 8,
                opacity: i < revealed ? 1 : 0,
                transform: `scale(${i < revealed ? 1 : 0.6})`,
                transition: 'opacity 400ms, transform 400ms',
              }}
            >
              {t.image ? (
                <img
                  src={t.image}
                  alt={t.name}
                  style={{ width: '100%', height: 140, objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }}
                />
              ) : (
                <div style={{ width: '100%', height: 140, background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#888' }}>
                  no image
                </div>
              )}
              <div style={{ fontSize: 10, marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
              <div style={{ fontSize: 9, color: '#888' }}>#{t.token_id}</div>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          style={{ marginTop: 24, padding: '8px 24px', background: '#222', color: '#fff', border: '2px solid #fff', cursor: 'pointer', fontFamily: 'monospace' }}
        >
          close
        </button>
      </div>
    </div>
  );
}

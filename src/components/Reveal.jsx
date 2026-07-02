import { useEffect, useState } from 'react';

const STROBE = ['#ff003c', '#ffff00', '#00ff80', '#00ffff', '#0000ff'];

// One modal for the whole purchase: opens on Buy, shows live progress while the
// commit/reveal runs, then flips to the won songs (or an error).
export default function Reveal({ open, tokens, stage, error, qty = 1, onClose }) {
  const [revealed, setRevealed] = useState(0);
  const [strobe, setStrobe] = useState(0);

  const won = !error && tokens && tokens.length > 0;
  const pending = !error && !won;

  // Sequentially flip in the won cards.
  useEffect(() => {
    if (!open || !won) { setRevealed(0); return; }
    setRevealed(0);
    const timers = tokens.map((_, i) =>
      setTimeout(() => setRevealed((n) => Math.max(n, i + 1)), 400 + i * 600)
    );
    return () => timers.forEach(clearTimeout);
  }, [open, won, tokens]);

  // Cycle the strobe colour while the modal is open (used for the working state).
  useEffect(() => {
    if (!open) return undefined;
    const id = setInterval(() => setStrobe((s) => (s + 1) % STROBE.length), 120);
    return () => clearInterval(id);
  }, [open]);

  if (!open) return null;

  const word = (n) => (n === 1 ? 'SONG' : 'SONGS');
  // While the machine is working, don't let an outside click dismiss it.
  const overlayClick = pending ? undefined : onClose;

  return (
    <div
      onClick={overlayClick}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 20, fontFamily: 'monospace', color: '#fff',
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ textAlign: 'center', maxWidth: '100%' }}>
        {error ? (
          <>
            <div style={{ fontSize: 20, letterSpacing: 2, marginBottom: 20, color: '#ff003c' }}>
              PURCHASE FAILED
            </div>
            <div style={{
              maxWidth: 420, margin: '0 auto', fontSize: 12, lineHeight: 1.6,
              color: '#ff8a8a', border: '2px solid #ff003c', background: '#000', padding: 16,
              wordBreak: 'break-word',
            }}>
              {error}
            </div>
          </>
        ) : pending ? (
          <>
            <div style={{ fontSize: 20, letterSpacing: 2, marginBottom: 6, color: STROBE[strobe] }}>
              BUYING {qty} {word(qty)}
            </div>
            <div style={{ fontSize: 11, color: '#888', marginBottom: 24 }}>
              payment sent to the machine
            </div>
            <div style={{
              width: 280, maxWidth: '100%', margin: '0 auto',
              border: `1px solid ${STROBE[strobe]}`, background: '#000',
              padding: '32px 16px', boxSizing: 'border-box',
            }}>
              <div style={{
                width: 48, height: 48, margin: '0 auto 20px',
                border: `1px solid ${STROBE[strobe]}`,
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'jukeSpin 0.8s linear infinite',
              }} />
              <div style={{ fontSize: 13, letterSpacing: 1 }}>
                {stage || 'working…'}
              </div>
            </div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 16 }}>
              the machine is pulling your song — keep this open
            </div>
            <style>{'@keyframes jukeSpin{to{transform:rotate(360deg)}}'}</style>
          </>
        ) : (
          <>
            <div style={{ fontSize: 20, letterSpacing: 2, marginBottom: 24 }}>
              YOU WON {tokens.length} {word(tokens.length)}
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
          </>
        )}

        {!pending && (
          <button
            onClick={onClose}
            style={{ marginTop: 24, padding: '8px 24px', background: '#222', color: '#fff', border: '2px solid #fff', cursor: 'pointer', fontFamily: 'monospace' }}
          >
            close
          </button>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useWallet } from '../store/wallet';
import { getEvents, resolveTokenMetadata } from '../lib/tzkt';
import { GACHA_ADDRESS } from '../lib/contract';
import { ipfsToHttp } from '../lib/reveal';

const button = { padding: 6, fontFamily: 'monospace', fontSize: 13, border: '1px solid #444', background: '#222', color: '#eee', cursor: 'pointer' };

// Expand a reveal event's drawn_tokens (map or array) into [{fa2_address, token_id}].
function parseDrawn(payload) {
  const drawn = payload?.drawn_tokens ?? payload?.drawnTokens;
  if (!drawn) return [];
  const arr = Array.isArray(drawn) ? drawn : Object.values(drawn);
  return arr.map((t) => ({
    fa2_address: t.fa2_address ?? t.fa2Address,
    token_id: String(t.token_id ?? t.tokenId),
  }));
}

function TokenCard({ item }) {
  const md = item.md || {};
  const image = ipfsToHttp(md.thumbnailUri || md.displayUri || md.artifactUri);
  const audio = ipfsToHttp(md.artifactUri);
  const isAudio = (md.formats || []).some((f) => f.uri === md.artifactUri && String(f.mimeType).startsWith('audio/'));
  const name = md.name || `${item.fa2_address.slice(0, 8)}…/${item.token_id}`;
  return (
    <div style={{ border: '1px solid #333', padding: 10 }}>
      {image ? (
        <img src={image} alt={name} style={{ width: '100%', height: 180, objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: 180, background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#888' }}>no image</div>
      )}
      <div style={{ fontSize: 12, marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
      <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
        #{item.token_id} · pulled ×{item.count}
      </div>
      {isAudio && audio && (
        <audio controls preload="none" src={audio} style={{ width: '100%', marginTop: 8, height: 28 }} />
      )}
      <a
        href={`https://shadownet.tzkt.io/${item.fa2_address}/tokens/${item.token_id}`}
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: 10, color: '#0ff', marginTop: 6, display: 'inline-block' }}
      >
        view on tzkt →
      </a>
    </div>
  );
}

export default function Collect() {
  const { poolId } = useParams();
  const walletAddress = useWallet((s) => s.address);
  const walletConnect = useWallet((s) => s.connect);

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => { useWallet.getState().hydrate(); }, []);

  const load = async () => {
    if (!walletAddress) return;
    setLoading(true);
    setErr(null);
    try {
      // The reveal event is the record of what a wallet drew: { buyer, pool_id, drawn_tokens, … }.
      const events = await getEvents({ contract: GACHA_ADDRESS, tag: 'reveal', sortDesc: true, limit: 1000 });
      const mine = (events || []).filter(
        (e) => e.payload?.buyer === walletAddress && String(e.payload?.pool_id) === String(poolId),
      );
      // Aggregate a count per distinct (fa2, token_id) — a wallet can pull the same token more than once.
      const counts = new Map();
      for (const e of mine) {
        for (const t of parseDrawn(e.payload)) {
          const k = `${t.fa2_address}:${t.token_id}`;
          const cur = counts.get(k) || { ...t, count: 0 };
          cur.count += 1;
          counts.set(k, cur);
        }
      }
      const list = Array.from(counts.values());
      const enriched = await Promise.all(
        list.map(async (it) => ({ ...it, md: await resolveTokenMetadata(it.fa2_address, it.token_id) })),
      );
      setItems(enriched);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [walletAddress, poolId]);

  const totalPulled = items.reduce((n, i) => n + i.count, 0);

  return (
    <div style={{ padding: 24, fontFamily: 'monospace', color: '#eee', background: '#000', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <Link to="/" style={{ color: '#0ff' }}>← back</Link>
        <span style={{ fontSize: 12, color: '#888' }}>
          {walletAddress ? `wallet: ${walletAddress.slice(0, 8)}…${walletAddress.slice(-4)}` : (
            <button style={button} onClick={walletConnect}>connect wallet</button>
          )}
        </span>
      </div>

      <h1 style={{ margin: '0 0 6px 0' }}>Collected — pool #{poolId}</h1>
      <p style={{ color: '#888', fontSize: 12, margin: 0 }}>
        Tokens the connected wallet drew from this pool (from on-chain reveal events).
      </p>

      {!walletAddress && <div style={{ marginTop: 24, color: '#f66' }}>connect a wallet to see what you collected</div>}
      {err && <div style={{ marginTop: 24, color: '#f66' }}>error: {err}</div>}

      {walletAddress && (
        <section style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>
              {loading ? 'loading…' : `${items.length} token${items.length === 1 ? '' : 's'} · ${totalPulled} pull${totalPulled === 1 ? '' : 's'}`}
            </h2>
            <button style={button} onClick={load}>refresh</button>
          </div>
          {!loading && !items.length && !err && (
            <div style={{ color: '#888' }}>nothing collected from pool #{poolId} yet</div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {items.map((it) => (
              <TokenCard key={`${it.fa2_address}:${it.token_id}`} item={it} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

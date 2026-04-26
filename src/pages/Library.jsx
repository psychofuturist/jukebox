import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../store/wallet';
import { getTokenBalances } from '../lib/tzkt';
import { ipfsToHttp } from '../lib/reveal';

const button = { padding: 6, fontFamily: 'monospace', fontSize: 13, border: '1px solid #444', background: '#222', color: '#eee', cursor: 'pointer' };

function TokenCard({ row }) {
  const md = row.token?.metadata || {};
  const image = ipfsToHttp(md.thumbnailUri || md.displayUri || md.artifactUri);
  const name = md.name || `${row.token?.contract?.address?.slice(0, 8)}…/${row.token?.tokenId}`;
  const contract = row.token?.contract?.address;
  const tokenId = row.token?.tokenId;
  return (
    <div style={{ border: '1px solid #333', padding: 10 }}>
      {image ? (
        <img src={image} alt={name} style={{ width: '100%', height: 180, objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: 180, background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#888' }}>no image</div>
      )}
      <div style={{ fontSize: 12, marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
      <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
        #{tokenId} · owned: {row.balance}
      </div>
      <a
        href={`https://shadownet.tzkt.io/${contract}/tokens/${tokenId}`}
        target="_blank"
        rel="noreferrer"
        style={{ fontSize: 10, color: '#0ff', marginTop: 6, display: 'inline-block' }}
      >
        view on tzkt →
      </a>
    </div>
  );
}

export default function Library() {
  const walletAddress = useWallet((s) => s.address);
  const walletConnect = useWallet((s) => s.connect);

  const [holdings, setHoldings] = useState([]);
  const [holdingsErr, setHoldingsErr] = useState(null);

  useEffect(() => { useWallet.getState().hydrate(); }, []);

  const loadHoldings = () => {
    if (!walletAddress) return;
    setHoldingsErr(null);
    getTokenBalances(walletAddress, '&token.standard=fa2&limit=500')
      .then((rows) => setHoldings(rows || []))
      .catch((err) => setHoldingsErr(err.message));
  };

  useEffect(loadHoldings, [walletAddress]);

  const keyOf = (row) => `${row.token?.contract?.address}:${row.token?.tokenId}`;

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

      <h1 style={{ margin: '0 0 6px 0' }}>Library</h1>
      <p style={{ color: '#888', fontSize: 12, margin: 0 }}>
        FA2 tokens held by the connected wallet.
      </p>

      {!walletAddress && <div style={{ marginTop: 24, color: '#f66' }}>connect a wallet to see your library</div>}
      {holdingsErr && <div style={{ marginTop: 24, color: '#f66' }}>error: {holdingsErr}</div>}

      {walletAddress && (
        <section style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Holdings ({holdings.length})</h2>
            <button style={button} onClick={loadHoldings}>refresh</button>
          </div>
          {!holdings.length && !holdingsErr && <div style={{ color: '#888' }}>no FA2 tokens in this wallet</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {holdings.map((row) => (
              <TokenCard key={keyOf(row)} row={row} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

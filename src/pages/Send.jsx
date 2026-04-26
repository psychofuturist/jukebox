import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWallet } from '../store/wallet';
import { GACHA_ADDRESS, submitFa2Transfer } from '../lib/contract';
import { getTokenBalances } from '../lib/tzkt';
import { ipfsToHttp } from '../lib/reveal';

const input = { padding: 6, fontFamily: 'monospace', fontSize: 13, border: '1px solid #444', background: '#111', color: '#eee' };
const button = { ...input, cursor: 'pointer', background: '#222' };

export default function Send() {
  const walletAddress = useWallet((s) => s.address);
  const walletConnect = useWallet((s) => s.connect);

  const [holdings, setHoldings] = useState([]);
  const [holdingsErr, setHoldingsErr] = useState(null);
  const [amounts, setAmounts] = useState({});
  const [status, setStatus] = useState({});
  const [sending, setSending] = useState({});

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

  const handleSend = async (row) => {
    const k = keyOf(row);
    const amt = (amounts[k] || '').trim();
    if (!amt || Number(amt) <= 0) { setStatus((s) => ({ ...s, [k]: 'enter an amount' })); return; }
    try {
      if (BigInt(amt) > BigInt(row.balance)) { setStatus((s) => ({ ...s, [k]: 'amount exceeds balance' })); return; }
    } catch {
      setStatus((s) => ({ ...s, [k]: 'invalid amount' })); return;
    }
    if (!walletAddress) { walletConnect(); return; }
    setSending((s) => ({ ...s, [k]: true }));
    setStatus((s) => ({ ...s, [k]: 'submitting…' }));
    try {
      const res = await submitFa2Transfer(
        row.token.contract.address,
        walletAddress,
        GACHA_ADDRESS,
        row.token.tokenId,
        amt,
      );
      const hash = res?.transactionHash || res?.hash || '';
      setStatus((s) => ({ ...s, [k]: `sent: ${String(hash).slice(0, 12)}…` }));
      setTimeout(loadHoldings, 15000);
    } catch (err) {
      setStatus((s) => ({ ...s, [k]: `error: ${err.message || String(err)}` }));
    } finally {
      setSending((s) => ({ ...s, [k]: false }));
    }
  };

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

      <h1 style={{ margin: '0 0 6px 0' }}>Send NFTs to the machine</h1>
      <p style={{ color: '#888', fontSize: 12, margin: 0, maxWidth: 720 }}>
        transfer editions of your FA2 tokens to{' '}
        <a href={`https://shadownet.tzkt.io/${GACHA_ADDRESS}/tokens/`} target="_blank" rel="noreferrer" style={{ color: '#0ff' }}>{GACHA_ADDRESS}</a>.
        The gacha needs editions on-hand before buyers can draw them. An admin then adds the token to a pool.
      </p>

      {!walletAddress && <div style={{ marginTop: 24, color: '#f66' }}>connect a wallet to see your holdings</div>}
      {holdingsErr && <div style={{ marginTop: 24, color: '#f66' }}>error: {holdingsErr}</div>}

      {walletAddress && (
        <section style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>Your FA2 holdings ({holdings.length})</h2>
            <button style={button} onClick={loadHoldings}>refresh</button>
          </div>
          {!holdings.length && !holdingsErr && <div style={{ color: '#888' }}>no FA2 tokens in this wallet</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {holdings.map((row) => {
              const k = keyOf(row);
              const md = row.token?.metadata || {};
              const image = ipfsToHttp(md.thumbnailUri || md.displayUri || md.artifactUri);
              const name = md.name || `${row.token?.contract?.address?.slice(0, 8)}…/${row.token?.tokenId}`;
              return (
                <div key={k} style={{ border: '1px solid #333', padding: 10 }}>
                  {image ? (
                    <img src={image} alt={name} style={{ width: '100%', height: 180, objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: 180, background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#888' }}>no image</div>
                  )}
                  <div style={{ fontSize: 12, marginTop: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                  <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                    #{row.token?.tokenId} · balance: {row.balance}
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <input
                      style={{ ...input, flex: 1, minWidth: 0 }}
                      placeholder="qty"
                      value={amounts[k] || ''}
                      onChange={(ev) => setAmounts({ ...amounts, [k]: ev.target.value })}
                    />
                    <button
                      style={button}
                      disabled={!!sending[k]}
                      onClick={() => handleSend(row)}
                    >
                      {sending[k] ? '…' : 'send'}
                    </button>
                  </div>
                  {status[k] && <div style={{ fontSize: 10, color: '#aaa', marginTop: 6, wordBreak: 'break-all' }}>{status[k]}</div>}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

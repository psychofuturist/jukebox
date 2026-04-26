import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useWallet } from '../store/wallet';
import {
  GACHA_ADDRESS,
  submitCreatePool,
  submitActivatePool,
  submitDeactivatePool,
  submitWithdrawTokens,
} from '../lib/contract';
import { getBigmapKeys, getTokenBalances } from '../lib/tzkt';
import { ipfsToHttp } from '../lib/reveal';

const input = { padding: 6, fontFamily: 'monospace', fontSize: 13, border: '1px solid #444', background: '#111', color: '#eee' };
const button = { ...input, cursor: 'pointer', background: '#222' };
const label = { fontSize: 12, color: '#888', display: 'block', marginBottom: 2 };

function emptyPoolToken() { return { fa2_address: '', token_id: '', editions: '', artist_address: '' }; }

export default function Admin() {
  const walletAddress = useWallet((s) => s.address);
  const walletConnect = useWallet((s) => s.connect);

  const [pools, setPools] = useState([]);
  const [poolsErr, setPoolsErr] = useState(null);
  const [poolAction, setPoolAction] = useState({});

  const [gachaHoldings, setGachaHoldings] = useState([]);
  const [gachaHoldingsErr, setGachaHoldingsErr] = useState(null);

  const [withdraw, setWithdraw] = useState({ fa2_address: '', token_id: '', amount: '', destination: '' });
  const [withdrawStatus, setWithdrawStatus] = useState(null);
  const [withdrawSending, setWithdrawSending] = useState(false);

  const [poolTokens, setPoolTokens] = useState([emptyPoolToken()]);
  const [poolForm, setPoolForm] = useState({
    start_time: null,
    end_time: null,
    price_per_nft_tez: '',
    max_per_wallet: '',
  });
  const [poolStatus, setPoolStatus] = useState(null);
  const [poolSending, setPoolSending] = useState(false);

  useEffect(() => { useWallet.getState().hydrate(); }, []);

  const loadPools = () => {
    getBigmapKeys(GACHA_ADDRESS, 'pools', '?limit=500&sort.desc=id')
      .then((rows) => setPools(rows || []))
      .catch((err) => setPoolsErr(err.message));
  };
  const loadGachaHoldings = () => {
    setGachaHoldingsErr(null);
    getTokenBalances(GACHA_ADDRESS, '&token.standard=fa2&limit=500')
      .then((rows) => setGachaHoldings(rows || []))
      .catch((err) => setGachaHoldingsErr(err.message));
  };
  useEffect(() => { loadPools(); loadGachaHoldings(); }, []);

  const togglePool = async (poolId, active) => {
    if (!walletAddress) { walletConnect(); return; }
    setPoolAction((s) => ({ ...s, [poolId]: 'submitting…' }));
    try {
      const fn = active ? submitDeactivatePool : submitActivatePool;
      const res = await fn(poolId);
      const hash = res?.transactionHash || res?.hash || '';
      setPoolAction((s) => ({ ...s, [poolId]: `sent: ${String(hash).slice(0, 10)}…` }));
      setTimeout(loadPools, 15000);
    } catch (err) {
      setPoolAction((s) => ({ ...s, [poolId]: `error: ${err.message || String(err)}` }));
    }
  };

  const handleWithdraw = async () => {
    setWithdrawStatus(null);
    const { fa2_address, token_id, amount, destination } = withdraw;
    if (!fa2_address.trim() || token_id === '' || amount === '' || !destination.trim()) {
      setWithdrawStatus('fill all fields'); return;
    }
    if (!walletAddress) { walletConnect(); return; }
    setWithdrawSending(true);
    setWithdrawStatus('submitting…');
    try {
      const res = await submitWithdrawTokens({
        fa2_address: fa2_address.trim(),
        token_id: token_id.trim(),
        amount: amount.trim(),
        destination: destination.trim(),
      });
      const hash = res?.transactionHash || res?.hash || '';
      setWithdrawStatus(`sent: ${hash}`);
    } catch (err) {
      setWithdrawStatus(`error: ${err.message || String(err)}`);
    } finally {
      setWithdrawSending(false);
    }
  };

  const fmtTs = (t) => {
    if (!t) return '—';
    try { return new Date(t).toLocaleString(); } catch { return String(t); }
  };
  const fmtMutez = (m) => m ? `${Number(BigInt(m)) / 1_000_000} tez` : '—';

  const handleCreatePool = async () => {
    setPoolStatus(null);
    const tokens = poolTokens
      .map((t) => ({
        fa2_address: t.fa2_address.trim(),
        token_id: t.token_id.trim(),
        editions: t.editions.trim(),
        artist_address: t.artist_address.trim(),
      }))
      .filter((t) => t.fa2_address && t.token_id !== '' && t.editions !== '' && t.artist_address);
    if (!tokens.length) { setPoolStatus('fill at least one complete token row (incl. artist_address)'); return; }
    const missing = [];
    if (!poolForm.start_time) missing.push('start_time');
    if (!poolForm.end_time) missing.push('end_time');
    if (!String(poolForm.price_per_nft_tez ?? '').trim()) missing.push('price_per_nft');
    if (!String(poolForm.max_per_wallet ?? '').trim()) missing.push('max_per_wallet');
    if (missing.length) { setPoolStatus(`missing field(s): ${missing.join(', ')}`); return; }
    if (poolForm.end_time <= poolForm.start_time) {
      setPoolStatus('end_time must be after start_time'); return;
    }
    if (!walletAddress) { walletConnect(); return; }
    const priceMutez = Math.round(parseFloat(poolForm.price_per_nft_tez) * 1_000_000);
    if (!Number.isFinite(priceMutez) || priceMutez < 0) { setPoolStatus('invalid price'); return; }

    setPoolSending(true);
    setPoolStatus('submitting…');
    try {
      const res = await submitCreatePool({
        tokens,
        start_time: poolForm.start_time,
        end_time: poolForm.end_time,
        price_per_nft: priceMutez,
        max_per_wallet: poolForm.max_per_wallet,
      });
      const hash = res?.transactionHash || res?.hash || JSON.stringify(res);
      setPoolStatus(`sent: ${hash}`);
    } catch (err) {
      setPoolStatus(`error: ${err.message || String(err)}`);
    } finally {
      setPoolSending(false);
    }
  };

  const updatePoolToken = (i, field, val) =>
    setPoolTokens((rows) => rows.map((r, j) => (j === i ? { ...r, [field]: val } : r)));

  const addToPool = (fa2_address, token_id, editions) => {
    setPoolTokens((rows) => {
      const blank = rows.findIndex((r) => !r.fa2_address && !r.token_id && !r.editions && !r.artist_address);
      const next = { fa2_address, token_id: String(token_id), editions: String(editions), artist_address: '' };
      if (blank >= 0) return rows.map((r, i) => (i === blank ? next : r));
      return [...rows, next];
    });
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

      <h1 style={{ margin: '0 0 6px 0' }}>Admin</h1>
      <p style={{ color: '#888', fontSize: 12, margin: 0 }}>
        contract: <a href={`https://shadownet.tzkt.io/${GACHA_ADDRESS}/operations/`} target="_blank" rel="noreferrer" style={{ color: '#0ff' }}>{GACHA_ADDRESS}</a>
      </p>

      <section style={{ marginTop: 32 }}>
        <h2>Create pool</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
          <div>
            <span style={label}>start_time</span>
            <DatePicker
              selected={poolForm.start_time}
              onChange={(d) => setPoolForm({ ...poolForm, start_time: d })}
              showTimeSelect
              timeIntervals={15}
              dateFormat="yyyy-MM-dd HH:mm"
              placeholderText="pick date/time"
              wrapperClassName="dp-wrapper"
              className="dp-input"
            />
            <span style={{ ...label, marginTop: 4 }}>{poolForm.start_time ? `UTC: ${poolForm.start_time.toISOString()}` : ' '}</span>
          </div>
          <div>
            <span style={label}>end_time</span>
            <DatePicker
              selected={poolForm.end_time}
              onChange={(d) => setPoolForm({ ...poolForm, end_time: d })}
              showTimeSelect
              timeIntervals={15}
              dateFormat="yyyy-MM-dd HH:mm"
              placeholderText="pick date/time"
              minDate={poolForm.start_time || undefined}
              wrapperClassName="dp-wrapper"
              className="dp-input"
            />
            <span style={{ ...label, marginTop: 4 }}>{poolForm.end_time ? `UTC: ${poolForm.end_time.toISOString()}` : ' '}</span>
          </div>
          <div>
            <span style={label}>price_per_nft (tez)</span>
            <input style={{ ...input, width: '100%' }} placeholder="1" value={poolForm.price_per_nft_tez} onChange={(ev) => setPoolForm({ ...poolForm, price_per_nft_tez: ev.target.value })} />
          </div>
          <div>
            <span style={label}>max_per_wallet</span>
            <input style={{ ...input, width: '100%' }} placeholder="5" value={poolForm.max_per_wallet} onChange={(ev) => setPoolForm({ ...poolForm, max_per_wallet: ev.target.value })} />
          </div>
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#888' }}>
              available in contract ({gachaHoldings.length})
            </span>
            <button style={button} onClick={loadGachaHoldings}>refresh</button>
          </div>
          {gachaHoldingsErr && <div style={{ color: '#f66', fontSize: 11 }}>error: {gachaHoldingsErr}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8 }}>
            {gachaHoldings.map((row) => {
              const fa2 = row.token?.contract?.address;
              const tid = row.token?.tokenId;
              const k = `${fa2}:${tid}`;
              const md = row.token?.metadata || {};
              const image = ipfsToHttp(md.thumbnailUri || md.displayUri || md.artifactUri);
              const name = md.name || `${fa2?.slice(0, 6)}…/${tid}`;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => addToPool(fa2, tid, row.balance)}
                  style={{ textAlign: 'left', padding: 8, background: '#0d0d0d', border: '1px solid #333', color: '#eee', cursor: 'pointer', fontFamily: 'monospace' }}
                  title={`click to add: ${fa2} #${tid} × ${row.balance}`}
                >
                  {image ? (
                    <img src={image} alt={name} style={{ width: '100%', height: 90, objectFit: 'cover', imageRendering: 'pixelated', display: 'block' }} />
                  ) : (
                    <div style={{ width: '100%', height: 90, background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#888' }}>no image</div>
                  )}
                  <div style={{ fontSize: 11, marginTop: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                  <div style={{ fontSize: 9, color: '#888' }}>#{tid} · {row.balance} available</div>
                </button>
              );
            })}
            {!gachaHoldings.length && !gachaHoldingsErr && (
              <div style={{ color: '#888', fontSize: 11, gridColumn: '1 / -1' }}>
                contract holds no FA2 editions yet — artists send via /send
              </div>
            )}
          </div>
        </div>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>tokens in pool:</div>
        {poolTokens.map((t, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr', gap: 8, marginBottom: 6 }}>
            <div>
              <span style={label}>fa2_address</span>
              <input style={{ ...input, width: '100%' }} placeholder="KT1…" value={t.fa2_address} onChange={(ev) => updatePoolToken(i, 'fa2_address', ev.target.value)} />
            </div>
            <div>
              <span style={label}>token_id</span>
              <input style={{ ...input, width: '100%' }} placeholder="0" value={t.token_id} onChange={(ev) => updatePoolToken(i, 'token_id', ev.target.value)} />
            </div>
            <div>
              <span style={label}>editions</span>
              <input style={{ ...input, width: '100%' }} placeholder="10" value={t.editions} onChange={(ev) => updatePoolToken(i, 'editions', ev.target.value)} />
            </div>
            <div>
              <span style={label}>artist_address</span>
              <input style={{ ...input, width: '100%' }} placeholder="tz1…" value={t.artist_address} onChange={(ev) => updatePoolToken(i, 'artist_address', ev.target.value)} />
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <button style={button} onClick={() => setPoolTokens((r) => [...r, emptyPoolToken()])}>+ token</button>
          <button style={button} disabled={poolSending} onClick={handleCreatePool}>
            {poolSending ? 'submitting…' : 'create_pool'}
          </button>
        </div>
        {poolStatus && <div style={{ marginTop: 8, fontSize: 12, color: '#aaa' }}>{poolStatus}</div>}
      </section>

      <section style={{ marginTop: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>Pools</h2>
          <button style={button} onClick={loadPools}>refresh</button>
        </div>
        {poolsErr && <div style={{ color: '#f66', marginTop: 8 }}>error: {poolsErr}</div>}
        {!pools.length && !poolsErr && <div style={{ color: '#888', marginTop: 8 }}>no pools yet</div>}
        {pools.map((row) => {
          const p = row.value || {};
          const poolId = row.key;
          const active = p.active === true || p.active === 'true';
          const tokensMap = p.tokens || {};
          const tokenEntries = Array.isArray(tokensMap) ? tokensMap : Object.values(tokensMap);
          return (
            <div key={poolId} style={{ border: '1px solid #333', padding: 12, marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 14 }}>
                  <strong>Pool #{poolId}</strong>{' '}
                  <span style={{ color: active ? '#0f8' : '#f66' }}>[{active ? 'active' : 'inactive'}]</span>
                </div>
                <button
                  style={button}
                  onClick={() => togglePool(poolId, active)}
                >
                  {active ? 'deactivate' : 'activate'}
                </button>
              </div>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 6, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <div>price: {fmtMutez(p.price_per_nft)}</div>
                <div>max/wallet: {p.max_per_wallet}</div>
                <div>remaining editions: {p.total_editions} ({p.num_tokens} unique)</div>
                <div>start: {fmtTs(p.start_time)}</div>
                <div>end: {fmtTs(p.end_time)}</div>
              </div>
              {tokenEntries.length > 0 && (
                <details style={{ marginTop: 8 }}>
                  <summary style={{ cursor: 'pointer', fontSize: 12, color: '#888' }}>tokens ({tokenEntries.length})</summary>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11, marginTop: 6 }}>
                    <thead>
                      <tr style={{ color: '#888', textAlign: 'left' }}>
                        <th style={{ padding: 3 }}>fa2_address</th>
                        <th style={{ padding: 3 }}>token_id</th>
                        <th style={{ padding: 3 }}>editions left</th>
                        <th style={{ padding: 3 }}>artist</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tokenEntries.map((t, i) => (
                        <tr key={i} style={{ borderTop: '1px solid #222' }}>
                          <td style={{ padding: 3 }}>{t.fa2_address}</td>
                          <td style={{ padding: 3 }}>{t.token_id}</td>
                          <td style={{ padding: 3 }}>{t.editions}</td>
                          <td style={{ padding: 3 }}>{t.artist_address}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              )}
              {poolAction[poolId] && <div style={{ marginTop: 6, fontSize: 12, color: '#aaa' }}>{poolAction[poolId]}</div>}
            </div>
          );
        })}
      </section>

      <section style={{ marginTop: 32 }}>
        <h2>Withdraw tokens</h2>
        <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
          pull any FA2 editions currently held by the gacha contract to a destination address.
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 2fr', gap: 8 }}>
          <div>
            <span style={label}>fa2_address</span>
            <input style={{ ...input, width: '100%' }} placeholder="KT1…" value={withdraw.fa2_address} onChange={(ev) => setWithdraw({ ...withdraw, fa2_address: ev.target.value })} />
          </div>
          <div>
            <span style={label}>token_id</span>
            <input style={{ ...input, width: '100%' }} placeholder="0" value={withdraw.token_id} onChange={(ev) => setWithdraw({ ...withdraw, token_id: ev.target.value })} />
          </div>
          <div>
            <span style={label}>amount</span>
            <input style={{ ...input, width: '100%' }} placeholder="1" value={withdraw.amount} onChange={(ev) => setWithdraw({ ...withdraw, amount: ev.target.value })} />
          </div>
          <div>
            <span style={label}>destination</span>
            <input style={{ ...input, width: '100%' }} placeholder="tz1… or KT1…" value={withdraw.destination} onChange={(ev) => setWithdraw({ ...withdraw, destination: ev.target.value })} />
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <button style={button} disabled={withdrawSending} onClick={handleWithdraw}>
            {withdrawSending ? 'submitting…' : 'withdraw_tokens'}
          </button>
        </div>
        {withdrawStatus && <div style={{ marginTop: 8, fontSize: 12, color: '#aaa' }}>{withdrawStatus}</div>}
      </section>
    </div>
  );
}

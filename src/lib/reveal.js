import { getOperation, getEvents, getTokenMetadata } from './tzkt';
import { GACHA_ADDRESS } from './contract';

const IPFS_GATEWAY = 'https://ipfs.io/ipfs/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function ipfsToHttp(uri) {
  if (!uri) return null;
  if (uri.startsWith('ipfs://')) return IPFS_GATEWAY + uri.slice(7);
  return uri;
}

async function waitForOperation(opHash, { timeoutMs = 120_000, pollMs = 3000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const ops = await getOperation(opHash);
      const op = Array.isArray(ops) ? ops[0] : ops;
      if (op?.status === 'applied') return op;
      if (op?.status && op.status !== 'applied') {
        const err = op.errors?.[0]?.id || op.status;
        throw new Error(`operation ${op.status}: ${err}`);
      }
    } catch (err) {
      if (!String(err.message).includes('404')) throw err;
    }
    await sleep(pollMs);
  }
  throw new Error('operation not confirmed within timeout');
}

async function fetchPurchaseEvent(transactionId, { timeoutMs = 45_000, pollMs = 2500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const events = await getEvents({ contract: GACHA_ADDRESS, tag: 'purchase', transactionId });
    if (events && events.length > 0) return events[0];
    await sleep(pollMs);
  }
  throw new Error('purchase event not indexed in time');
}

function parseDrawnTokens(payload) {
  const drawn = payload?.drawn_tokens ?? payload?.drawnTokens;
  if (!drawn) return [];
  const arr = Array.isArray(drawn) ? drawn : Object.values(drawn);
  return arr.map((t) => ({
    fa2_address: t.fa2_address ?? t.fa2Address,
    token_id: String(t.token_id ?? t.tokenId),
  }));
}

async function fetchTokenInfo(fa2_address, token_id) {
  const rows = await getTokenMetadata(fa2_address, token_id).catch(() => []);
  const row = Array.isArray(rows) ? rows[0] : rows;
  const md = row?.metadata || {};
  return {
    fa2_address,
    token_id,
    name: md.name || `${fa2_address.slice(0, 8)}…/${token_id}`,
    image: ipfsToHttp(md.displayUri || md.artifactUri || md.thumbnailUri),
  };
}

export async function revealFromOpHash(opHash, onStage) {
  onStage?.('waiting for operation…');
  const op = await waitForOperation(opHash);
  onStage?.('fetching draw…');
  const event = await fetchPurchaseEvent(op.id);
  const tokens = parseDrawnTokens(event.payload);
  onStage?.('loading metadata…');
  return Promise.all(tokens.map((t) => fetchTokenInfo(t.fa2_address, t.token_id)));
}

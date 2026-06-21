import { getOperation, getEvents, resolveTokenMetadata, IPFS_GATEWAY } from './tzkt';
import { GACHA_ADDRESS } from './contract';

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

// The buy op is a *commit*: it reserves a seat and emits `commit {seat_id,…}`.
// That event is tied to the user's own transaction, so it's the reliable way
// to learn which seat_id the reveal bot will settle.
async function fetchCommitSeatId(transactionId, { timeoutMs = 45_000, pollMs = 2500 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const events = await getEvents({ contract: GACHA_ADDRESS, tag: 'commit', transactionId });
    if (events && events.length > 0) {
      const seatId = events[0].payload?.seat_id;
      if (seatId != null) return String(seatId);
    }
    await sleep(pollMs);
  }
  throw new Error('commit event not indexed in time');
}

// Wait for the reveal bot to settle our seat. The reveal happens in the bot's
// own transaction (not ours), so we can't use transactionId — instead we scan
// recent `reveal` events for the one carrying our seat_id.
async function waitForReveal(seatId, { timeoutMs = 180_000, pollMs = 3000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const events = await getEvents({
      contract: GACHA_ADDRESS,
      tag: 'reveal',
      sortDesc: true,
      limit: 200,
    });
    const match = (events || []).find(
      (e) => String(e.payload?.seat_id) === String(seatId),
    );
    if (match) return match;
    await sleep(pollMs);
  }
  throw new Error('seat not revealed within timeout');
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
  const md = await resolveTokenMetadata(fa2_address, token_id);
  return {
    fa2_address,
    token_id,
    name: md.name || `${fa2_address.slice(0, 8)}…/${token_id}`,
    image: ipfsToHttp(md.displayUri || md.artifactUri || md.thumbnailUri),
  };
}

// Drives the commit → wait-for-bot → reveal flow for a buy op hash.
export async function revealFromOpHash(opHash, onStage) {
  onStage?.('waiting for operation…');
  const op = await waitForOperation(opHash);
  onStage?.('seat reserved — locating draw…');
  const seatId = await fetchCommitSeatId(op.id);
  onStage?.('waiting for the machine to reveal…');
  const event = await waitForReveal(seatId);
  const tokens = parseDrawnTokens(event.payload);
  onStage?.('loading metadata…');
  return Promise.all(tokens.map((t) => fetchTokenInfo(t.fa2_address, t.token_id)));
}

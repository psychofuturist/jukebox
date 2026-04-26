export const TZKT_BASE = 'https://api.shadownet.tzkt.io/v1';

async function tzktFetch(path) {
  const res = await fetch(`${TZKT_BASE}${path}`);
  if (!res.ok) throw new Error(`TzKT ${res.status}: ${path}`);
  return res.json();
}

export const getContractStorage = (address) =>
  tzktFetch(`/contracts/${address}/storage`);

export const getBigmapKeys = (address, name, query = '') =>
  tzktFetch(`/contracts/${address}/bigmaps/${name}/keys${query}`);

export const getBigmapKey = (address, name, key) =>
  tzktFetch(`/contracts/${address}/bigmaps/${name}/keys/${encodeURIComponent(key)}`);

export function getEvents({ contract, tag, transactionId, limit = 100 }) {
  const params = new URLSearchParams();
  if (contract) params.set('contract', contract);
  if (tag) params.set('tag', tag);
  if (transactionId != null) params.set('transactionId', String(transactionId));
  params.set('limit', String(limit));
  return tzktFetch(`/contracts/events?${params}`);
}

export const getOperation = (opHash) => tzktFetch(`/operations/${opHash}`);

export const getTokenBalances = (owner, extra = '') =>
  tzktFetch(`/tokens/balances?account=${owner}&balance.gt=0${extra}`);

export const getTokenMetadata = (fa2Address, tokenId) =>
  tzktFetch(`/tokens?contract=${fa2Address}&tokenId=${tokenId}`);

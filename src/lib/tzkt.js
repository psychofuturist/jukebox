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

export function getEvents({ contract, tag, transactionId, limit = 100, sortDesc = false }) {
  const params = new URLSearchParams();
  if (contract) params.set('contract', contract);
  if (tag) params.set('tag', tag);
  if (transactionId != null) params.set('transactionId', String(transactionId));
  if (sortDesc) params.set('sort.desc', 'id');
  params.set('limit', String(limit));
  return tzktFetch(`/contracts/events?${params}`);
}

export const getOperation = (opHash) => tzktFetch(`/operations/${opHash}`);

export const getTokenBalances = (owner, extra = '') =>
  tzktFetch(`/tokens/balances?account=${owner}&balance.gt=0${extra}`);

export const getTokenMetadata = (fa2Address, tokenId) =>
  tzktFetch(`/tokens?contract=${fa2Address}&tokenId=${tokenId}`);

export const IPFS_GATEWAY = 'https://turquoise-elaborate-squid-767.mypinata.cloud/ipfs/';

const hexToStr = (hex) =>
  new TextDecoder().decode(new Uint8Array(hex.match(/../g).map((h) => parseInt(h, 16))));

const ipfsUrl = (uri) =>
  uri.startsWith('ipfs://') ? IPFS_GATEWAY + uri.slice(7) : uri;

// Resolve a token's TZIP-21 metadata. Prefer TzKT's resolved `metadata`, but
// shadownet's indexer doesn't fetch off-chain (`""→ipfs://`) pointers, so when
// it's empty we read the on-chain `token_metadata` pointer and fetch the JSON
// ourselves. Returns a metadata object (possibly empty) — never throws.
export async function resolveTokenMetadata(fa2Address, tokenId) {
  const rows = await getTokenMetadata(fa2Address, tokenId).catch(() => []);
  const row = Array.isArray(rows) ? rows[0] : rows;
  const md = row?.metadata;
  if (md && (md.name || md.artifactUri || md.displayUri || md.thumbnailUri)) return md;
  try {
    const key = await getBigmapKey(fa2Address, 'token_metadata', tokenId);
    const hex = key?.value?.token_info?.[''];
    if (!hex) return md || {};
    const uri = hexToStr(hex);
    if (!uri.startsWith('ipfs://')) return md || {};
    const res = await fetch(ipfsUrl(uri));
    if (!res.ok) return md || {};
    return await res.json();
  } catch {
    return md || {};
  }
}

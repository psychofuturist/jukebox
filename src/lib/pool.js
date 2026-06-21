import { resolveTokenMetadata } from './tzkt';
import { ipfsToHttp } from './reveal';

export function sortPoolTokens(tokensMap) {
  if (!tokensMap) return [];
  return Object.entries(tokensMap)
    .map(([k, v]) => [Number(k), v])
    .sort((a, b) => a[0] - b[0])
    .map(([index, value]) => ({ index, ...value }));
}

export async function enrichPoolTokens(poolValue) {
  const sorted = sortPoolTokens(poolValue?.tokens);
  return Promise.all(
    sorted.map(async (t) => {
      const md = await resolveTokenMetadata(t.fa2_address, t.token_id);
      return {
        index: t.index,
        fa2_address: t.fa2_address,
        token_id: String(t.token_id),
        artist_address: t.artist_address,
        editions: Number(t.editions),
        name: md.name || `${t.fa2_address.slice(0, 8)}…/${t.token_id}`,
        artifactUri: ipfsToHttp(md.artifactUri),
        displayUri: ipfsToHttp(md.displayUri || md.thumbnailUri),
      };
    }),
  );
}

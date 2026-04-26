import { dAppClient } from './tezos';

export const GACHA_ADDRESS = 'KT1WsZmN6nUrRUmZQgTorbvp4KhRNin9W4o6';

function callAt(destination, entrypoint, value, amountMutez = '0') {
  return dAppClient.requestOperation({
    operationDetails: [{
      kind: 'transaction',
      destination,
      amount: String(amountMutez),
      parameters: { entrypoint, value },
    }],
  });
}

const call = (entrypoint, value, amountMutez = '0') =>
  callAt(GACHA_ADDRESS, entrypoint, value, amountMutez);

const asInt = (x) => ({ int: String(BigInt(x)) });
const asAddr = (x) => ({ string: String(x) });
const pair = (a, b) => ({ prim: 'Pair', args: [a, b] });
const asTimestamp = (t) => {
  if (t instanceof Date) return asInt(Math.floor(t.getTime() / 1000));
  if (typeof t === 'number') return asInt(t);
  const d = new Date(t);
  return asInt(isNaN(d.getTime()) ? t : Math.floor(d.getTime() / 1000));
};

const poolArg = (poolId) => asInt(poolId);
const totalMutez = (priceMutez, qty) => (BigInt(priceMutez) * BigInt(qty)).toString();

export const submitBuyOne = (poolId, priceMutez) =>
  call('buy_one', poolArg(poolId), totalMutez(priceMutez, 1));

export const submitBuyThree = (poolId, priceMutez) =>
  call('buy_three', poolArg(poolId), totalMutez(priceMutez, 3));

export const submitBuyFive = (poolId, priceMutez) =>
  call('buy_five', poolArg(poolId), totalMutez(priceMutez, 5));

export const submitActivatePool = (poolId) => call('activate_pool', asInt(poolId));
export const submitDeactivatePool = (poolId) => call('deactivate_pool', asInt(poolId));

// FA2 transfer (TZIP-12 layout: list< Pair(from_, list< Pair(to_, Pair(token_id, amount)) >) >)
export function submitFa2Transfer(fa2Address, from_, to_, tokenId, amount) {
  const tx = pair(asAddr(to_), pair(asInt(tokenId), asInt(amount)));
  const value = [pair(asAddr(from_), [tx])];
  return callAt(fa2Address, 'transfer', value);
}

// withdraw_tokens: Pair(amount, Pair(destination, Pair(fa2_address, token_id)))
export function submitWithdrawTokens({ fa2_address, token_id, amount, destination }) {
  const value = pair(
    asInt(amount),
    pair(asAddr(destination), pair(asAddr(fa2_address), asInt(token_id))),
  );
  return call('withdraw_tokens', value);
}

// create_pool: Pair(end_time, Pair(max_per_wallet, Pair(price_per_nft, Pair(start_time, tokens))))
// each token: Pair(artist_address, Pair(editions, Pair(fa2_address, token_id)))
export function submitCreatePool({ tokens, start_time, end_time, price_per_nft, max_per_wallet }) {
  const tokensList = tokens.map(({ fa2_address, token_id, editions, artist_address }) =>
    pair(asAddr(artist_address), pair(asInt(editions), pair(asAddr(fa2_address), asInt(token_id))))
  );
  const value = pair(
    asTimestamp(end_time),
    pair(
      asInt(max_per_wallet),
      pair(
        asInt(price_per_nft),
        pair(asTimestamp(start_time), tokensList),
      ),
    ),
  );
  return call('create_pool', value);
}

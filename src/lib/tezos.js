import { DAppClient, NetworkType } from '@tezos-x/octez.connect-sdk';

export const dAppClient = new DAppClient({
  name: 'Jukebox',
  network: { type: NetworkType.SHADOWNET },
});

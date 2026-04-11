import { create } from 'zustand';
import { BeaconEvent, PermissionScope } from '@tezos-x/octez.connect-sdk';
import { dAppClient } from '../lib/tezos';

export const useWallet = create((set) => ({
  address: null,
  status: 'idle',
  error: null,

  hydrate: async () => {
    const account = await dAppClient.getActiveAccount();
    if (account) set({ address: account.address, status: 'connected' });
  },

  connect: async () => {
    set({ status: 'connecting', error: null });
    try {
      await dAppClient.requestPermissions({
        scopes: [PermissionScope.OPERATION_REQUEST, PermissionScope.SIGN],
      });
      const account = await dAppClient.getActiveAccount();
      set({ address: account?.address ?? null, status: account ? 'connected' : 'idle' });
    } catch (error) {
      console.error('[wallet] connect failed:', error);
      set({ status: 'error', error: error.message });
    }
  },

  disconnect: async () => {
    await dAppClient.clearActiveAccount();
    set({ address: null, status: 'idle' });
  },
}));

dAppClient.subscribeToEvent(BeaconEvent.ACTIVE_ACCOUNT_SET, (account) => {
  useWallet.setState({
    address: account?.address ?? null,
    status: account ? 'connected' : 'idle',
  });
});

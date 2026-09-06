import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import type { NetworkStatus } from '@capacitor/network';

export type ConnectivityListener = (online: boolean) => void;

let online = true;

export function isOnline(): boolean {
  return online;
}

export async function initConnectivity(listener: ConnectivityListener): Promise<void> {
  try {
    const status = await Network.getStatus();
    online = status.connected;
    setListeners(listener);
  } catch {
    online = true;
    setListeners(listener);
  }
}

function setListeners(listener: ConnectivityListener): void {
  const handler = (status: NetworkStatus) => {
    online = status.connected;
    listener(status.connected);
  };
  try {
    Network.addListener('networkStatusChange', handler);
  } catch {
    if ('addEventListener' in window) {
      window.addEventListener('online', () => {
        online = true;
        listener(true);
      });
      window.addEventListener('offline', () => {
        online = false;
        listener(false);
      });
    }
  }
}

export function isNative(): boolean {
  return Capacitor.getPlatform() !== 'web';
}
/**
 * useOffline — Hook for monitoring Internet connectivity
 */
import { useEffect } from 'react';
import { useMeshStore } from '../store/meshStore';

export function useOffline() {
  const { internetStatus, setInternetStatus, addNotification } = useMeshStore();

  useEffect(() => {
    const handleOnline = () => {
      setInternetStatus('online');
      addNotification('success', 'Internet connection restored');
    };

    const handleOffline = () => {
      setInternetStatus('offline');
      addNotification('warning', 'Internet unavailable — MeshLink running in offline mode');
    };

    // Set initial state
    setInternetStatus(navigator.onLine ? 'online' : 'offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { internetStatus, isOffline: internetStatus === 'offline' };
}

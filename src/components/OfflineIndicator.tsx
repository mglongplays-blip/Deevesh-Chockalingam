import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-18 md:bottom-4 left-4 z-50 flex items-center gap-2.5 rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/90 px-3.5 py-2 text-xs font-medium text-amber-900 dark:text-amber-100 shadow-lg"
    >
      <WifiOff className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <span>Offline mode — cached workspace shell is active. AI features require internet access.</span>
    </div>
  );
};

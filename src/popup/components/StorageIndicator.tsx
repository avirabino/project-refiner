import React, { useState, useEffect } from 'react';

interface StorageEstimate {
  usage: number;
  quota: number;
}

export const StorageIndicator: React.FC = () => {
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null);

  useEffect(() => {
    const checkStorage = async () => {
      if (navigator.storage && navigator.storage.estimate) {
        try {
          const result = await navigator.storage.estimate();
          setEstimate({ usage: result.usage || 0, quota: result.quota || 0 });
        } catch (err) {
          console.warn('[Vigil] Failed to estimate storage:', err);
        }
      }
    };
    
    checkStorage();
    // Refresh every minute just in case
    const interval = setInterval(checkStorage, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!estimate) return null;

  const usageMb = (estimate.usage / (1024 * 1024)).toFixed(1);
  const quotaMb = (estimate.quota / (1024 * 1024)).toFixed(0);
  const percentUsed = estimate.quota > 0 ? (estimate.usage / estimate.quota) * 100 : 0;

  let colorClass = 'text-green-400 bg-green-400/20';
  if (percentUsed > 80) colorClass = 'text-red-400 bg-red-400/20';
  else if (percentUsed > 50) colorClass = 'text-amber-400 bg-amber-400/20';

  return (
    <div className="flex items-center gap-2 px-4 py-2 text-xs border-t border-gray-800 bg-gray-900/30">
      <div className="text-gray-400 flex-1">
        Storage: <span className="font-medium text-gray-300">{usageMb} MB</span> used of {quotaMb} MB
      </div>
      <div className="w-16 h-1.5 rounded-full bg-gray-800 overflow-hidden">
        <div 
          className={`h-full rounded-full ${colorClass.split(' ')[0].replace('text-', 'bg-')}`}
          style={{ width: `${Math.min(100, Math.max(0, percentUsed))}%` }}
        />
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const NetworkToast: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setIsRetrying(false);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    setIsRetrying(true);
    // Simulate a manual check
    if (navigator.onLine) {
      setIsOnline(true);
      setIsRetrying(false);
    } else {
      // Just spin for a moment to show action
      setTimeout(() => setIsRetrying(false), 1000);
    }
  };

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 right-4 z-[9999] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-4 max-w-sm"
        >
          <div className="bg-red-500/20 p-2 rounded-lg text-red-400 shrink-0">
            <WifiOff className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-white">No Internet Connection</h4>
            <p className="text-xs text-slate-300 mt-0.5">Please check your network settings.</p>
          </div>
          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className="flex items-center justify-center p-2 rounded-lg hover:bg-slate-800 transition-colors shrink-0 disabled:opacity-50 text-slate-300 hover:text-white"
            aria-label="Retry connection"
          >
            <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NetworkToast;

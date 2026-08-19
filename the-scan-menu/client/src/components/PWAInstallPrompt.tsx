import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, PlusSquare, WifiOff, CheckCircle2 } from 'lucide-react';
import usePWAInstall from '../hooks/usePWAInstall';
import { ScanMenuLogo } from './ScanMenuLogo';

interface PWAInstallPromptProps {
  showBannerOnly?: boolean;
}

export const PWAInstallPrompt: React.FC<PWAInstallPromptProps> = () => {
  const { isInstallable, isIOS, isOffline, promptInstall, dismissInstall } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
    } else {
      const success = await promptInstall();
      if (!success) {
        // Fallback for browsers without direct prompt
        setShowIOSModal(true);
      }
    }
  };

  return (
    <>
      {/* ----------------- OFFLINE NETWORK STATUS BANNER ----------------- */}
      <AnimatePresence>
        {isOffline && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md z-50 shrink-0 border-b border-amber-600/30"
          >
            <div className="flex items-center gap-2 max-w-4xl mx-auto w-full">
              <WifiOff className="w-4 h-4 shrink-0 text-slate-950" strokeWidth={2} />
              <span className="truncate">
                <strong>You are currently offline.</strong> Local data is preserved. Live orders will resume once network reconnects.
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------- PWA INSTALL PROMPT BANNER ----------------- */}
      <AnimatePresence>
        {(isInstallable || isIOS) && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto md:w-96 z-50 bg-slate-950 text-white p-4 rounded-3xl shadow-2xl border border-slate-800 backdrop-blur-md"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-2xl flex items-center justify-center shadow-lg shrink-0">
                  <ScanMenuLogo size={28} variant="white" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5">
                    Install The Scan Menu
                    <span className="text-[10px] bg-amber-500/20 text-amber-400 font-mono px-2 py-0.5 rounded-full font-bold">PWA</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 leading-snug">
                    Install on home screen for quick order alerts and full screen management.
                  </p>
                </div>
              </div>
              <button
                onClick={dismissInstall}
                className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition shrink-0"
                aria-label="Dismiss install prompt"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={handleInstallClick}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs py-2.5 px-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" strokeWidth={2} />
                <span>Install App</span>
              </button>
              <button
                onClick={dismissInstall}
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold text-xs py-2.5 px-3 rounded-2xl transition"
              >
                Maybe Later
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------- IOS INSTALLATION MODAL GUIDE ----------------- */}
      <AnimatePresence>
        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIOSModal(false)}
              className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
            />

            {/* Dialog Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 border border-slate-150 z-10 text-slate-900"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-900 rounded-2xl flex items-center justify-center shadow-xs">
                    <ScanMenuLogo size={22} variant="white" />
                  </div>
                  <div>
                    <h2 className="font-display tracking-tight text-xl font-semibold text-slate-900">
                      Install The Scan Menu
                    </h2>
                    <p className="text-xs text-slate-500 font-sans">iOS Safari Web App Setup</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition"
                >
                  <X className="w-5 h-5" strokeWidth={2} />
                </button>
              </div>

              <div className="space-y-4 my-6">
                <div className="flex items-start gap-3.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-150">
                  <div className="w-7 h-7 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                    1
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Tap Share Button <Share className="w-3.5 h-3.5 text-sky-600" strokeWidth={2} />
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tap the Share icon in the Safari bottom toolbar menu.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-150">
                  <div className="w-7 h-7 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                    2
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Select Add to Home Screen <PlusSquare className="w-3.5 h-3.5 text-amber-600" strokeWidth={2} />
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Scroll down in the action list and select <strong>"Add to Home Screen"</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-150">
                  <div className="w-7 h-7 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                    3
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      Confirm Installation <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Tap <strong>"Add"</strong> in the top right to launch directly from your home screen.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs py-3 rounded-2xl transition"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PWAInstallPrompt;

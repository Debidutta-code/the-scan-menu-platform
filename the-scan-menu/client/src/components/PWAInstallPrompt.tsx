import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Share, PlusSquare, WifiOff, CheckCircle2 } from 'lucide-react';
import usePWAInstall from '../hooks/usePWAInstall';
import { ScanMenuLogo } from './ScanMenuLogo';
import { Button } from './ui/Button';

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
            className="fixed bottom-16 md:bottom-5 right-3 left-3 md:left-auto md:w-88 z-50 bg-slate-950 text-white p-3 sm:p-3.5 rounded-2xl shadow-2xl border border-slate-800 backdrop-blur-md select-none font-sans"
          >
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center shadow-2xs shrink-0">
                  <ScanMenuLogo size={20} variant="white" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5 font-display">
                    Install The Scan Menu
                    <span className="text-[9px] bg-amber-500/20 text-amber-400 font-mono px-1.5 py-0.2 rounded font-bold">PWA</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Install on workstation for quick alerts and standalone POS mode.
                  </p>
                </div>
              </div>
              <button
                onClick={dismissInstall}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition shrink-0 cursor-pointer"
                aria-label="Dismiss install prompt"
              >
                <X className="w-3.5 h-3.5" strokeWidth={2} />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <Button
                type="button"
                variant="amber"
                size="sm"
                fullWidth
                onClick={handleInstallClick}
                leftIcon={<Download className="w-3.5 h-3.5" strokeWidth={2} />}
              >
                Install App
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800"
                onClick={dismissInstall}
              >
                Maybe Later
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ----------------- IOS INSTALLATION MODAL GUIDE ----------------- */}
      <AnimatePresence>
        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 select-none font-sans">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowIOSModal(false)}
              className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs"
            />

            {/* Dialog Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-4 sm:p-5 border border-slate-200/80 z-10 text-slate-900"
            >
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-slate-900 rounded-xl flex items-center justify-center shadow-2xs">
                    <ScanMenuLogo size={18} variant="white" />
                  </div>
                  <div>
                    <h2 className="font-display tracking-tight text-xs sm:text-sm font-bold text-slate-900">
                      Install The Scan Menu
                    </h2>
                    <p className="text-[11px] text-slate-500 font-sans">iOS Safari Web App Setup</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowIOSModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
              </div>

              <div className="space-y-2.5 my-4">
                <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <div className="w-5 h-5 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">
                    1
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      Tap Share Button <Share className="w-3 h-3 text-sky-600" strokeWidth={2} />
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.2">
                      Tap the Share icon in the Safari bottom toolbar menu.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <div className="w-5 h-5 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">
                    2
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      Select Add to Home Screen <PlusSquare className="w-3 h-3 text-amber-600" strokeWidth={2} />
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.2">
                      Scroll down in the action list and select <strong>"Add to Home Screen"</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 shadow-2xs">
                  <div className="w-5 h-5 bg-slate-900 text-white rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 font-mono">
                    3
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900 flex items-center gap-1">
                      Confirm Installation <CheckCircle2 className="w-3 h-3 text-emerald-600" strokeWidth={2} />
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.2">
                      Tap <strong>"Add"</strong> in the top right to launch directly from your home screen.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                type="button"
                variant="primary"
                fullWidth
                onClick={() => setShowIOSModal(false)}
              >
                Got It
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PWAInstallPrompt;

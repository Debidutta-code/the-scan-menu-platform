import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  X,
  Laptop,
  Apple,
  Smartphone,
  Share2,
  CheckCircle2,
  Zap,
  Volume2,
  Printer,
  Sparkles,
} from 'lucide-react';
import usePWAInstall from '../hooks/usePWAInstall';
import { ScanMenuLogo } from './ScanMenuLogo';

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PlatformTab = 'windows' | 'mac' | 'android' | 'ios';

export const AppDownloadModal: React.FC<AppDownloadModalProps> = ({ isOpen, onClose }) => {
  const { canPromptDirectly, isInstalled, os, promptInstall } = usePWAInstall();

  const [activeTab, setActiveTab] = useState<PlatformTab>(() => {
    if (os === 'windows') return 'windows';
    if (os === 'mac') return 'mac';
    if (os === 'android') return 'android';
    if (os === 'ios') return 'ios';
    return 'windows';
  });

  const [installSuccess, setInstallSuccess] = useState(false);

  const handleDirectInstall = async () => {
    const success = await promptInstall();
    if (success) {
      setInstallSuccess(true);
    }
  };

  const appUrl = window.location.origin;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden text-slate-900"
          >
            {/* Header */}
            <div className="px-6 pt-6 pb-4 flex items-start justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center shadow-md shrink-0 border border-slate-800">
                  <ScanMenuLogo size={24} variant="white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                    Install The Scan Menu
                  </h3>
                  <p className="text-xs text-slate-500 mt-1.5 leading-normal">
                    Standalone POS workstation with background audio alerts and thermal printing.
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 flex items-center justify-center transition"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Platform Selector (Clean Segmented Tabs) */}
            <div className="px-6 pt-2">
              <div className="p-1 bg-slate-100 rounded-2xl flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('windows')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'windows'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Laptop className="w-3.5 h-3.5" />
                  <span>Windows</span>
                  {os === 'windows' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('mac')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'mac'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Apple className="w-3.5 h-3.5" />
                  <span>macOS</span>
                  {os === 'mac' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('android')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'android'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Android</span>
                  {os === 'android' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-0.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('ios')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition ${
                    activeTab === 'ios'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>iOS / iPad</span>
                  {os === 'ios' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 ml-0.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Platform Content */}
            <div className="p-6 space-y-5">
              {/* WINDOWS TAB */}
              {activeTab === 'windows' && (
                <div className="space-y-4">
                  {/* Hero Install Box */}
                  <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200/80 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">
                          The Scan Menu for Windows
                        </h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Runs full screen in its own window, pins to your taskbar, and stays connected to live kitchen tickets.
                        </p>
                      </div>
                      <span className="text-[10px] font-medium bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md shrink-0">
                        Win 10 & 11
                      </span>
                    </div>

                    {isInstalled || installSuccess ? (
                      <div className="py-3 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>The Scan Menu is installed and ready on this computer.</span>
                      </div>
                    ) : canPromptDirectly ? (
                      <button
                        type="button"
                        onClick={handleDirectInstall}
                        className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition active:scale-98"
                      >
                        <Download className="w-4 h-4 text-amber-400" />
                        <span>Install on Windows</span>
                      </button>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs space-y-1">
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          <span>Direct 1-Click Install</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          In <strong>Chrome</strong> or <strong>Edge</strong>, click the <strong>Install</strong> icon in the right side of the address bar to add to Windows.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* 3 Steps */}
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">STEP 01</span>
                      <h5 className="font-semibold text-slate-800 mt-1 text-[11px]">Install App</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Click install from the button above.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">STEP 02</span>
                      <h5 className="font-semibold text-slate-800 mt-1 text-[11px]">Pin to Taskbar</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Right-click the icon on your taskbar and pin it.</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">STEP 03</span>
                      <h5 className="font-semibold text-slate-800 mt-1 text-[11px]">Launch at Open</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Instant cashier access with auto audio chimes.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* MACOS TAB */}
              {activeTab === 'mac' && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200/80 space-y-3 text-xs">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Add to macOS Dock & Launchpad
                      </h4>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Run as a native Mac app without browser tabs.
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-1">
                        <span className="font-semibold text-slate-900 text-[11px]">Using Safari (macOS Sonoma or later)</span>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Click <strong>File</strong> in the top menu bar &rarr; Select <strong>Add to Dock...</strong> &rarr; Click <strong>Add</strong>.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-1">
                        <span className="font-semibold text-slate-900 text-[11px]">Using Google Chrome</span>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Click the <strong>Install</strong> icon in the address bar, or click <strong>Settings (⋮) &rarr; Save and Share &rarr; Install</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ANDROID TAB */}
              {activeTab === 'android' && (
                <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200/80 flex flex-col sm:flex-row items-center gap-5">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 shrink-0 shadow-xs">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&margin=0&data=${encodeURIComponent(appUrl)}`}
                      alt="Scan to Install"
                      className="w-24 h-24 rounded-lg object-contain"
                      loading="lazy"
                    />
                  </div>
                  <div className="space-y-1.5 text-xs text-center sm:text-left">
                    <h4 className="text-sm font-bold text-slate-900">Scan to Open on Android</h4>
                    <p className="text-[11px] text-slate-500 leading-normal">
                      Scan with your phone camera to open. In Chrome, tap the 3 dots (⋮) and select <strong>Add to Home screen</strong> or tap the install prompt at the bottom.
                    </p>
                  </div>
                </div>
              )}

              {/* IOS TAB */}
              {activeTab === 'ios' && (
                <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200/80 space-y-3 text-xs">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Install on iPhone & iPad</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Quick setup via Safari.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                    <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">01</span>
                      <p className="text-[11px] text-slate-700 font-medium mt-1">Open in Safari</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">02</span>
                      <p className="text-[11px] text-slate-700 font-medium mt-1">Tap Share button</p>
                    </div>
                    <div className="p-3 rounded-xl bg-white border border-slate-200/80">
                      <span className="text-[10px] font-bold text-slate-400 font-mono">03</span>
                      <p className="text-[11px] text-slate-700 font-medium mt-1">Add to Home Screen</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Core Features */}
              <div className="grid grid-cols-3 gap-3 pt-1 border-t border-slate-100">
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-[11px] font-medium">Fast Offline Cache</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <Volume2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span className="text-[11px] font-medium">Order Audio Chimes</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600 text-xs">
                  <Printer className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="text-[11px] font-medium">Thermal Printing</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-150 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">
                Progressive Web App • Automatic Updates
              </span>

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold text-xs transition"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default AppDownloadModal;

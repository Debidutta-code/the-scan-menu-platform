import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  X,
  Monitor,
  Smartphone,
  Apple,
  CheckCircle2,
  Zap,
  Bell,
  Printer,
  Sparkles,
  Share2,
  PlusSquare,
  ShieldCheck,
  Laptop,
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="bg-white rounded-3xl border border-slate-150 shadow-2xl max-w-3xl w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-900"
          >
            {/* Modal Header */}
            <div className="p-5 md:p-6 bg-slate-950 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0 border border-amber-400/40">
                  <ScanMenuLogo size={28} variant="white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-lg md:text-xl font-bold tracking-tight text-white">
                      The Scan Menu App
                    </h3>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
                      Desktop & Mobile
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Fast standalone POS workstation, real-time audio order alerts, and offline resiliency.
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-9 h-9 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition"
                aria-label="Close download modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Platform Selector Tabs */}
            <div className="bg-slate-50 border-b border-slate-200 px-6 py-2 flex items-center gap-2 overflow-x-auto shrink-0">
              <button
                onClick={() => setActiveTab('windows')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === 'windows'
                    ? 'bg-slate-950 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Laptop className="w-4 h-4 text-sky-400" />
                <span>Windows (PC)</span>
                {os === 'windows' && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-sky-500/30 text-sky-300 font-mono">
                    Detected
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('mac')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === 'mac'
                    ? 'bg-slate-950 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Apple className="w-4 h-4 text-slate-300" />
                <span>macOS</span>
                {os === 'mac' && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-300/30 text-white font-mono">
                    Detected
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('android')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === 'android'
                    ? 'bg-slate-950 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span>Android</span>
                {os === 'android' && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-emerald-500/30 text-emerald-300 font-mono">
                    Detected
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('ios')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                  activeTab === 'ios'
                    ? 'bg-slate-950 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <Share2 className="w-4 h-4 text-indigo-400" />
                <span>iOS / iPadOS</span>
                {os === 'ios' && (
                  <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-indigo-500/30 text-indigo-300 font-mono">
                    Detected
                  </span>
                )}
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
              {/* TAB 1: WINDOWS (PC) */}
              {activeTab === 'windows' && (
                <div className="space-y-6">
                  {/* Taskbar & Standalone Visual Showcase */}
                  <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 text-white space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-sky-400" />
                        <h4 className="font-bold text-sm text-white">Windows Native Desktop Experience</h4>
                      </div>
                      <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 px-2.5 py-0.5 rounded-full font-bold">
                        Win 10 / 11 Compatible
                      </span>
                    </div>

                    {/* Visual Windows Taskbar Mockup */}
                    <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 space-y-3">
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Runs directly on your Windows taskbar with dedicated hardware acceleration, frameless kiosk mode, and instant launch:
                      </p>

                      {/* Mockup Taskbar Bar */}
                      <div className="h-14 bg-slate-900/90 rounded-xl border border-slate-700/80 flex items-center justify-between px-4 shadow-inner">
                        <div className="flex items-center gap-3">
                          {/* Windows Start Button */}
                          <div className="w-7 h-7 rounded-lg bg-sky-600/30 flex items-center justify-center">
                            <div className="grid grid-cols-2 gap-0.5">
                              <div className="w-1.5 h-1.5 bg-sky-400 rounded-xs" />
                              <div className="w-1.5 h-1.5 bg-sky-400 rounded-xs" />
                              <div className="w-1.5 h-1.5 bg-sky-400 rounded-xs" />
                              <div className="w-1.5 h-1.5 bg-sky-400 rounded-xs" />
                            </div>
                          </div>

                          {/* Divider */}
                          <div className="w-px h-5 bg-slate-800" />

                          {/* App Taskbar Icon (SM Logo) */}
                          <div className="relative group flex flex-col items-center">
                            <div className="w-9 h-9 rounded-xl bg-black border border-slate-700 flex items-center justify-center shadow-lg shadow-black/60 ring-2 ring-amber-500/50">
                              <ScanMenuLogo size={20} variant="white" />
                            </div>
                            <div className="w-4 h-0.5 bg-amber-500 rounded-full mt-0.5" />
                          </div>
                        </div>

                        <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                          <span>POS Running Standalone</span>
                        </div>
                      </div>
                    </div>

                    {/* Primary Install Trigger Button */}
                    <div className="pt-1 flex flex-col sm:flex-row gap-3">
                      {isInstalled || installSuccess ? (
                        <div className="flex-1 py-3 px-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span>The Scan Menu is Installed & Ready on Windows</span>
                        </div>
                      ) : canPromptDirectly ? (
                        <button
                          onClick={handleDirectInstall}
                          className="flex-1 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2.5 shadow-xl shadow-amber-500/25 transition-all active:scale-98"
                        >
                          <Download className="w-5 h-5 stroke-[2.5]" />
                          <span>Install The Scan Menu for Windows</span>
                        </button>
                      ) : (
                        <div className="flex-1 p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-300 space-y-1">
                          <div className="font-bold text-white flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span>1-Click Install via Browser Toolbar</span>
                          </div>
                          <p className="text-[11px] text-slate-400 leading-snug">
                            In <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>, click the <strong>Install</strong> icon (computer with down arrow) in the address bar to add to Windows.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 3 Simple Steps */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 space-y-1.5">
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">1</span>
                      <h5 className="font-bold text-slate-900 text-xs">Click Install</h5>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Click the Install button above or the install icon on your browser address bar.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 space-y-1.5">
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">2</span>
                      <h5 className="font-bold text-slate-900 text-xs">Pin to Taskbar</h5>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Right-click <strong>The Scan Menu</strong> icon on your Windows taskbar and select <strong>Pin to Taskbar</strong>.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 space-y-1.5">
                      <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-mono font-bold text-xs flex items-center justify-center">3</span>
                      <h5 className="font-bold text-slate-900 text-xs">Auto-Start & POS</h5>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Launch instantly on store open for continuous background sound chimes and instant order printing.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MACOS */}
              {activeTab === 'mac' && (
                <div className="space-y-6">
                  <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 text-white space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Apple className="w-4 h-4 text-slate-300" />
                        <h4 className="font-bold text-sm text-white">macOS Dock & Desktop Integration</h4>
                      </div>
                      <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-bold">
                        macOS Sonoma & Newer
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                        <h5 className="font-bold text-amber-400 text-xs flex items-center gap-2">
                          <span>Via Safari (Recommended)</span>
                        </h5>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          1. In Safari, click <strong>File</strong> in the top menu bar.<br />
                          2. Select <strong>Add to Dock...</strong><br />
                          3. Click <strong>Add</strong> to launch The Scan Menu as a native Mac app in your Dock and Launchpad.
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                        <h5 className="font-bold text-sky-400 text-xs flex items-center gap-2">
                          <span>Via Google Chrome / Brave</span>
                        </h5>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          Click the <strong>Install</strong> icon in the address bar, or click <strong>Settings (⋮) &rarr; Save and Share &rarr; Install The Scan Menu</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: ANDROID */}
              {activeTab === 'android' && (
                <div className="space-y-6">
                  <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 text-white space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-emerald-400" />
                        <h4 className="font-bold text-sm text-white">Android Mobile & Tablet Installation</h4>
                      </div>
                      <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                        Instant PWA
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                      <div className="p-2.5 bg-white rounded-2xl shrink-0 shadow-lg">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=0&data=${encodeURIComponent(appUrl)}`}
                          alt="Scan to Install"
                          className="w-28 h-28 rounded-lg object-contain"
                          loading="lazy"
                        />
                      </div>
                      <div className="space-y-2 text-xs">
                        <h5 className="font-bold text-white text-sm">Scan with Android Camera / Chrome</h5>
                        <p className="text-slate-400 leading-relaxed text-[11px]">
                          Scan the QR code to open the restaurant manager or staff view on your Android device. Tap <strong>Add to Home screen</strong> or the bottom install banner.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: IOS / IPADOS */}
              {activeTab === 'ios' && (
                <div className="space-y-6">
                  <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 text-white space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Apple className="w-4 h-4 text-slate-300" />
                        <h4 className="font-bold text-sm text-white">iPhone & iPad Home Screen App</h4>
                      </div>
                      <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full font-bold">
                        iOS Safari
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 text-indigo-400 font-bold">
                          1
                        </div>
                        <div>
                          <h6 className="font-bold text-white text-xs">Open in Safari</h6>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Open this portal in Safari on your iPhone or iPad.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 text-indigo-400 font-bold">
                          <Share2 className="w-4 h-4" />
                        </div>
                        <div>
                          <h6 className="font-bold text-white text-xs">Tap the Share Button</h6>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Tap the <strong>Share</strong> icon (square with upward arrow) at the bottom toolbar.
                          </p>
                        </div>
                      </div>

                      <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center shrink-0 text-indigo-400 font-bold">
                          <PlusSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <h6 className="font-bold text-white text-xs">Select "Add to Home Screen"</h6>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Scroll down and tap <strong>Add to Home Screen</strong>, then tap <strong>Add</strong> in the top right.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Core App Advantages Highlights */}
              <div className="pt-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] font-mono mb-3">
                  Why Install The Scan Menu Native App
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <h6 className="font-bold text-slate-900 text-xs">Instant 0ms Load</h6>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      Cached offline assets for rapid order punching.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
                    <Bell className="w-4 h-4 text-emerald-500" />
                    <h6 className="font-bold text-slate-900 text-xs">Loud Audio Chimes</h6>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      Never miss a ticket even when minimized.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
                    <Printer className="w-4 h-4 text-indigo-500" />
                    <h6 className="font-bold text-slate-900 text-xs">Hardware Printing</h6>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      Seamless direct receipt & KOT printing.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-150 space-y-1">
                    <ShieldCheck className="w-4 h-4 text-sky-500" />
                    <h6 className="font-bold text-slate-900 text-xs">Kiosk POS Mode</h6>
                    <p className="text-[10px] text-slate-500 leading-snug">
                      Distraction-free cashier terminal view.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0 text-xs">
              <div className="flex items-center gap-2 text-slate-500 font-mono text-[11px]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Verified Progressive Web App • Instant Auto-Updates</span>
              </div>

              <button
                onClick={onClose}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition"
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

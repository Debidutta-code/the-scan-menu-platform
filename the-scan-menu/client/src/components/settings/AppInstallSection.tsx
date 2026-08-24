import React, { useState } from 'react';
import usePWAInstall from '../../hooks/usePWAInstall';
import { ScanMenuLogo } from '../ScanMenuLogo';
import {
  Download,
  Smartphone,
  Apple,
  Laptop,
  Sparkles,
  CheckCircle2,
  Share2,
  Zap,
  Volume2,
  Printer,
} from 'lucide-react';

export const AppInstallSection: React.FC = () => {
  const { canPromptDirectly, isInstalled, os, promptInstall } = usePWAInstall();
  const [platformPreviewTab, setPlatformPreviewTab] = useState<'windows' | 'mac' | 'android' | 'ios'>(() => {
    if (os === 'windows') return 'windows';
    if (os === 'mac') return 'mac';
    if (os === 'android') return 'android';
    if (os === 'ios') return 'ios';
    return 'windows';
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-150 p-6 md:p-8 shadow-sm space-y-6">
      <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center shadow-md shrink-0 border border-slate-800">
            <ScanMenuLogo size={24} variant="white" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
              Install The Scan Menu
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Standalone POS workstation with background audio order alerts and thermal receipt printing.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-[10px] font-semibold shrink-0 self-start sm:self-auto">
          <Sparkles className="w-3 h-3 text-amber-500" />
          <span>Desktop & Mobile App</span>
        </div>
      </div>

      {/* Segmented Platform Switcher */}
      <div className="p-1 bg-slate-100 rounded-2xl flex items-center gap-1 max-w-lg">
        <button
          type="button"
          onClick={() => setPlatformPreviewTab('windows')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
            platformPreviewTab === 'windows'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Laptop className="w-3.5 h-3.5" />
          <span>Windows</span>
          {os === 'windows' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
        </button>

        <button
          type="button"
          onClick={() => setPlatformPreviewTab('mac')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
            platformPreviewTab === 'mac'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Apple className="w-3.5 h-3.5" />
          <span>macOS</span>
          {os === 'mac' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
        </button>

        <button
          type="button"
          onClick={() => setPlatformPreviewTab('android')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
            platformPreviewTab === 'android'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Android</span>
          {os === 'android' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
        </button>

        <button
          type="button"
          onClick={() => setPlatformPreviewTab('ios')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition cursor-pointer ${
            platformPreviewTab === 'ios'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>iOS / iPad</span>
          {os === 'ios' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
        </button>
      </div>

      {/* Platform Content */}
      {platformPreviewTab === 'windows' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200/80 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  The Scan Menu for Windows
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Runs standalone in its own window, pins to your Windows taskbar, and delivers immediate order sound alerts.
                </p>
              </div>
              <span className="text-[10px] font-medium bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md shrink-0 font-mono">
                Win 10 & 11
              </span>
            </div>

            {isInstalled ? (
              <div className="py-3 px-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>The Scan Menu is installed and active on this computer.</span>
              </div>
            ) : canPromptDirectly ? (
              <button
                type="button"
                onClick={() => promptInstall()}
                className="py-3 px-6 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-2 shadow-sm transition active:scale-98 cursor-pointer"
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
                  In <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong>, click the <strong>Install</strong> icon in the address bar to add to Windows.
                </p>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 font-mono">STEP 01</span>
              <h5 className="font-semibold text-slate-800 mt-1 text-[11px]">Install App</h5>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Click install from the prompt or browser address bar.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 font-mono">STEP 02</span>
              <h5 className="font-semibold text-slate-800 mt-1 text-[11px]">Pin to Taskbar</h5>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Right-click the icon on your taskbar and select Pin.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 font-mono">STEP 03</span>
              <h5 className="font-semibold text-slate-800 mt-1 text-[11px]">Launch at Store Open</h5>
              <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">Continuous background order chimes and receipt printing.</p>
            </div>
          </div>
        </div>
      )}

      {platformPreviewTab === 'mac' && (
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200/80 space-y-3 text-xs">
          <h4 className="text-sm font-bold text-slate-900">Add to macOS Dock & Launchpad</h4>
          <div className="space-y-2 pt-1">
            <div className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-1">
              <span className="font-semibold text-slate-900 text-[11px]">Using Safari (macOS Sonoma or later)</span>
              <p className="text-[11px] text-slate-500">Click <strong>File</strong> &rarr; <strong>Add to Dock...</strong> &rarr; <strong>Add</strong>.</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-1">
              <span className="font-semibold text-slate-900 text-[11px]">Using Google Chrome</span>
              <p className="text-[11px] text-slate-500">Click the <strong>Install</strong> icon in the address bar.</p>
            </div>
          </div>
        </div>
      )}

      {platformPreviewTab === 'android' && (
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200/80 flex flex-col sm:flex-row items-center gap-5">
          <div className="p-2.5 bg-white rounded-xl border border-slate-200 shrink-0 shadow-xs">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&margin=0&data=${encodeURIComponent(window.location.origin)}`}
              alt="Scan to Install"
              className="w-24 h-24 rounded-lg object-contain"
              loading="lazy"
            />
          </div>
          <div className="space-y-1 text-xs text-center sm:text-left">
            <h4 className="text-sm font-bold text-slate-900">Scan to Open on Android</h4>
            <p className="text-[11px] text-slate-500 leading-normal">
              Scan with your phone camera to open. In Chrome, tap the 3 dots (⋮) and choose <strong>Add to Home screen</strong>.
            </p>
          </div>
        </div>
      )}

      {platformPreviewTab === 'ios' && (
        <div className="p-5 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 border border-slate-200/80 space-y-3 text-xs">
          <h4 className="text-sm font-bold text-slate-900">Install on iPhone & iPad</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <div className="p-3 rounded-xl bg-white border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 font-mono">01</span>
              <p className="text-[11px] text-slate-700 font-medium mt-1">Open in Safari</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 font-mono">02</span>
              <p className="text-[11px] text-slate-700 font-medium mt-1">Tap Share</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-200/80">
              <span className="text-[10px] font-bold text-slate-400 font-mono">03</span>
              <p className="text-[11px] text-slate-700 font-medium mt-1">Add to Home Screen</p>
            </div>
          </div>
        </div>
      )}

      {/* Core Features Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2 text-slate-600 text-xs">
          <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="text-[11px] font-medium">Instant 0ms Local Cache</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-xs">
          <Volume2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          <span className="text-[11px] font-medium">Background Sound Chimes</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600 text-xs">
          <Printer className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="text-[11px] font-medium">Thermal POS Printing</span>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { ArrowLeft, Layers, Sparkles, DollarSign, Package, Sliders, Eye } from 'lucide-react';

interface MenuItemEditorSkeletonProps {
  isEditMode?: boolean;
}

export const MenuItemEditorSkeleton: React.FC<MenuItemEditorSkeletonProps> = ({ isEditMode = true }) => {
  const steps = [
    { id: 1, title: 'Basic Details', subtitle: 'Name, category & tags', icon: Layers },
    { id: 2, title: 'Dish Imagery', subtitle: 'Photo & presentation', icon: Sparkles },
    { id: 3, title: 'Pricing & Stock', subtitle: 'Price, variants & stock', icon: DollarSign },
    { id: 4, title: 'Bundling (Optional)', subtitle: 'Bundle combo builder', icon: Package },
    { id: 5, title: 'Add-ons & Modifiers', subtitle: 'Custom & template options', icon: Sliders },
    { id: 6, title: 'Review & Publish', subtitle: 'Review & save item', icon: Eye },
  ];

  return (
    <div className="h-full w-full bg-[#F8FAFC] flex flex-col font-sans overflow-hidden animate-pulse select-none">
      {/* ── TOP COMPACT HEADER SKELETON ── */}
      <header className="shrink-0 bg-white border-b border-slate-200/80 shadow-2xs z-20">
        <div className="w-full px-3 sm:px-4 h-12 sm:h-13 flex items-center justify-between gap-3">
          {/* Left: Back & Title */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 -ml-1 text-slate-300 rounded-xl shrink-0">
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" />
            </div>
            <div className="flex items-center gap-2">
              <div className="h-4 sm:h-5 w-28 sm:w-36 bg-slate-200 rounded-md" />
              <div className="h-4 w-16 sm:w-20 bg-slate-100 rounded-full border border-slate-200" />
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="h-7 sm:h-8 w-14 bg-slate-100 rounded-xl" />
            <div className="h-7 sm:h-8 w-20 sm:w-24 bg-slate-100 border border-slate-200 rounded-xl hidden sm:block" />
            <div className="h-7 sm:h-8 w-24 sm:w-28 bg-slate-900/30 rounded-xl" />
          </div>
        </div>
      </header>

      {/* ── MAIN 3-COLUMN WORKSPACE SKELETON ── */}
      <div className="flex-1 min-h-0 p-2 sm:p-2.5 w-full flex flex-col overflow-hidden">
        <div className="h-full min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-2 sm:gap-2.5 items-stretch overflow-hidden">
          {/* ═════════════════════════════════════════════════════════ */}
          {/* COLUMN 1: STEP NAVIGATION SKELETON (3 cols)               */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-3 h-full flex flex-col bg-white rounded-2xl p-2 sm:p-2.5 border border-slate-200/90 shadow-2xs overflow-hidden space-y-1.5">
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 pb-0.5">
              Steps Progress
            </div>
            <div className="space-y-1 flex-1">
              {steps.map((step, idx) => {
                const isActive = idx === 0;
                return (
                  <div
                    key={step.id}
                    className={`w-full p-2 rounded-xl flex items-start gap-2 ${
                      isActive
                        ? 'bg-amber-500/10 border border-amber-500/30'
                        : 'border border-transparent'
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0 ${
                        isActive ? 'bg-amber-400/80 text-amber-950' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      {step.id}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <div
                          className={`h-3.5 rounded ${
                            isActive ? 'w-24 bg-amber-900/30' : 'w-20 bg-slate-200'
                          }`}
                        />
                      </div>
                      <div className="h-2.5 w-28 bg-slate-100 rounded" />
                    </div>
                  </div>
                );
              })}
            </div>

            {isEditMode && (
              <div className="bg-amber-50/60 rounded-xl p-2 border border-amber-100 text-xs space-y-1 mt-auto">
                <div className="h-3 w-20 bg-amber-200/60 rounded" />
                <div className="h-2 w-32 bg-amber-100 rounded" />
              </div>
            )}
          </div>

          {/* ═════════════════════════════════════════════════════════ */}
          {/* COLUMN 2: ACTIVE STEP FORM SKELETON (5 cols)              */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-5 h-full flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {/* Card Header */}
            <div className="px-3.5 sm:px-4 py-2.5 border-b border-slate-100 shrink-0 flex items-center justify-between">
              <div className="space-y-1">
                <div className="h-4 w-28 bg-slate-200 rounded-md" />
                <div className="h-2.5 w-36 bg-slate-100 rounded" />
              </div>
              <div className="h-5 w-20 bg-slate-100 rounded-md border border-slate-200" />
            </div>

            {/* Form Fields Body */}
            <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto space-y-4">
              {/* Field 1: Dish Name */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <div className="h-3 w-20 bg-slate-200 rounded" />
                  <div className="h-2.5 w-10 bg-slate-100 rounded" />
                </div>
                <div className="h-10 w-full bg-slate-50 border border-slate-200 rounded-xl" />
              </div>

              {/* Field 2: Category Dropdown */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <div className="h-3 w-16 bg-slate-200 rounded" />
                  <div className="h-3 w-24 bg-amber-100 rounded" />
                </div>
                <div className="h-10 w-full bg-slate-50 border border-slate-200 rounded-xl" />
              </div>

              {/* Field 3: Description */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <div className="h-3 w-20 bg-slate-200 rounded" />
                  <div className="h-2.5 w-12 bg-slate-100 rounded" />
                </div>
                <div className="h-20 w-full bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                  <div className="h-2.5 w-3/4 bg-slate-200 rounded" />
                  <div className="h-2.5 w-1/2 bg-slate-200 rounded" />
                </div>
              </div>

              {/* Field 4: Dietary & Tags */}
              <div className="space-y-1.5">
                <div className="h-3 w-24 bg-slate-200 rounded" />
                <div className="flex flex-wrap gap-2 pt-0.5">
                  <div className="h-8 w-24 bg-emerald-50 border border-emerald-200/80 rounded-xl" />
                  <div className="h-8 w-18 bg-rose-50 border border-rose-200/80 rounded-xl" />
                  <div className="h-8 w-28 bg-amber-50 border border-amber-200/80 rounded-xl" />
                </div>
              </div>

              {/* Field 5: Prep Time */}
              <div className="space-y-1.5">
                <div className="h-3 w-28 bg-slate-200 rounded" />
                <div className="h-10 w-32 bg-slate-50 border border-slate-200 rounded-xl" />
              </div>
            </div>

            {/* Card Sticky Footer */}
            <div className="px-3.5 sm:px-4 py-2.5 border-t border-slate-100 shrink-0 flex items-center justify-between bg-slate-50/50">
              <div className="h-8 w-20 bg-slate-200/80 rounded-xl" />
              <div className="h-3 w-16 bg-slate-200 rounded" />
              <div className="h-8 w-24 bg-slate-900/30 rounded-xl" />
            </div>
          </div>

          {/* ═════════════════════════════════════════════════════════ */}
          {/* COLUMN 3: LIVE PREVIEW SKELETON (4 cols)                  */}
          {/* ═════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-4 h-full flex flex-col bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            {/* Live Preview Header */}
            <div className="px-3.5 sm:px-4 py-2.5 border-b border-slate-100 shrink-0 flex items-center justify-between">
              <div className="h-4 w-24 bg-slate-200 rounded-md" />
              <div className="flex bg-slate-100 p-0.5 rounded-lg gap-1">
                <div className="h-6 w-16 bg-white rounded-md shadow-2xs" />
                <div className="h-6 w-14 bg-slate-200 rounded-md" />
              </div>
            </div>

            {/* Live Preview Card Content */}
            <div className="flex-1 min-h-0 p-3 sm:p-4 overflow-y-auto">
              <div className="border border-slate-200 rounded-2xl p-3 bg-white shadow-2xs space-y-3">
                {/* Food Image Placeholder */}
                <div className="w-full h-36 sm:h-44 bg-slate-100 rounded-xl flex items-center justify-center relative overflow-hidden">
                  <div className="w-10 h-10 rounded-full bg-slate-200/80" />
                  <div className="absolute bottom-2.5 left-2.5 flex gap-1.5">
                    <div className="w-4 h-4 rounded bg-emerald-200" />
                  </div>
                </div>

                {/* Dish Info Preview */}
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="h-4.5 w-3/4 bg-slate-200 rounded" />
                    <div className="w-3.5 h-3.5 rounded border border-emerald-500 shrink-0" />
                  </div>

                  <div className="h-4 w-24 bg-slate-200 rounded font-mono" />

                  <div className="flex gap-1.5 pt-0.5">
                    <div className="h-4 w-16 bg-slate-100 rounded text-[9px]" />
                    <div className="h-4 w-10 bg-emerald-50 rounded text-[9px]" />
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <div className="h-2.5 w-full bg-slate-100 rounded" />
                    <div className="h-2.5 w-4/5 bg-slate-100 rounded" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuItemEditorSkeleton;

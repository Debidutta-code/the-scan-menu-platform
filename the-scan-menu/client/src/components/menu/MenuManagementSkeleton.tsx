import React from 'react';
import { Plus, GripVertical, FolderOpen } from 'lucide-react';

interface MenuManagementSkeletonProps {
  activeTab?: 'MENU' | 'CUSTOMIZATIONS';
}

export const MenuManagementSkeleton: React.FC<MenuManagementSkeletonProps> = ({ activeTab = 'MENU' }) => {
  return (
    <div className="w-full h-full min-h-0 flex flex-col font-sans select-none overflow-hidden pb-1 animate-pulse">
      {/* ── Page Header Skeleton ── */}
      <div className="shrink-0 mb-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 md:px-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="space-y-1">
            <div className="h-5 w-48 sm:w-56 bg-slate-200 rounded-md" />
            <div className="h-3 w-64 sm:w-80 bg-slate-100 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex p-1 bg-slate-100 rounded-xl border border-slate-200/80 gap-1">
              <div className="h-9 w-28 bg-slate-900/20 rounded-lg shadow-sm" />
              <div className="h-9 w-36 bg-slate-200/60 rounded-lg" />
            </div>
          </div>
        </div>
      </div>

      {activeTab === 'MENU' ? (
        /* ══════════════════════════════════════════ */
        /* TAB 1: MENU DISHES 3-COLUMN SKELETON       */
        /* ══════════════════════════════════════════ */
        <div className="flex-1 min-h-0 flex gap-3 items-stretch w-full overflow-hidden">
          {/* ── Column 1: Category Sidebar Skeleton ── */}
          <div className="w-56 xl:w-64 shrink-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-full overflow-hidden">
            <div className="px-3.5 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="h-4 w-20 bg-slate-200 rounded" />
              <div className="h-4 w-6 bg-slate-100 rounded-md" />
            </div>

            {/* Categories List */}
            <div className="space-y-1 overflow-hidden flex-1 p-2">
              {[1, 2, 3, 4, 5].map((n, idx) => {
                const isActive = idx === 0;
                return (
                  <div
                    key={n}
                    className={`flex items-center gap-2 px-2.5 py-2 rounded-xl mb-0.5 ${
                      isActive ? 'bg-slate-900/10' : 'bg-slate-50/50'
                    }`}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-slate-200 shrink-0" />
                    <div className="w-6 h-6 rounded-lg bg-slate-200 shrink-0 flex items-center justify-center">
                      <FolderOpen className="w-3 h-3 text-slate-300" />
                    </div>
                    <div className="h-3 flex-1 bg-slate-200 rounded" />
                    <div className="h-3.5 w-5 bg-slate-200/80 rounded-md shrink-0" />
                  </div>
                );
              })}
            </div>

            {/* Sidebar Sticky Bottom Footer */}
            <div className="p-3 border-t border-slate-100 shrink-0 space-y-2 bg-white sticky bottom-0 z-10">
              <div className="grid grid-cols-2 gap-1.5 text-center">
                <div className="bg-slate-50 rounded-xl p-2 space-y-1">
                  <div className="h-2.5 w-12 mx-auto bg-slate-200 rounded" />
                  <div className="h-5 w-6 mx-auto bg-slate-300 rounded" />
                </div>
                <div className="bg-amber-50/60 rounded-xl p-2 space-y-1">
                  <div className="h-2.5 w-12 mx-auto bg-amber-200/60 rounded" />
                  <div className="h-5 w-6 mx-auto bg-amber-300/60 rounded" />
                </div>
              </div>
              <div className="w-full h-9 bg-slate-900/20 rounded-xl flex items-center justify-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-slate-400" />
                <div className="h-3 w-24 bg-slate-400/40 rounded" />
              </div>
            </div>
          </div>

          {/* ── Column 2: Items Table Panel Skeleton ── */}
          <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-full overflow-hidden">
            {/* Panel Header */}
            <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 border-b border-slate-100 flex items-center justify-between gap-2 shrink-0">
              <div className="space-y-1 min-w-0">
                <div className="h-4 w-32 bg-slate-200 rounded" />
                <div className="h-2.5 w-16 bg-slate-100 rounded" />
              </div>

              {/* Status Filter Tabs & Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden md:flex bg-slate-100 p-0.5 rounded-xl gap-1">
                  <div className="h-7 w-12 bg-white rounded-lg shadow-2xs" />
                  <div className="h-7 w-16 bg-slate-200 rounded-lg" />
                  <div className="h-7 w-14 bg-slate-200 rounded-lg" />
                </div>
                <div className="h-8 w-28 sm:w-36 bg-slate-50 border border-slate-200 rounded-xl hidden sm:block" />
                <div className="h-8 w-18 bg-slate-100 border border-slate-200 rounded-xl hidden sm:block" />
                <div className="h-8 w-24 bg-amber-500/40 rounded-xl flex items-center justify-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-amber-900/40" />
                  <div className="h-3 w-12 bg-amber-900/20 rounded" />
                </div>
              </div>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-[16px_1fr_80px_52px_110px_32px] items-center px-4 py-2 bg-slate-50/80 border-b border-slate-100 gap-3 shrink-0">
              <div />
              <div className="h-2.5 w-10 bg-slate-200 rounded" />
              <div className="h-2.5 w-8 bg-slate-200 rounded ml-auto" />
              <div className="h-2.5 w-8 bg-slate-200 rounded ml-auto" />
              <div className="h-2.5 w-12 bg-slate-200 rounded mx-auto" />
              <div />
            </div>

            {/* Rows List Skeleton */}
            <div className="flex-1 min-h-0 overflow-hidden divide-y divide-slate-100 p-1">
              {[1, 2, 3, 4, 5, 6, 7].map((row, idx) => (
                <div
                  key={row}
                  className={`grid grid-cols-[16px_1fr_80px_52px_110px_32px] items-center px-3.5 py-2.5 gap-3 ${
                    idx === 0 ? 'bg-amber-50/40 border-l-3 border-amber-400' : ''
                  }`}
                >
                  <GripVertical className="w-3.5 h-3.5 text-slate-200" />
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 shrink-0" />
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="h-3.5 w-32 sm:w-44 bg-slate-200 rounded" />
                      <div className="h-2.5 w-48 sm:w-64 bg-slate-100 rounded hidden sm:block" />
                    </div>
                  </div>
                  <div className="h-3.5 w-14 bg-slate-200 rounded ml-auto" />
                  <div className="h-4 w-9 bg-slate-100 rounded-full ml-auto" />
                  <div className="h-5 w-20 bg-emerald-50 border border-emerald-100 rounded-full mx-auto" />
                  <div className="w-5 h-5 bg-slate-100 rounded-md ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ══════════════════════════════════════════ */
        /* TAB 2: ADD-ON TEMPLATES SKELETON           */
        /* ══════════════════════════════════════════ */
        <div className="flex-1 min-h-0 overflow-hidden bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-100">
            <div className="space-y-1">
              <div className="h-5 w-60 bg-slate-200 rounded-md" />
              <div className="h-3 w-72 bg-slate-100 rounded" />
            </div>
            <div className="h-10 w-36 bg-amber-500/40 rounded-xl" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="p-4 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs">
                <div className="flex items-start justify-between">
                  <div className="space-y-1.5">
                    <div className="h-4 w-16 bg-amber-100 rounded-full" />
                    <div className="h-4 w-32 bg-slate-200 rounded" />
                    <div className="h-3 w-40 bg-slate-100 rounded" />
                  </div>
                  <div className="w-5 h-5 bg-slate-100 rounded" />
                </div>
                <div className="divide-y divide-slate-100 border-t border-slate-100 pt-2 space-y-2">
                  <div className="flex justify-between py-1">
                    <div className="h-3 w-20 bg-slate-200 rounded" />
                    <div className="h-3 w-12 bg-slate-200 rounded" />
                  </div>
                  <div className="flex justify-between py-1">
                    <div className="h-3 w-24 bg-slate-200 rounded" />
                    <div className="h-3 w-12 bg-slate-200 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagementSkeleton;

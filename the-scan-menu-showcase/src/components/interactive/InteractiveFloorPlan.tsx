import React, { useState } from 'react';
import { 
  LayoutGrid, 
  QrCode, 
  Sparkles, 
  Check, 
  Download, 
  Eye, 
  Layers, 
  MapPin,
  Clock,
  CheckCircle2,
  Users
} from 'lucide-react';
import { soundManager } from '../../utils/sound';

interface TableNode {
  id: string;
  tableNumber: string;
  zone: 'terrace' | 'rooftop' | 'bar' | 'vip';
  capacity: number;
  status: 'available' | 'seated' | 'ordering' | 'billed' | 'cleaning';
  guests: number;
  currentTotal: number;
  activeTimeMin: number;
}

const SAMPLE_FLOOR_TABLES: TableNode[] = [
  { id: 'tbl-1', tableNumber: 'Table 01', zone: 'terrace', capacity: 2, status: 'available', guests: 0, currentTotal: 0, activeTimeMin: 0 },
  { id: 'tbl-2', tableNumber: 'Table 02', zone: 'terrace', capacity: 4, status: 'seated', guests: 3, currentTotal: 0, activeTimeMin: 6 },
  { id: 'tbl-3', tableNumber: 'Table 03', zone: 'terrace', capacity: 4, status: 'ordering', guests: 4, currentTotal: 124.5, activeTimeMin: 22 },
  { id: 'tbl-4', tableNumber: 'Table 04', zone: 'terrace', capacity: 6, status: 'ordering', guests: 5, currentTotal: 198.0, activeTimeMin: 34 },
  { id: 'tbl-5', tableNumber: 'Rooftop 01', zone: 'rooftop', capacity: 2, status: 'billed', guests: 2, currentTotal: 86.0, activeTimeMin: 48 },
  { id: 'tbl-6', tableNumber: 'Rooftop 02', zone: 'rooftop', capacity: 4, status: 'cleaning', guests: 0, currentTotal: 0, activeTimeMin: 2 },
  { id: 'tbl-7', tableNumber: 'Bar Stool 01', zone: 'bar', capacity: 1, status: 'ordering', guests: 1, currentTotal: 36.0, activeTimeMin: 14 },
  { id: 'tbl-8', tableNumber: 'Bar Stool 02', zone: 'bar', capacity: 1, status: 'available', guests: 0, currentTotal: 0, activeTimeMin: 0 },
  { id: 'tbl-9', tableNumber: 'VIP Suite A', zone: 'vip', capacity: 8, status: 'ordering', guests: 7, currentTotal: 442.0, activeTimeMin: 52 },
];

export const InteractiveFloorPlan: React.FC = () => {
  const [tables, setTables] = useState<TableNode[]>(SAMPLE_FLOOR_TABLES);
  const [selectedZone, setSelectedZone] = useState<string>('all');
  const [activeTableDetail, setActiveTableDetail] = useState<TableNode>(SAMPLE_FLOOR_TABLES[3]);
  
  // Dynamic QR Customizer
  const [qrColor, setQrColor] = useState<string>('#f59e0b');
  const [qrStyle, setQrStyle] = useState<'dots' | 'rounded' | 'square'>('rounded');
  const [embedLogo, setEmbedLogo] = useState<boolean>(true);

  const zones = [
    { id: 'all', label: 'All Floor Zones' },
    { id: 'terrace', label: '🌿 Indoor Terrace' },
    { id: 'rooftop', label: '✨ Rooftop Lounge' },
    { id: 'bar', label: '🍸 Cocktail Bar' },
    { id: 'vip', label: '👑 VIP Suites' },
  ];

  const brandPalettes = [
    { name: 'Amber Gold', hex: '#f59e0b' },
    { name: 'Obsidian Noir', hex: '#ffffff' },
    { name: 'Emerald Palm', hex: '#10b981' },
    { name: 'Royal Ruby', hex: '#ef4444' },
    { name: 'Champagne Sand', hex: '#fbbf24' },
  ];

  const filteredTables = selectedZone === 'all'
    ? tables
    : tables.filter((t) => t.zone === selectedZone);

  const getStatusColor = (status: TableNode['status']) => {
    switch (status) {
      case 'available': return { bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', label: 'Available' };
      case 'seated': return { bg: 'bg-blue-500/20 text-blue-400 border-blue-500/40', label: 'Seated & Browsing' };
      case 'ordering': return { bg: 'bg-amber-400/20 text-amber-400 border-amber-400/40', label: 'Active Order' };
      case 'billed': return { bg: 'bg-purple-500/20 text-purple-400 border-purple-500/40', label: 'Bill Settled' };
      case 'cleaning': return { bg: 'bg-zinc-700/40 text-zinc-400 border-zinc-600/40', label: 'Needs Cleaning' };
    }
  };

  return (
    <div className="w-full bg-[#08080c] rounded-3xl border border-white/10 p-6 md:p-8 shadow-2xl space-y-8">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono-accent bg-amber-400/10 text-amber-400 border border-amber-400/20 mb-2">
            <LayoutGrid size={14} />
            <span>OPERATIONAL FLOOR SUITE • TABLE MAP & DYNAMIC QR ENGINE</span>
          </div>
          <h3 className="text-2xl md:text-3xl font-extrabold text-white">
            Floor Plan & Dynamic QR Generator
          </h3>
          <p className="text-xs text-zinc-400 max-w-xl mt-1">
            Real-time table occupancy telemetry mapped directly to physical tabletop QR & NFC identifiers.
          </p>
        </div>

        {/* Zone Filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {zones.map((z) => (
            <button
              key={z.id}
              onClick={() => { soundManager.playTapSound(); setSelectedZone(z.id); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                selectedZone === z.id
                  ? 'bg-amber-400 text-black font-bold shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              {z.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Floor Plan Map (Left) & Dynamic QR Stand Customizer (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Floor Plan Map (8 Columns) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <MapPin size={14} />
              <span>Interactive Floor Plan Layout</span>
            </h4>
            <span className="text-[10px] text-zinc-500 font-mono">Click table to inspect</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredTables.map((tbl) => {
              const statusInfo = getStatusColor(tbl.status);
              const isSelected = activeTableDetail.id === tbl.id;

              return (
                <div
                  key={tbl.id}
                  onClick={() => {
                    soundManager.playTapSound();
                    setActiveTableDetail(tbl);
                  }}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-28 relative overflow-hidden ${
                    isSelected
                      ? 'bg-zinc-900 border-amber-400 shadow-lg shadow-amber-500/10 scale-105'
                      : 'bg-zinc-950/80 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-xs text-white">{tbl.tableNumber}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold border ${statusInfo.bg}`}>
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="flex items-end justify-between pt-2">
                    <div className="text-[10px] text-zinc-400 font-mono">
                      <span>Cap: {tbl.capacity}p</span>
                      {tbl.activeTimeMin > 0 && (
                        <span className="block text-zinc-500">⏱️ {tbl.activeTimeMin} min</span>
                      )}
                    </div>
                    {tbl.currentTotal > 0 && (
                      <span className="text-xs font-mono font-extrabold text-amber-400">
                        ${tbl.currentTotal.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table Legend */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-2 text-[10px] font-mono text-zinc-400 border-t border-white/5">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Available</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Seated</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Active Order</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400" /> Billed</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-zinc-600" /> Cleaning</span>
          </div>
        </div>

        {/* Dynamic QR Stand Customizer (5 Columns) */}
        <div className="lg:col-span-5 bg-zinc-950/90 rounded-3xl border border-white/10 p-6 space-y-5 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <QrCode size={14} />
                <span>Dynamic Stand Generator</span>
              </h4>
              <span className="text-[10px] text-zinc-400 font-mono">
                Assigned: {activeTableDetail.tableNumber}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 text-[10px] font-mono font-bold">
              SVG VECTOR
            </span>
          </div>

          {/* Live Stand Preview Canvas */}
          <div className="relative w-full max-w-[200px] mx-auto bg-gradient-to-b from-zinc-800 to-zinc-950 rounded-2xl border-2 border-white/15 p-4 shadow-2xl flex flex-col items-center text-center space-y-2">
            <div className="w-full flex items-center justify-between text-[9px] font-mono text-zinc-400 font-bold border-b border-white/10 pb-1">
              <span>{activeTableDetail.tableNumber}</span>
              <span>THE SCAN MENU</span>
            </div>

            {/* Generated QR Canvas */}
            <div className="w-32 h-32 bg-white rounded-xl p-2 flex items-center justify-center relative shadow-inner">
              <div className="w-full h-full grid grid-cols-4 gap-1 p-1 border-2 border-black">
                <div style={{ backgroundColor: qrColor }} className="rounded-xs" />
                <div className="bg-black/20 rounded-xs" />
                <div style={{ backgroundColor: qrColor }} className="rounded-xs" />
                <div className="bg-black rounded-xs" />
                <div className="bg-black/20 rounded-xs" />
                {embedLogo && (
                  <div className="col-span-2 row-span-2 bg-amber-500 rounded-sm flex items-center justify-center text-black font-extrabold text-[8px] font-mono shadow">
                    PIXORA
                  </div>
                )}
                <div className="bg-black rounded-xs" />
                <div style={{ backgroundColor: qrColor }} className="rounded-xs" />
                <div className="bg-black rounded-xs" />
                <div className="bg-black/20 rounded-xs" />
                <div style={{ backgroundColor: qrColor }} className="rounded-xs" />
              </div>
            </div>

            <div className="text-[9px] font-mono text-amber-400 font-bold">
              TAP NFC DISC OR SCAN QR
            </div>
          </div>

          {/* Controls: Color Palettes */}
          <div className="space-y-2">
            <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider block">
              Stand Brand Color:
            </span>
            <div className="flex items-center gap-2">
              {brandPalettes.map((p) => (
                <button
                  key={p.name}
                  onClick={() => { soundManager.playTapSound(); setQrColor(p.hex); }}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${
                    qrColor === p.hex ? 'scale-125 border-white' : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: p.hex }}
                  title={p.name}
                />
              ))}
            </div>
          </div>

          {/* Toggle Logo */}
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <span className="text-xs text-zinc-300 font-medium">Embed Center Brand Logo</span>
            <button
              onClick={() => { soundManager.playTapSound(); setEmbedLogo(!embedLogo); }}
              className={`w-10 h-5 rounded-full p-0.5 transition-colors ${
                embedLogo ? 'bg-amber-400' : 'bg-zinc-800'
              }`}
            >
              <div className={`w-4 h-4 rounded-full bg-black transition-transform ${
                embedLogo ? 'translate-x-5' : 'translate-x-0'
              }`} />
            </button>
          </div>

          {/* Download Action */}
          <button
            onClick={() => soundManager.playTapSound()}
            className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white border border-white/10 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Download size={14} className="text-amber-400" />
            <span>Download High-Res Vector SVG for Table Tent</span>
          </button>
        </div>

      </div>
    </div>
  );
};

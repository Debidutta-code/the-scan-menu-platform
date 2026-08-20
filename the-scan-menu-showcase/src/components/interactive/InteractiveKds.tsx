import React, { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Clock, 
  Check, 
  AlertTriangle, 
  Flame, 
  Wine, 
  Pizza, 
  Sparkles, 
  Volume2, 
  RefreshCcw,
  CheckCircle2,
  Printer
} from 'lucide-react';
import { soundManager } from '../../utils/sound';

export interface KDSTicket {
  id: string;
  table: string;
  orderNumber: string;
  server: string;
  station: 'grill' | 'pizza' | 'bar' | 'dessert' | 'all';
  elapsedSeconds: number;
  items: {
    name: string;
    count: number;
    notes?: string;
    completed?: boolean;
  }[];
  urgency: 'fresh' | 'cooking' | 'urgent';
}

const INITIAL_KDS_TICKETS: KDSTicket[] = [
  {
    id: 't-101',
    table: 'Table #04 (Terrace)',
    orderNumber: '#TK-482',
    server: 'Direct Guest Tap',
    station: 'grill',
    elapsedSeconds: 210, // 3.5 min - fresh
    urgency: 'fresh',
    items: [
      { name: 'Prime Wagyu A5 Steak (Med-Rare)', count: 2, notes: 'Hand-cut triple cooked frites' },
      { name: 'Truffle Wild Mushroom Bruschetta', count: 1, notes: 'Extra shaved black truffle' },
    ],
  },
  {
    id: 't-102',
    table: 'Table #08 (Main Hall)',
    orderNumber: '#TK-479',
    server: 'Direct Guest Tap',
    station: 'pizza',
    elapsedSeconds: 580, // 9.6 min - cooking
    urgency: 'cooking',
    items: [
      { name: 'Burrata & San Marzano Wood Pizza', count: 2, notes: 'Crispy Roman Thin Crust, Extra Honey' },
      { name: 'Crispy Calamari Fritti', count: 1, notes: 'Double Yuzu Aioli dip' },
    ],
  },
  {
    id: 't-103',
    table: 'Bar Table #02',
    orderNumber: '#TK-471',
    server: 'Direct NFC Tap',
    station: 'bar',
    elapsedSeconds: 980, // 16.3 min - urgent!
    urgency: 'urgent',
    items: [
      { name: 'Smoked Amber Old Fashioned', count: 3, notes: 'Torched cinnamon dome, Large sphere' },
      { name: 'Valrhona Chocolate Lava Tart', count: 1, notes: 'Extra Madagascar Vanilla Gelato' },
    ],
  },
];

interface InteractiveKdsProps {
  incomingOrder?: {
    table: string;
    items: { name: string; count: number; notes?: string }[];
    orderNumber: string;
  } | null;
}

export const InteractiveKds: React.FC<InteractiveKdsProps> = ({ incomingOrder }) => {
  const [tickets, setTickets] = useState<KDSTicket[]>(INITIAL_KDS_TICKETS);
  const [activeStation, setActiveStation] = useState<string>('all');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Tick timers every second
  useEffect(() => {
    const timer = setInterval(() => {
      setTickets((prev) =>
        prev.map((ticket) => {
          const nextSec = ticket.elapsedSeconds + 1;
          let nextUrgency: 'fresh' | 'cooking' | 'urgent' = 'fresh';
          if (nextSec >= 900) nextUrgency = 'urgent';
          else if (nextSec >= 420) nextUrgency = 'cooking';

          return {
            ...ticket,
            elapsedSeconds: nextSec,
            urgency: nextUrgency,
          };
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Listen for incoming order from live table simulator
  useEffect(() => {
    if (incomingOrder) {
      soundManager.playTapSound();
      const newTicket: KDSTicket = {
        id: `t-${Date.now()}`,
        table: incomingOrder.table,
        orderNumber: incomingOrder.orderNumber,
        server: 'Live Mobile Web Order',
        station: 'grill',
        elapsedSeconds: 1,
        urgency: 'fresh',
        items: incomingOrder.items.map((i) => ({
          name: i.name,
          count: i.count,
          notes: i.notes,
          completed: false,
        })),
      };

      setTickets((prev) => [newTicket, ...prev]);
    }
  }, [incomingOrder]);

  const toggleItemCompleted = (ticketId: string, itemIdx: number) => {
    soundManager.playTapSound();
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const updatedItems = [...t.items];
          updatedItems[itemIdx] = {
            ...updatedItems[itemIdx],
            completed: !updatedItems[itemIdx].completed,
          };
          return { ...t, items: updatedItems };
        }
        return t;
      })
    );
  };

  const bumpTicket = (ticketId: string) => {
    soundManager.playTapSound();
    setTickets((prev) => prev.filter((t) => t.id !== ticketId));
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const stations = [
    { id: 'all', label: 'All Stations' },
    { id: 'grill', label: '🥩 Grill & Steaks' },
    { id: 'pizza', label: '🍕 Pizza Oven' },
    { id: 'bar', label: '🍸 Bar & Cocktails' },
  ];

  const filteredTickets = activeStation === 'all'
    ? tickets
    : tickets.filter((t) => t.station === activeStation);

  return (
    <div className="w-full bg-[#07070a] rounded-3xl border border-white/10 p-6 shadow-2xl space-y-6">
      {/* KDS Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold">
            <ChefHat size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-base text-white tracking-tight">
                Kitchen Display System (KDS)
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">
                LIVE DISPATCH
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Zero paper tickets • Telemetry timer color coding • 1-click order bumping
            </p>
          </div>
        </div>

        {/* Station Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {stations.map((st) => (
            <button
              key={st.id}
              onClick={() => { soundManager.playTapSound(); setActiveStation(st.id); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                activeStation === st.id
                  ? 'bg-amber-400 text-black shadow-md shadow-amber-500/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-white/5'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Grid */}
      {filteredTickets.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-zinc-950/60 rounded-2xl border border-white/5">
          <CheckCircle2 size={40} className="mx-auto text-emerald-400" />
          <h4 className="text-sm font-bold text-white">All Kitchen Stations Clear!</h4>
          <p className="text-xs text-zinc-400">
            Use the Live Table Phone simulator to send a fresh table order.
          </p>
          <button
            onClick={() => setTickets(INITIAL_KDS_TICKETS)}
            className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-200 text-xs font-semibold hover:text-white"
          >
            Reset Demo Ticket Stream
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredTickets.map((ticket) => {
            const isUrgent = ticket.urgency === 'urgent';
            const isCooking = ticket.urgency === 'cooking';
            const isFresh = ticket.urgency === 'fresh';

            return (
              <div
                key={ticket.id}
                className={`rounded-2xl border flex flex-col justify-between overflow-hidden transition-all bg-zinc-950/90 shadow-xl ${
                  isUrgent
                    ? 'border-red-500/80 shadow-red-500/20 animate-pulse'
                    : isCooking
                    ? 'border-amber-400/60 shadow-amber-500/10'
                    : 'border-emerald-500/40 shadow-emerald-500/10'
                }`}
              >
                {/* Ticket Top Header */}
                <div className={`px-4 py-2.5 flex items-center justify-between border-b ${
                  isUrgent
                    ? 'bg-red-500/20 text-red-300 border-red-500/40'
                    : isCooking
                    ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                }`}>
                  <div>
                    <span className="font-mono font-extrabold text-sm block text-white">
                      {ticket.orderNumber}
                    </span>
                    <span className="text-[10px] opacity-80">{ticket.table}</span>
                  </div>

                  <div className="flex items-center gap-1 font-mono font-extrabold text-xs">
                    <Clock size={13} />
                    <span>{formatTimer(ticket.elapsedSeconds)}</span>
                  </div>
                </div>

                {/* Ticket Items List */}
                <div className="p-4 space-y-2.5 flex-1">
                  {ticket.items.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => toggleItemCompleted(ticket.id, idx)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                        item.completed
                          ? 'bg-zinc-900/40 border-white/5 opacity-40 line-through'
                          : 'bg-zinc-900 border-white/10 hover:border-amber-400/40'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border text-[10px] shrink-0 ${
                        item.completed
                          ? 'bg-emerald-400 text-black border-emerald-400'
                          : 'border-zinc-600 bg-zinc-950'
                      }`}>
                        {item.completed && <Check size={12} />}
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <div className="flex justify-between items-center text-xs font-bold text-white">
                          <span>{item.name}</span>
                          <span className="font-mono text-amber-400">x{item.count}</span>
                        </div>
                        {item.notes && (
                          <p className="text-[10px] text-zinc-400 font-mono">
                            ⚡ Note: {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Ticket Bottom Actions */}
                <div className="p-3 bg-zinc-900/80 border-t border-white/5 flex items-center justify-between gap-2">
                  <span className="text-[9px] font-mono text-zinc-500">
                    {ticket.server}
                  </span>
                  <button
                    onClick={() => bumpTicket(ticket.id)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs shadow-md flex items-center gap-1.5 transition-transform active:scale-95"
                  >
                    <Check size={14} />
                    <span>Bump Ticket</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

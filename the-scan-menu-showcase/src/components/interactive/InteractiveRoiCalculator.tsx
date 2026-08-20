import React, { useState } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  Sparkles, 
  DollarSign, 
  Clock, 
  Users, 
  ArrowRight 
} from 'lucide-react';
import { soundManager } from '../../utils/sound';

export const InteractiveRoiCalculator: React.FC = () => {
  const [tableCount, setTableCount] = useState<number>(30);
  const [turnsPerDay, setTurnsPerDay] = useState<number>(4);
  const [avgTicket, setAvgTicket] = useState<number>(45);

  // Calculations
  const dailyOrders = tableCount * turnsPerDay;
  const monthlyOrders = dailyOrders * 30;
  const currentMonthlyRevenue = monthlyOrders * avgTicket;
  
  // 19.5% average upsell growth through rich photos, modifiers & digital tipping
  const monthlyRevenueGain = Math.round(currentMonthlyRevenue * 0.195);
  const annualRevenueGain = monthlyRevenueGain * 12;
  
  // Waitstaff trips saved: 2 trips per table session (delivering menu + delivering check)
  const tripsSavedMonthly = monthlyOrders * 2;
  
  // Average dining time reduced from 52m to 37m = 15m saved per turn
  const hoursSavedMonthly = Math.round((monthlyOrders * 15) / 60);

  // Annual menu reprint savings
  const reprintSavings = Math.round(tableCount * 45 * 2); // 2 seasonal reprints/year

  return (
    <div className="w-full bg-[#08080c] rounded-3xl border border-white/10 p-6 md:p-10 shadow-2xl space-y-8">
      
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono-accent bg-amber-400/10 text-amber-400 border border-amber-400/20">
          <Calculator size={14} />
          <span>REVENUE & TABLE VELOCITY SIMULATOR</span>
        </div>
        <h3 className="text-3xl md:text-4xl font-extrabold text-white">
          Calculate Your Venue ROI
        </h3>
        <p className="text-xs md:text-sm text-zinc-400">
          Adjust the sliders below to estimate added monthly turnover and staff efficiency gains.
        </p>
      </div>

      {/* Sliders & Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left: 3 Interactive Sliders (6 Cols) */}
        <div className="lg:col-span-6 space-y-6 bg-zinc-950/80 p-6 rounded-3xl border border-white/5">
          
          {/* Slider 1: Table Count */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Users size={14} className="text-amber-400" />
                <span>Total Dining Tables:</span>
              </span>
              <span className="font-mono font-extrabold text-amber-400 text-sm">
                {tableCount} Tables
              </span>
            </div>
            <input
              type="range"
              min="5"
              max="150"
              step="5"
              value={tableCount}
              onChange={(e) => {
                setTableCount(parseInt(e.target.value));
              }}
              className="w-full accent-amber-400 h-2 bg-zinc-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>5 tables</span>
              <span>150 tables</span>
            </div>
          </div>

          {/* Slider 2: Table Turns per day */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Clock size={14} className="text-amber-400" />
                <span>Table Turns Per Day:</span>
              </span>
              <span className="font-mono font-extrabold text-amber-400 text-sm">
                {turnsPerDay} Turns / Day
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="8"
              step="1"
              value={turnsPerDay}
              onChange={(e) => {
                setTurnsPerDay(parseInt(e.target.value));
              }}
              className="w-full accent-amber-400 h-2 bg-zinc-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>1 turn (Boutique)</span>
              <span>8 turns (High Volume)</span>
            </div>
          </div>

          {/* Slider 3: Average Ticket */}
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <DollarSign size={14} className="text-amber-400" />
                <span>Average Check Size:</span>
              </span>
              <span className="font-mono font-extrabold text-amber-400 text-sm">
                ${avgTicket} / Table
              </span>
            </div>
            <input
              type="range"
              min="15"
              max="150"
              step="5"
              value={avgTicket}
              onChange={(e) => {
                setAvgTicket(parseInt(e.target.value));
              }}
              className="w-full accent-amber-400 h-2 bg-zinc-800 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>$15 (Cafe)</span>
              <span>$150 (Fine Dining)</span>
            </div>
          </div>

        </div>

        {/* Right: Live Impact Cards (6 Cols) */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Main Revenue Card */}
          <div className="sm:col-span-2 p-6 rounded-3xl bg-gradient-to-br from-amber-500/20 via-zinc-900 to-zinc-950 border-2 border-amber-400/50 space-y-2 relative overflow-hidden shadow-2xl">
            <span className="text-[10px] font-mono uppercase font-bold text-amber-400">
              ESTIMATED MONTHLY REVENUE GROWTH (+19.5%)
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-white tracking-tight">
              +${monthlyRevenueGain.toLocaleString()} <span className="text-sm font-normal text-zinc-400">/ mo</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Based on visual upselling photo prompts, modifier add-ons, and faster table turnover. (≈ +${annualRevenueGain.toLocaleString()}/year)
            </p>
          </div>

          {/* Card 2: Staff Trips Saved */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-white/10 space-y-1.5">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Waitstaff Trips Saved</span>
            <div className="text-2xl font-bold font-mono text-white">
              {tripsSavedMonthly.toLocaleString()} <span className="text-xs font-normal text-zinc-500">trips/mo</span>
            </div>
            <p className="text-[10px] text-zinc-400">
              Staff focus on warm hospitality instead of running paper booklets.
            </p>
          </div>

          {/* Card 3: Dining Cycle Velocity */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-white/10 space-y-1.5">
            <span className="text-[10px] font-mono text-zinc-400 uppercase">Turnover Acceleration</span>
            <div className="text-2xl font-bold font-mono text-emerald-400">
              -15 min <span className="text-xs font-normal text-zinc-500">/ table</span>
            </div>
            <p className="text-[10px] text-zinc-400">
              52 min paper dining reduced to 37 min instant contactless flow.
            </p>
          </div>

          {/* Card 4: Reprint Elimination */}
          <div className="sm:col-span-2 p-4 rounded-2xl bg-zinc-900/60 border border-white/5 flex items-center justify-between text-xs">
            <div>
              <span className="font-bold text-white block">Paper Printing Elimination:</span>
              <span className="text-[10px] text-zinc-400">Save approx. ${reprintSavings.toLocaleString()} in annual laminate reprints</span>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-mono font-bold text-xs">
              $0 Reprint Cost
            </span>
          </div>

        </div>

      </div>
    </div>
  );
};

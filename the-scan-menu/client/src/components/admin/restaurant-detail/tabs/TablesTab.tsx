import React from 'react';
import { Layers, Sparkles, Plus, QrCode, RotateCw, Trash2 } from 'lucide-react';
import { Table, TableZone, Restaurant } from '../../../../services/restaurant.service';

interface TablesTabProps {
  restaurant: Restaurant;
  tablesList: Table[];
  zonesList: TableZone[];
  onOpenAddTableModal: () => void;
  onOpenBulkTableModal: () => void;
  onOpenAddZoneModal: () => void;
  onDeleteZone: (zoneId: string) => void;
  onDeleteTable: (tableId: string) => void;
  onRegenerateTableQr: (tableId: string) => void;
}

export const TablesTab: React.FC<TablesTabProps> = ({
  restaurant,
  tablesList,
  zonesList,
  onOpenAddTableModal,
  onOpenBulkTableModal,
  onOpenAddZoneModal,
  onDeleteZone,
  onDeleteTable,
  onRegenerateTableQr,
}) => {
  return (
    <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-sm space-y-6 h-full overflow-y-auto pr-2">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-display text-xl font-bold text-slate-900">
            Dining Tables & Floor Zones ({tablesList.length} Tables)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage physical dining tables, floor zones (AC, Rooftop, Bar), and secure QR scan tokens.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={onOpenAddZoneModal}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>+ Add Zone</span>
          </button>

          <button
            onClick={onOpenBulkTableModal}
            className="px-3.5 py-2 bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-200 rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Bulk Generator</span>
          </button>

          <button
            onClick={onOpenAddTableModal}
            className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Single Table</span>
          </button>
        </div>
      </div>

      {/* Zones Filter Strip */}
      {zonesList.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-[10px] font-mono uppercase font-bold text-slate-400">Zones:</span>
          {zonesList.map((z: any) => (
            <div
              key={z._id}
              className="px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center gap-1.5"
            >
              <span>{z.name}</span>
              <button
                onClick={() => onDeleteZone(z._id)}
                className="text-slate-400 hover:text-rose-600"
                title="Delete Zone"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {tablesList.map((table: Table) => (
          <div
            key={table._id}
            className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-between hover:border-slate-300 transition"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-slate-900">
                  {table.displayName || `Table ${table.tableNumber}`}
                </span>
                <span
                  className={`w-2.5 h-2.5 rounded-full ${table.isActive ? 'bg-emerald-500' : 'bg-slate-300'}`}
                  title={table.isActive ? 'Active' : 'Inactive'}
                />
              </div>

              <p className="text-[10px] text-slate-400 font-mono mt-0.5">#{table.tableNumber}</p>
            </div>

            <div className="mt-4 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <a
                href={`/r/${restaurant.slug}/t/${table.token}`}
                target="_blank"
                rel="noreferrer"
                className="text-amber-600 hover:text-amber-700 font-bold flex items-center gap-1 text-[11px]"
              >
                <QrCode className="w-3 h-3" />
                <span>Scan</span>
              </a>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => onRegenerateTableQr(table._id)}
                  className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                  title="Regenerate QR Token"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDeleteTable(table._id)}
                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded"
                  title="Delete Table"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {tablesList.length === 0 && (
          <div className="col-span-full py-10 text-center text-slate-400 text-xs bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            No tables created yet. Click "Bulk Generator" to add 10 tables in one second.
          </div>
        )}
      </div>
    </div>
  );
};

import React from 'react';
import { TableZone } from '../../../../services/restaurant.service';

interface SingleTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  singleTableData: { tableNumber: string; displayName: string; zoneId: string };
  setSingleTableData: React.Dispatch<React.SetStateAction<{ tableNumber: string; displayName: string; zoneId: string }>>;
  onSubmit: () => void;
  isSubmitting: boolean;
  zonesList: TableZone[];
}

export const SingleTableModal: React.FC<SingleTableModalProps> = ({
  isOpen,
  onClose,
  singleTableData,
  setSingleTableData,
  onSubmit,
  isSubmitting,
  zonesList,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
        <h3 className="font-display text-lg font-bold text-slate-900">Add Dining Table</h3>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-slate-700">Table Number *</label>
            <input
              type="text"
              placeholder="e.g. 1, 10, A1"
              value={singleTableData.tableNumber}
              onChange={(e) => setSingleTableData({ ...singleTableData, tableNumber: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700">Display Name</label>
            <input
              type="text"
              placeholder="e.g. Table 1, Balcony Corner"
              value={singleTableData.displayName}
              onChange={(e) => setSingleTableData({ ...singleTableData, displayName: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700">Floor Zone (Optional)</label>
            <select
              value={singleTableData.zoneId}
              onChange={(e) => setSingleTableData({ ...singleTableData, zoneId: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="">No Zone</option>
              {zonesList.map((z: any) => (
                <option key={z._id} value={z._id}>{z.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!singleTableData.tableNumber || isSubmitting}
            className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold disabled:opacity-50"
          >
            Create Table
          </button>
        </div>
      </div>
    </div>
  );
};

interface BulkTableModalProps {
  isOpen: boolean;
  onClose: () => void;
  bulkTableData: { count: number; prefix: string; zoneId: string };
  setBulkTableData: React.Dispatch<React.SetStateAction<{ count: number; prefix: string; zoneId: string }>>;
  onSubmit: () => void;
  isSubmitting: boolean;
  zonesList: TableZone[];
}

export const BulkTableModal: React.FC<BulkTableModalProps> = ({
  isOpen,
  onClose,
  bulkTableData,
  setBulkTableData,
  onSubmit,
  isSubmitting,
  zonesList,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
        <h3 className="font-display text-lg font-bold text-slate-900">Bulk Generate Tables</h3>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-slate-700">How many tables to generate? (1-50)</label>
            <input
              type="number"
              min="1"
              max="50"
              value={bulkTableData.count}
              onChange={(e) => setBulkTableData({ ...bulkTableData, count: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700">Table Prefix</label>
            <input
              type="text"
              placeholder="e.g. T (creates T1, T2, ... T10)"
              value={bulkTableData.prefix}
              onChange={(e) => setBulkTableData({ ...bulkTableData, prefix: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700">Floor Zone (Optional)</label>
            <select
              value={bulkTableData.zoneId}
              onChange={(e) => setBulkTableData({ ...bulkTableData, zoneId: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
            >
              <option value="">No Zone</option>
              {zonesList.map((z: any) => (
                <option key={z._id} value={z._id}>{z.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="px-4 py-2 bg-amber-500 text-slate-950 font-extrabold rounded-xl text-xs"
          >
            Generate {bulkTableData.count} Tables
          </button>
        </div>
      </div>
    </div>
  );
};

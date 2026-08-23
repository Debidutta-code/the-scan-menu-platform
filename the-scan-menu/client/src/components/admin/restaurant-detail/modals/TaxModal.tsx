import React from 'react';
import { Tax } from '../../../../services/restaurant.service';

interface AddTaxModalProps {
  isOpen: boolean;
  onClose: () => void;
  taxData: {
    type: 'TAX' | 'GROUP';
    name: string;
    percentage: number;
    groupId: string;
  };
  setTaxData: React.Dispatch<
    React.SetStateAction<{
      type: 'TAX' | 'GROUP';
      name: string;
      percentage: number;
      groupId: string;
    }>
  >;
  onSubmit: () => void;
  isSubmitting: boolean;
  taxGroups: Tax[];
}

export const AddTaxModal: React.FC<AddTaxModalProps> = ({
  isOpen,
  onClose,
  taxData,
  setTaxData,
  onSubmit,
  isSubmitting,
  taxGroups,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
        <h3 className="font-display text-lg font-bold text-slate-900">Add Tax Configuration</h3>

        <div className="space-y-3">
          <div>
            <label className="text-[11px] font-bold text-slate-700">Tax Type</label>
            <select
              value={taxData.type}
              onChange={(e) => setTaxData({ ...taxData, type: e.target.value as any })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            >
              <option value="TAX">Standalone Tax (e.g. VAT, Service Charge)</option>
              <option value="GROUP">Tax Group (e.g. GST Group)</option>
            </select>
          </div>

          {taxData.type === 'TAX' && taxGroups.length > 0 && (
            <div>
              <label className="text-[11px] font-bold text-slate-700">Parent Tax Group (Optional)</label>
              <select
                value={taxData.groupId}
                onChange={(e) => setTaxData({ ...taxData, groupId: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
              >
                <option value="">None (Standalone)</option>
                {taxGroups.map((g) => (
                  <option key={g._id} value={g._id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-[11px] font-bold text-slate-700">Tax Name *</label>
            <input
              type="text"
              placeholder="e.g. CGST, SGST, VAT"
              value={taxData.name}
              onChange={(e) => setTaxData({ ...taxData, name: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-700">Percentage (%) *</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={taxData.percentage}
              onChange={(e) => setTaxData({ ...taxData, percentage: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
            />
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
            disabled={!taxData.name || isSubmitting}
            className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold disabled:opacity-50"
          >
            Create Tax
          </button>
        </div>
      </div>
    </div>
  );
};

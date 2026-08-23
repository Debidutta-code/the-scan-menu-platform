import React from 'react';

interface ZoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoneData: { name: string };
  setZoneData: React.Dispatch<React.SetStateAction<{ name: string }>>;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export const ZoneModal: React.FC<ZoneModalProps> = ({
  isOpen,
  onClose,
  zoneData,
  setZoneData,
  onSubmit,
  isSubmitting,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
        <h3 className="font-display text-lg font-bold text-slate-900">Add Floor Zone</h3>

        <div>
          <label className="text-[11px] font-bold text-slate-700">Zone Name *</label>
          <input
            type="text"
            placeholder="e.g. Ground Floor, AC Dining, Rooftop, Bar"
            value={zoneData.name}
            onChange={(e) => setZoneData({ name: e.target.value })}
            className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
          />
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
            disabled={!zoneData.name || isSubmitting}
            className="px-4 py-2 bg-slate-950 text-white rounded-xl text-xs font-bold disabled:opacity-50"
          >
            Save Zone
          </button>
        </div>
      </div>
    </div>
  );
};

with open('client/src/pages/ManagerTables.tsx', 'r') as f:
    content = f.read()

zone_modal = """
      {/* Create / Edit Zone Modal */}
      {isZoneFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-display text-2xl font-bold">
                {editingZone ? 'Edit Zone' : 'New Zone'}
              </h2>
              <button
                onClick={() => setIsZoneFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" strokeWidth={1.75} />
              </button>
            </div>

            <form onSubmit={zoneForm.handleSubmit(onZoneSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Zone Name
                </label>
                <input
                  type="text"
                  placeholder="e.g., Outdoor Patio"
                  {...zoneForm.register('name')}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
                {zoneForm.formState.errors.name && (
                  <p className="text-xs text-red-500 mt-1">
                    {zoneForm.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsZoneFormOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createZoneMutation.isPending || editZoneMutation.isPending}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-70 flex items-center justify-center"
                >
                  {createZoneMutation.isPending || editZoneMutation.isPending ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    'Save Zone'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
export default ManagerTables;
"""

content = content.replace("    </div>\n  );\n};\nexport default ManagerTables;", zone_modal)
with open('client/src/pages/ManagerTables.tsx', 'w') as f:
    f.write(content)

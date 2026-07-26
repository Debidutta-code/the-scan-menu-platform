import re

with open('client/src/pages/ManagerTables.tsx', 'r') as f:
    content = f.read()

# Replace rendering to include zones and zone selection
search_block = """      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-display tracking-tight text-4xl font-bold text-slate-900">
            Restaurant Tables
          </h1>
          <p className="text-slate-500 text-sm">Create tables and manage secure physical QR placements</p>
        </div>
        <button
          onClick={() => {
            setEditingTable(null);
            tableForm.reset({ tableNumber: '', displayName: '' });
            setIsCreateOpen(true);
          }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
        >
          <Plus className="w-4 h-4" strokeWidth={1.75} />
          <span>Add Table</span>
        </button>
      </div>

      {/* Grid list of Tables */}
      {tables.length === 0 ? ("""

replace_block = """      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="font-display tracking-tight text-4xl font-bold text-slate-900">
            Restaurant Tables & Zones
          </h1>
          <p className="text-slate-500 text-sm">Create table zones and manage secure physical QR placements</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setEditingZone(null);
              zoneForm.reset({ name: '' });
              setIsZoneFormOpen(true);
            }}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition"
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            <span>Add Zone</span>
          </button>
          <button
            onClick={() => {
              setEditingTable(null);
              tableForm.reset({ tableNumber: '', displayName: '', zoneId: activeZoneFilter });
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-800 transition"
          >
            <Plus className="w-4 h-4" strokeWidth={1.75} />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {/* Zones Filter */}
      {zones.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setActiveZoneFilter(null)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              activeZoneFilter === null
                ? 'bg-slate-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Tables
          </button>
          {zones.map((zone) => (
            <div key={zone._id} className="flex items-center">
              <button
                onClick={() => setActiveZoneFilter(zone._id)}
                className={`px-4 py-2 rounded-l-xl text-sm font-semibold border transition-colors ${
                  activeZoneFilter === zone._id
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 border-r-0'
                }`}
              >
                {zone.name}
              </button>
              {activeZoneFilter === zone._id && (
                 <div className="flex items-center border border-amber-500 bg-amber-50 rounded-r-xl overflow-hidden h-full">
                    <button
                      onClick={() => {
                         setEditingZone(zone);
                         zoneForm.reset({ name: zone.name });
                         setIsZoneFormOpen(true);
                      }}
                      className="p-2 text-amber-600 hover:bg-amber-100 transition-colors"
                      title="Edit Zone"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAddTableToZone(zone._id)}
                      className="p-2 text-amber-600 hover:bg-amber-100 transition-colors"
                      title="Add Table to Zone"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete the zone "${zone.name}"? ALL TABLES IN THIS ZONE WILL BE DELETED.`)) {
                          deleteZoneMutation.mutate(zone._id);
                        }
                      }}
                      className="p-2 text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete Zone"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                 </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Grid list of Tables */}
      {tables.filter(t => !activeZoneFilter || (typeof t.zoneId === 'string' ? t.zoneId === activeZoneFilter : t.zoneId?._id === activeZoneFilter)).length === 0 ? ("""

content = content.replace(search_block, replace_block)

search_table_map = """        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map((table) => ("""

replace_table_map = """        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.filter(t => !activeZoneFilter || (typeof t.zoneId === 'string' ? t.zoneId === activeZoneFilter : t.zoneId?._id === activeZoneFilter)).map((table) => ("""

content = content.replace(search_table_map, replace_table_map)


search_table_zone_display = """                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{table.displayName}</h3>
                    <p className="text-xs text-slate-400">Table Number: {table.tableNumber}</p>
                  </div>"""

replace_table_zone_display = """                  <div>
                    <h3 className="font-bold text-lg text-slate-900">{table.displayName}</h3>
                    <p className="text-xs text-slate-400">Table Number: {table.tableNumber}</p>
                    {table.zoneId && (
                      <span className="inline-block mt-1 text-[10px] uppercase tracking-wider font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        {typeof table.zoneId === 'string' ? zones.find(z => z._id === table.zoneId)?.name : table.zoneId.name}
                      </span>
                    )}
                  </div>"""

content = content.replace(search_table_zone_display, replace_table_zone_display)

search_table_form_fields = """              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="Table 12 (Main Room)"
                  {...tableForm.register('displayName')}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
                {tableForm.formState.errors.displayName && (
                  <p className="text-xs text-red-500 mt-1">
                    {tableForm.formState.errors.displayName.message}
                  </p>
                )}
              </div>"""

replace_table_form_fields = """              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  placeholder="Table 12 (Main Room)"
                  {...tableForm.register('displayName')}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500"
                />
                {tableForm.formState.errors.displayName && (
                  <p className="text-xs text-red-500 mt-1">
                    {tableForm.formState.errors.displayName.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Zone (Optional)
                </label>
                <select
                  {...tableForm.register('zoneId')}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-amber-500 bg-white"
                >
                  <option value="">No Zone</option>
                  {zones.map((z) => (
                    <option key={z._id} value={z._id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>"""

content = content.replace(search_table_form_fields, replace_table_form_fields)


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

content = content.replace("    </div>\n  );\n};\n\nexport default ManagerTables;", zone_modal)

with open('client/src/pages/ManagerTables.tsx', 'w') as f:
    f.write(content)

import re

with open('client/src/pages/ManagerOrders.tsx', 'r') as f:
    content = f.read()

search_totals = """                {/* Totals */}
                <div className="border-t border-slate-150 pt-3.5 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium font-sans">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatAmount(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium font-sans">
                    <span>Tax & Service Charge</span>
                    <span className="font-mono">{formatAmount(selectedOrder.tax)}</span>
                  </div>"""

replace_totals = """                {/* Totals */}
                <div className="border-t border-slate-150 pt-3.5 space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium font-sans">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatAmount(selectedOrder.subtotal)}</span>
                  </div>
                  {selectedOrder.taxBreakdown && selectedOrder.taxBreakdown.length > 0 ? (
                    selectedOrder.taxBreakdown.map((t: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-[11px] text-slate-500 font-medium font-sans">
                        <span>{t.name} ({t.percentage}%)</span>
                        <span className="font-mono">{formatAmount(t.amount)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium font-sans">
                      <span>Taxes</span>
                      <span className="font-mono">{formatAmount(selectedOrder.tax)}</span>
                    </div>
                  )}"""

content = content.replace(search_totals, replace_totals)
with open('client/src/pages/ManagerOrders.tsx', 'w') as f:
    f.write(content)

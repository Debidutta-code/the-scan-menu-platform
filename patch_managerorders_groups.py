import re

with open('client/src/pages/ManagerOrders.tsx', 'r') as f:
    content = f.read()

search_render = """                  {(selectedOrder as any).taxBreakdown && (selectedOrder as any).taxBreakdown.length > 0 ? (
                    (selectedOrder as any).taxBreakdown.map((t: any, i: number) => (
                      <div key={i} className="flex justify-between items-center text-[11px] text-slate-500 font-medium font-sans">
                        <span>{t.name} ({t.percentage}%)</span>
                        <span className="font-mono">{formatAmount(t.amount)}</span>
                      </div>
                    ))
                  ) : ("""

replace_render = """                  {(selectedOrder as any).taxBreakdown && (selectedOrder as any).taxBreakdown.length > 0 ? (
                    (selectedOrder as any).taxBreakdown.map((t: any, i: number) => (
                      <div key={i} className="flex flex-col gap-0.5">
                          <div className="flex justify-between items-center text-[11px] text-slate-600 font-bold font-sans">
                            <span>{t.name} ({t.percentage}%)</span>
                            <span className="font-mono">{formatAmount(t.amount)}</span>
                          </div>
                          {t.subTaxes && t.subTaxes.length > 0 && t.subTaxes.map((st: any, j: number) => (
                              <div key={j} className="flex justify-between items-center text-[10px] text-slate-400 font-medium font-sans pl-2 border-l border-slate-200 ml-1">
                                <span>{st.name} ({st.percentage}%)</span>
                                <span className="font-mono">{formatAmount(st.amount)}</span>
                              </div>
                          ))}
                      </div>
                    ))
                  ) : ("""

content = content.replace(search_render, replace_render)

with open('client/src/pages/ManagerOrders.tsx', 'w') as f:
    f.write(content)

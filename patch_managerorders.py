import re

with open('client/src/pages/ManagerOrders.tsx', 'r') as f:
    content = f.read()

search_err = """                  {selectedOrder.taxBreakdown && selectedOrder.taxBreakdown.length > 0 ? ("""
replace_err = """                  {(selectedOrder as any).taxBreakdown && (selectedOrder as any).taxBreakdown.length > 0 ? ("""
content = content.replace(search_err, replace_err)

search_err2 = """                    selectedOrder.taxBreakdown.map((t: any, i: number) => ("""
replace_err2 = """                    (selectedOrder as any).taxBreakdown.map((t: any, i: number) => ("""
content = content.replace(search_err2, replace_err2)

with open('client/src/pages/ManagerOrders.tsx', 'w') as f:
    f.write(content)

import re

with open('client/src/pages/PublicTable.tsx', 'r') as f:
    content = f.read()

search_logic = """  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let cartTaxTotal = 0;
  const cartTaxBreakdown = (activeTaxes || []).map((t: any) => {
     const amt = Math.round(cartSubtotal * (t.percentage / 100));
     cartTaxTotal += amt;
     return { name: t.name, percentage: t.percentage, amount: amt };
  });
  const cartGrandTotal = cartSubtotal + cartTaxTotal;"""

replace_logic = """  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let cartTaxTotal = 0;
  const cartTaxBreakdown: any[] = [];

  const taxesArr = activeTaxes || [];
  const groups = taxesArr.filter((t: any) => t.type === 'GROUP');
  const standardTaxes = taxesArr.filter((t: any) => t.type === 'TAX');

  for (const group of groups) {
      const subTaxes = standardTaxes.filter((t: any) => typeof t.groupId === 'string' ? t.groupId === group._id : t.groupId?._id === group._id);
      if (subTaxes.length === 0) continue;

      let groupAmount = 0;
      let groupPercentage = 0;
      const subTaxesBreakdown = subTaxes.map((st: any) => {
         const amt = Math.round(cartSubtotal * (st.percentage / 100));
         groupAmount += amt;
         groupPercentage += st.percentage;
         return { name: st.name, percentage: st.percentage, amount: amt };
      });

      cartTaxTotal += groupAmount;
      cartTaxBreakdown.push({
         name: group.name,
         percentage: groupPercentage,
         amount: groupAmount,
         subTaxes: subTaxesBreakdown
      });
  }

  const standaloneTaxes = standardTaxes.filter((t: any) => !t.groupId);
  for (const st of standaloneTaxes) {
      const amount = Math.round(cartSubtotal * (st.percentage / 100));
      cartTaxTotal += amount;
      cartTaxBreakdown.push({
         name: st.name,
         percentage: st.percentage,
         amount,
         subTaxes: []
      });
  }

  const cartGrandTotal = cartSubtotal + cartTaxTotal;"""

content = content.replace(search_logic, replace_logic)

search_render = """                       {cartTaxBreakdown.map((t: any, idx: number) => (
                           <div key={idx} className="flex justify-between text-slate-500 text-sm">
                              <span>{t.name} ({t.percentage}%)</span>
                              <span className="font-mono">{formatPrice(t.amount, currency)}</span>
                           </div>
                       ))}"""

replace_render = """                       {cartTaxBreakdown.map((t: any, idx: number) => (
                           <div key={idx} className="flex flex-col">
                               <div className="flex justify-between text-slate-500 text-sm">
                                  <span>{t.name} ({t.percentage}%)</span>
                                  <span className="font-mono">{formatPrice(t.amount, currency)}</span>
                               </div>
                               {t.subTaxes && t.subTaxes.length > 0 && t.subTaxes.map((st: any, i: number) => (
                                   <div key={i} className="flex justify-between text-slate-400 text-xs pl-4">
                                      <span>{st.name} ({st.percentage}%)</span>
                                      <span className="font-mono">{formatPrice(st.amount, currency)}</span>
                                   </div>
                               ))}
                           </div>
                       ))}"""

content = content.replace(search_render, replace_render)


search_order_tracker = """              {order.taxBreakdown && order.taxBreakdown.length > 0 ? (
                order.taxBreakdown.map((t: any, i: number) => (
                  <div key={i} className="flex justify-between font-medium">
                    <span>{t.name} ({t.percentage}%)</span>
                    <span className="font-mono">{formatPrice(t.amount, currency)}</span>
                  </div>
                ))
              ) : ("""

replace_order_tracker = """              {order.taxBreakdown && order.taxBreakdown.length > 0 ? (
                order.taxBreakdown.map((t: any, i: number) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <div className="flex justify-between font-medium">
                      <span>{t.name} ({t.percentage}%)</span>
                      <span className="font-mono">{formatPrice(t.amount, currency)}</span>
                    </div>
                    {t.subTaxes && t.subTaxes.length > 0 && t.subTaxes.map((st: any, j: number) => (
                       <div key={j} className="flex justify-between font-normal text-xs text-slate-500 pl-4">
                         <span>{st.name} ({st.percentage}%)</span>
                         <span className="font-mono">{formatPrice(st.amount, currency)}</span>
                       </div>
                    ))}
                  </div>
                ))
              ) : ("""

content = content.replace(search_order_tracker, replace_order_tracker)

with open('client/src/pages/PublicTable.tsx', 'w') as f:
    f.write(content)

import re

with open('client/src/pages/PublicTable.tsx', 'r') as f:
    content = f.read()

# Add tax fetching
search_import = """import { publicService, Restaurant, Category } from '../services/restaurant.service';"""
replace_import = """import { publicService, Restaurant, Category, Tax } from '../services/restaurant.service';\nimport apiClient from '../lib/api';"""
content = content.replace(search_import, replace_import)

search_queries = """  const { data: menuData, isLoading: isLoadingMenu } = useQuery({
    queryKey: ['publicMenu', restaurantSlug, tableToken],
    queryFn: () => publicService.getMenu(restaurantSlug!, tableToken!),
    enabled: !!restaurantSlug && !!tableToken,
  });"""

replace_queries = """  const { data: menuData, isLoading: isLoadingMenu } = useQuery({
    queryKey: ['publicMenu', restaurantSlug, tableToken],
    queryFn: () => publicService.getMenu(restaurantSlug!, tableToken!),
    enabled: !!restaurantSlug && !!tableToken,
  });

  const { data: taxesData } = useQuery({
    queryKey: ['publicTaxes', restaurant?._id],
    queryFn: async () => {
       const res = await apiClient.get(`/restaurants/${restaurant?._id}/taxes`);
       return res.data;
    },
    enabled: !!restaurant?._id,
  });
  const activeTaxes: Tax[] = taxesData?.data || [];
"""
content = content.replace(search_queries, replace_queries)


search_subtotal = """  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);"""
replace_subtotal = """  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  let cartTaxTotal = 0;
  const cartTaxBreakdown = activeTaxes.map(t => {
     const amt = Math.round(cartSubtotal * (t.percentage / 100));
     cartTaxTotal += amt;
     return { name: t.name, percentage: t.percentage, amount: amt };
  });
  const cartGrandTotal = cartSubtotal + cartTaxTotal;
"""
content = content.replace(search_subtotal, replace_subtotal)


search_cart_total_display = """                    <div className="flex items-center justify-between">
                      <span className="text-slate-800 font-bold text-sm">Grand Total (Incl. Taxes)</span>
                      <span className="text-lg font-black text-slate-900 font-mono">{formatPrice(cartSubtotal + Math.round(cartSubtotal * ((restaurant.taxRatePercent || 0) / 100)), currency)}</span>
                    </div>"""
replace_cart_total_display = """                    <div className="flex flex-col gap-1 mb-2 border-b border-slate-200 pb-2">
                       <div className="flex justify-between text-slate-500 text-sm">
                          <span>Subtotal</span>
                          <span className="font-mono">{formatPrice(cartSubtotal, currency)}</span>
                       </div>
                       {cartTaxBreakdown.map((t, idx) => (
                           <div key={idx} className="flex justify-between text-slate-500 text-sm">
                              <span>{t.name} ({t.percentage}%)</span>
                              <span className="font-mono">{formatPrice(t.amount, currency)}</span>
                           </div>
                       ))}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-800 font-bold text-sm">Grand Total (Incl. Taxes)</span>
                      <span className="text-lg font-black text-slate-900 font-mono">{formatPrice(cartGrandTotal, currency)}</span>
                    </div>"""
content = content.replace(search_cart_total_display, replace_cart_total_display)


search_order_tracker_tax = """              <div className="flex justify-between font-medium">
                <span>VAT / Taxes ({taxRatePercent}%)</span>
                <span className="font-mono">{formatPrice(order.tax, currency)}</span>
              </div>"""
replace_order_tracker_tax = """              {order.taxBreakdown && order.taxBreakdown.length > 0 ? (
                order.taxBreakdown.map((t: any, i: number) => (
                  <div key={i} className="flex justify-between font-medium">
                    <span>{t.name} ({t.percentage}%)</span>
                    <span className="font-mono">{formatPrice(t.amount, currency)}</span>
                  </div>
                ))
              ) : (
                  <div className="flex justify-between font-medium">
                    <span>Taxes</span>
                    <span className="font-mono">{formatPrice(order.tax, currency)}</span>
                  </div>
              )}"""
content = content.replace(search_order_tracker_tax, replace_order_tracker_tax)

with open('client/src/pages/PublicTable.tsx', 'w') as f:
    f.write(content)

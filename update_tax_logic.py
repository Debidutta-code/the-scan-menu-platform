import re

with open('server/src/controllers/public.controller.ts', 'r') as f:
    content = f.read()

search_logic1 = """      const activeTaxes: any[] = await Tax.find({ restaurantId: restaurant._id, isActive: true });

      let tax = 0;
      const taxBreakdown = activeTaxes.map((t: any) => {
        const amount = Math.round(subtotal * (t.percentage / 100));
        tax += amount;
        return {
          name: t.name,
          percentage: t.percentage,
          amount
        };
      });"""

replace_logic1 = """      const activeTaxes: any[] = await Tax.find({ restaurantId: restaurant._id, isActive: true });

      let tax = 0;
      const taxBreakdown: any[] = [];
      const groups = activeTaxes.filter(t => t.type === 'GROUP');
      const standardTaxes = activeTaxes.filter(t => t.type === 'TAX');

      // Process Groups
      for (const group of groups) {
          const subTaxes = standardTaxes.filter(t => t.groupId?.toString() === group._id.toString());
          if (subTaxes.length === 0) continue;

          let groupAmount = 0;
          let groupPercentage = 0;
          const subTaxesBreakdown = subTaxes.map(st => {
             const amt = Math.round(subtotal * (st.percentage / 100));
             groupAmount += amt;
             groupPercentage += st.percentage;
             return { name: st.name, percentage: st.percentage, amount: amt };
          });

          tax += groupAmount;
          taxBreakdown.push({
             name: group.name,
             percentage: groupPercentage,
             amount: groupAmount,
             subTaxes: subTaxesBreakdown
          });
      }

      // Process Standalone Taxes
      const standaloneTaxes = standardTaxes.filter(t => !t.groupId);
      for (const st of standaloneTaxes) {
          const amount = Math.round(subtotal * (st.percentage / 100));
          tax += amount;
          taxBreakdown.push({
             name: st.name,
             percentage: st.percentage,
             amount,
             subTaxes: []
          });
      }"""

content = content.replace(search_logic1, replace_logic1)


search_logic2 = """          let mergedTax = 0;
          order.taxBreakdown = activeTaxes.map((t: any) => {
            const amount = Math.round(order.subtotal * (t.percentage / 100));
            mergedTax += amount;
            return {
              name: t.name,
              percentage: t.percentage,
              amount
            };
          });"""

replace_logic2 = """          let mergedTax = 0;
          const mergedTaxBreakdown: any[] = [];
          const groups = activeTaxes.filter(t => t.type === 'GROUP');
          const standardTaxes = activeTaxes.filter(t => t.type === 'TAX');

          // Process Groups
          for (const group of groups) {
              const subTaxes = standardTaxes.filter(t => t.groupId?.toString() === group._id.toString());
              if (subTaxes.length === 0) continue;

              let groupAmount = 0;
              let groupPercentage = 0;
              const subTaxesBreakdown = subTaxes.map(st => {
                 const amt = Math.round(order.subtotal * (st.percentage / 100));
                 groupAmount += amt;
                 groupPercentage += st.percentage;
                 return { name: st.name, percentage: st.percentage, amount: amt };
              });

              mergedTax += groupAmount;
              mergedTaxBreakdown.push({
                 name: group.name,
                 percentage: groupPercentage,
                 amount: groupAmount,
                 subTaxes: subTaxesBreakdown
              });
          }

          // Process Standalone Taxes
          const standaloneTaxes = standardTaxes.filter(t => !t.groupId);
          for (const st of standaloneTaxes) {
              const amount = Math.round(order.subtotal * (st.percentage / 100));
              mergedTax += amount;
              mergedTaxBreakdown.push({
                 name: st.name,
                 percentage: st.percentage,
                 amount,
                 subTaxes: []
              });
          }

          order.taxBreakdown = mergedTaxBreakdown;"""

content = content.replace(search_logic2, replace_logic2)

with open('server/src/controllers/public.controller.ts', 'w') as f:
    f.write(content)

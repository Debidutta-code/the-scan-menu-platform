with open('server/src/controllers/public.controller.ts', 'r') as f:
    content = f.read()

content = content.replace("const activeTaxes = await Tax.find({ restaurantId: restaurant._id, isActive: true });", "const activeTaxes: any[] = await Tax.find({ restaurantId: restaurant._id, isActive: true });")
content = content.replace("const taxBreakdown = activeTaxes.map(t => {", "const taxBreakdown = activeTaxes.map((t: any) => {")
content = content.replace("order.taxBreakdown = activeTaxes.map(t => {", "order.taxBreakdown = activeTaxes.map((t: any) => {")

with open('server/src/controllers/public.controller.ts', 'w') as f:
    f.write(content)

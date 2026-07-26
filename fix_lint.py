with open('client/src/pages/PublicTable.tsx', 'r') as f:
    content = f.read()

content = content.replace("taxRatePercent: number;", "")
content = content.replace("  taxRatePercent,", "")
content = content.replace("                  taxRatePercent={restaurant.taxRatePercent || 0}", "")

with open('client/src/pages/PublicTable.tsx', 'w') as f:
    f.write(content)

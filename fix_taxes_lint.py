with open('client/src/pages/ManagerTaxes.tsx', 'r') as f:
    content = f.read()

content = content.replace("  const taxes: Tax[] = taxesData?.data || [];", "  const taxes: Tax[] = useMemo(() => taxesData?.data || [], [taxesData?.data]);")

with open('client/src/pages/ManagerTaxes.tsx', 'w') as f:
    f.write(content)

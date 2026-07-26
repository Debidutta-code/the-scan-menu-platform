sed -i 's/zoneId: zId || null/zoneId: zId || undefined/' client/src/pages/ManagerTables.tsx
sed -i 's/zoneId: activeZoneFilter/zoneId: activeZoneFilter || undefined/' client/src/pages/ManagerTables.tsx

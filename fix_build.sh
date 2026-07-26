sed -i 's/zoneId: z.string().optional().nullable()/zoneId: z.string().optional()/' client/src/pages/ManagerTables.tsx
sed -i 's/id: string; data: Partial<Table>/id: string; data: any/' client/src/pages/ManagerTables.tsx
sed -i 's/activeZoneFilter === id/activeZoneFilter === id/' client/src/pages/ManagerTables.tsx

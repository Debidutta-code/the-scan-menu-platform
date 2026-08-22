export function getPrimaryManagerRoute(
  isEnabled: (key: string) => boolean,
  role?: string
): string {
  const isStaff = role === 'STAFF';

  // Staff prioritized routes
  if (isStaff) {
    if (isEnabled('ordering')) return '/manager/orders';
    if (isEnabled('inventory')) return '/manager/inventory';
    if (isEnabled('qr_menu')) return '/manager/menu/availability';
    if (isEnabled('waiter_call')) return '/manager/waiter-calls';
    return '/manager/profile';
  }

  // Manager & SuperAdmin prioritized routes
  if (isEnabled('ordering')) return '/manager/orders';
  if (isEnabled('pos')) return '/manager/counter';
  if (isEnabled('kds')) return '/manager/kds';
  if (isEnabled('qr_menu')) return '/manager/menu';
  if (isEnabled('waiter_call')) return '/manager/waiter-calls';
  if (isEnabled('inventory')) return '/manager/inventory';
  if (isEnabled('payments')) return '/manager/transactions';
  if (isEnabled('crm')) return '/manager/customers';
  if (isEnabled('analytics')) return '/manager/analytics';

  // Fallback to Settings or Profile when all operational modules are deactivated
  return '/manager/settings';
}

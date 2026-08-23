import { describe, it, expect, vi } from 'vitest';
import { Types } from 'mongoose';
import { outletSetupAuditService } from '../../src/services/outletSetupAudit.service';
import { Restaurant } from '../../src/models/Restaurant';
import { RestaurantSettings } from '../../src/models/RestaurantSettings';
import { Table } from '../../src/models/Table';
import { Category } from '../../src/models/Category';
import { MenuItem } from '../../src/models/MenuItem';
import { Tax } from '../../src/models/Tax';
import { FeatureFlag } from '../../src/models/FeatureFlag';
import { RestaurantStaff } from '../../src/models/RestaurantStaff';

describe('OutletSetupAuditService', () => {
  const dummyRestId = new Types.ObjectId();

  it('calculates audit progress and detects missing feature requirements', async () => {
    // Mock Database Returns
    vi.spyOn(Restaurant, 'findById').mockResolvedValue({
      _id: dummyRestId,
      name: 'Grand Royal Bistro',
      slug: 'grand-royal-bistro',
      phone: '+91 9876543210',
      email: 'contact@grandroyal.com',
      address: '123 Marine Drive, Mumbai',
      logoUrl: 'https://example.com/logo.png',
      status: 'ACTIVE',
    } as any);

    vi.spyOn(RestaurantSettings, 'findOne').mockResolvedValue({
      restaurantId: dummyRestId,
      timings: { open: '09:00', close: '23:00' },
      paymentConfig: {
        taxRatePercent: 5,
        paymentMethods: { cash: true, card: true, upi: true, razorpay: true },
        razorpayConfig: { keyId: '' }, // Missing Key ID!
      },
      printerConfig: {
        paperWidth: '80mm',
      },
    } as any);

    vi.spyOn(Table, 'find').mockResolvedValue([
      { _id: new Types.ObjectId(), tableNumber: '1', isActive: true },
      { _id: new Types.ObjectId(), tableNumber: '2', isActive: true },
    ] as any);

    vi.spyOn(Category, 'find').mockResolvedValue([
      { _id: new Types.ObjectId(), name: 'Starters', isActive: true },
    ] as any);

    vi.spyOn(MenuItem, 'find').mockResolvedValue([
      { _id: new Types.ObjectId(), name: 'Paneer Tikka', price: 299, isAvailable: true },
    ] as any);

    vi.spyOn(Tax, 'find').mockResolvedValue([
      { _id: new Types.ObjectId(), name: 'GST', percentage: 5, isActive: true },
    ] as any);

    vi.spyOn(RestaurantStaff, 'find').mockResolvedValue([
      { _id: new Types.ObjectId(), role: 'MANAGER', isActive: true },
    ] as any);

    vi.spyOn(FeatureFlag, 'find').mockResolvedValue([
      { key: 'qr_menu', enabled: true },
      { key: 'ordering', enabled: true },
      { key: 'payments', enabled: true }, // Enabled but missing Razorpay key
    ] as any);

    const audit = await outletSetupAuditService.auditOutlet(dummyRestId);

    expect(audit).toBeDefined();
    expect(audit.restaurantName).toBe('Grand Royal Bistro');
    expect(audit.overallPercentage).toBeGreaterThanOrEqual(80);
    expect(audit.summary.tablesCount).toBe(2);
    expect(audit.summary.categoriesCount).toBe(1);
    expect(audit.summary.menuItemsCount).toBe(1);

    // Payments should be flagged as missing Razorpay key
    const paymentsRequirement = audit.missingFeatureSetups.find((m) => m.featureKey === 'payments');
    expect(paymentsRequirement).toBeDefined();
    expect(paymentsRequirement?.missingRequirements).toContain('Razorpay Key ID is required when Razorpay is enabled');
  });
});

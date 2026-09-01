import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../active_orders/providers/active_orders_provider.dart';
import '../../auth/providers/auth_provider.dart';
import '../../tables/providers/tables_provider.dart';
import '../providers/cart_provider.dart';

class CartReviewScreen extends ConsumerStatefulWidget {
  const CartReviewScreen({super.key});

  @override
  ConsumerState<CartReviewScreen> createState() => _CartReviewScreenState();
}

class _CartReviewScreenState extends ConsumerState<CartReviewScreen> {
  final _customerNameController = TextEditingController();
  final _customerPhoneController = TextEditingController();
  final _customerNoteController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final cartState = ref.read(cartProvider);
    final authState = ref.read(authProvider);
    final isPrepaid = authState.activeRestaurant?.isPrepaid ?? false;

    _customerNameController.text = cartState.customerName;
    _customerPhoneController.text = cartState.customerPhone;
    _customerNoteController.text = cartState.customerNote;

    if (isPrepaid) {
      ref.read(cartProvider.notifier).setPaymentStatus('PAID');
      if (authState.activeRestaurant?.upiId != null) {
        ref.read(cartProvider.notifier).setPaymentMethod('UPI');
      }
    }
  }

  @override
  void dispose() {
    _customerNameController.dispose();
    _customerPhoneController.dispose();
    _customerNoteController.dispose();
    super.dispose();
  }

  Future<void> _handleSubmitOrder() async {
    ref.read(cartProvider.notifier).setCustomerInfo(
          name: _customerNameController.text,
          phone: _customerPhoneController.text,
          note: _customerNoteController.text,
        );

    final order = await ref.read(cartProvider.notifier).submitOrder();
    if (order != null && mounted) {
      ref.read(activeOrdersProvider.notifier).fetchActiveOrders(isSilent: true);
      ref.read(tablesProvider.notifier).fetchTablesAndZones(isSilent: true);

      final orderNumber = order['orderNumber'] ?? '';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Order #$orderNumber sent to kitchen!'),
          backgroundColor: AppColors.success,
        ),
      );

      // Navigate back to floor map / orders
      Navigator.of(context).popUntil((route) => route.isFirst);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cartState = ref.watch(cartProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'Review Order',
          style: GoogleFonts.outfit(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
      ),
      body: cartState.isEmpty
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(LucideIcons.shoppingBag,
                      size: 48, color: AppColors.textMuted),
                  const SizedBox(height: 12),
                  Text(
                    'Your cart is empty',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Add Items'),
                  ),
                ],
              ),
            )
          : SingleChildScrollView(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Table & Order Mode Pill
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(LucideIcons.utensils,
                              color: AppColors.primary, size: 20),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                cartState.selectedTable != null
                                    ? cartState.selectedTable!.displayName
                                    : 'Takeaway Order',
                                style: GoogleFonts.outfit(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              Text(
                                'Order Mode: ${cartState.orderMode}',
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: AppColors.textSecondary,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Cart Items List Header
                  Text(
                    'Order Items (${cartState.totalItemCount})',
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Cart Items List
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: cartState.items.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (ctx, idx) {
                      final cartItem = cartState.items[idx];
                      return Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.cardBorder),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        cartItem.item.name,
                                        style: GoogleFonts.inter(
                                          fontSize: 14,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.textPrimary,
                                        ),
                                      ),
                                      if (cartItem.selectedVariant != null)
                                        Padding(
                                          padding: const EdgeInsets.only(top: 2),
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 6, vertical: 1.5),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFEFF6FF),
                                              borderRadius:
                                                  BorderRadius.circular(4),
                                              border: Border.all(
                                                  color:
                                                      const Color(0xFFBFDBFE)),
                                            ),
                                            child: Text(
                                              'Size: ${cartItem.selectedVariant!.name}',
                                              style: GoogleFonts.inter(
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                                color: const Color(0xFF1D4ED8),
                                              ),
                                            ),
                                          ),
                                        ),
                                      if (cartItem.selectedAddOns.isNotEmpty) ...[
                                        const SizedBox(height: 2),
                                        Text(
                                          '+ ${cartItem.selectedAddOns.map((a) => a.priceDelta > 0 ? '${a.name} (+${Formatters.formatCurrency(a.priceDelta)})' : a.name).join(', ')}',
                                          style: GoogleFonts.inter(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w600,
                                            color: AppColors.primary,
                                          ),
                                        ),
                                      ],
                                      if (cartItem.specialInstructions
                                          .isNotEmpty) ...[
                                        const SizedBox(height: 2),
                                        Text(
                                          'Note: "${cartItem.specialInstructions}"',
                                          style: GoogleFonts.inter(
                                            fontSize: 11,
                                            fontStyle: FontStyle.italic,
                                            color: AppColors.textMuted,
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                                Text(
                                  Formatters.formatCurrency(cartItem.itemTotal),
                                  style: GoogleFonts.outfit(
                                    fontSize: 15,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.primary,
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 10),

                            // Stepper & Delete
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  height: 32,
                                  decoration: BoxDecoration(
                                    color: AppColors.surfaceLight,
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Row(
                                    children: [
                                      IconButton(
                                        iconSize: 14,
                                        padding: EdgeInsets.zero,
                                        icon: const Icon(LucideIcons.minus,
                                            color: AppColors.textPrimary),
                                        onPressed: () => ref
                                            .read(cartProvider.notifier)
                                            .updateQuantity(
                                                idx, cartItem.quantity - 1),
                                      ),
                                      Padding(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 6),
                                        child: Text(
                                          '${cartItem.quantity}',
                                          style: GoogleFonts.inter(
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.textPrimary,
                                          ),
                                        ),
                                      ),
                                      IconButton(
                                        iconSize: 14,
                                        padding: EdgeInsets.zero,
                                        icon: const Icon(LucideIcons.plus,
                                            color: AppColors.textPrimary),
                                        onPressed: () => ref
                                            .read(cartProvider.notifier)
                                            .updateQuantity(
                                                idx, cartItem.quantity + 1),
                                      ),
                                    ],
                                  ),
                                ),
                                IconButton(
                                  icon: const Icon(LucideIcons.trash2,
                                      size: 16, color: AppColors.error),
                                  onPressed: () => ref
                                      .read(cartProvider.notifier)
                                      .removeItem(idx),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                  const SizedBox(height: 16),

                  // Optional Customer Info & Notes
                  Text(
                    'Customer & Order Notes (Optional)',
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _customerNameController,
                    style: const TextStyle(
                        color: AppColors.textPrimary, fontSize: 13),
                    decoration: const InputDecoration(
                      hintText: 'Customer Name (e.g. John Doe)',
                      prefixIcon: Icon(LucideIcons.user,
                          size: 16, color: AppColors.textMuted),
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _customerPhoneController,
                    keyboardType: TextInputType.phone,
                    style: const TextStyle(
                        color: AppColors.textPrimary, fontSize: 13),
                    decoration: const InputDecoration(
                      hintText: 'Customer Phone (10 digits)',
                      prefixIcon: Icon(LucideIcons.phone,
                          size: 16, color: AppColors.textMuted),
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    ),
                  ),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _customerNoteController,
                    maxLines: 2,
                    style: const TextStyle(
                        color: AppColors.textPrimary, fontSize: 13),
                    decoration: const InputDecoration(
                      hintText: 'Special Order Notes...',
                      prefixIcon: Icon(LucideIcons.messageSquare,
                          size: 16, color: AppColors.textMuted),
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Financial Calculations
                  () {
                    final authState = ref.watch(authProvider);
                    final restaurant = authState.activeRestaurant;
                    final isPrepaid = restaurant?.isPrepaid ?? false;
                    final upiId = restaurant?.upiId;
                    final taxRate = restaurant?.taxRatePercent ?? 0;

                    final subtotalInPaise = cartState.subtotalInPaise;
                    final taxInPaise = cartState.calculateTaxInPaise(taxRate);
                    final grandTotalInPaise = cartState.calculateGrandTotalInPaise(taxRate);
                    final grandTotalInRupees = (grandTotalInPaise / 100).toStringAsFixed(2);
                    final tableDisplayName = cartState.selectedTable != null
                        ? (cartState.selectedTable!.displayName.isNotEmpty
                            ? cartState.selectedTable!.displayName
                            : 'Table ${cartState.selectedTable!.tableNumber}')
                        : 'Walk-in';

                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Payment Settlement & Verification Card
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Payment Settlement',
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                            if (isPrepaid)
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(
                                  color: AppColors.warning.withOpacity(0.15),
                                  borderRadius: BorderRadius.circular(8),
                                  border: Border.all(color: AppColors.warning.withOpacity(0.4)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(LucideIcons.zap, size: 12, color: AppColors.warning),
                                    const SizedBox(width: 4),
                                    Text(
                                      'PREPAID OUTLET',
                                      style: GoogleFonts.inter(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.warning,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: AppColors.cardBorder),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              // Status Selector: Paid Now vs Pay Later Tab
                              Row(
                                children: [
                                  if (!isPrepaid) ...[
                                    Expanded(
                                      child: ChoiceChip(
                                        label: const Center(child: Text('Pay Later (Tab)')),
                                        selected: cartState.paymentStatus == 'PENDING',
                                        onSelected: (sel) {
                                          if (sel) {
                                            ref.read(cartProvider.notifier).setPaymentStatus('PENDING');
                                          }
                                        },
                                        selectedColor: AppColors.warning.withOpacity(0.2),
                                        labelStyle: TextStyle(
                                          color: cartState.paymentStatus == 'PENDING'
                                              ? AppColors.warning
                                              : AppColors.textSecondary,
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                  ],
                                  Expanded(
                                    child: ChoiceChip(
                                      label: Center(
                                        child: Row(
                                          mainAxisAlignment: MainAxisAlignment.center,
                                          children: [
                                            const Icon(LucideIcons.checkCircle2, size: 14),
                                            const SizedBox(width: 4),
                                            Text(isPrepaid ? 'Collect & Verify Payment' : 'Paid Now'),
                                          ],
                                        ),
                                      ),
                                      selected: cartState.paymentStatus == 'PAID',
                                      onSelected: (sel) {
                                        if (sel) {
                                          ref.read(cartProvider.notifier).setPaymentStatus('PAID');
                                        }
                                      },
                                      selectedColor: AppColors.success.withOpacity(0.2),
                                      labelStyle: TextStyle(
                                        color: cartState.paymentStatus == 'PAID'
                                            ? AppColors.success
                                            : AppColors.textSecondary,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                ],
                              ),

                              if (cartState.paymentStatus == 'PAID') ...[
                                const SizedBox(height: 12),
                                const Divider(),
                                const SizedBox(height: 8),
                                Text(
                                  'Select Collection Mode',
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                                const SizedBox(height: 8),
                                // Payment Method Buttons (UPI, CASH, CARD)
                                Row(
                                  children: [
                                    for (final method in [
                                      {'key': 'UPI', 'label': 'UPI QR', 'icon': LucideIcons.qrCode},
                                      {'key': 'CASH', 'label': 'Cash', 'icon': LucideIcons.banknote},
                                      {'key': 'CARD', 'label': 'Card / POS', 'icon': LucideIcons.creditCard},
                                    ]) ...[
                                      Expanded(
                                        child: InkWell(
                                          onTap: () {
                                            ref.read(cartProvider.notifier).setPaymentMethod(method['key'] as String);
                                          },
                                          borderRadius: BorderRadius.circular(10),
                                          child: Container(
                                            padding: const EdgeInsets.symmetric(vertical: 8),
                                            decoration: BoxDecoration(
                                              color: cartState.paymentMethod == method['key']
                                                  ? AppColors.primary.withOpacity(0.12)
                                                  : AppColors.background,
                                              borderRadius: BorderRadius.circular(10),
                                              border: Border.all(
                                                color: cartState.paymentMethod == method['key']
                                                    ? AppColors.primary
                                                    : AppColors.cardBorder,
                                                width: cartState.paymentMethod == method['key'] ? 1.5 : 1,
                                              ),
                                            ),
                                            child: Column(
                                              children: [
                                                Icon(
                                                  method['icon'] as IconData,
                                                  size: 16,
                                                  color: cartState.paymentMethod == method['key']
                                                      ? AppColors.primary
                                                      : AppColors.textMuted,
                                                ),
                                                const SizedBox(height: 4),
                                                Text(
                                                  method['label'] as String,
                                                  style: GoogleFonts.inter(
                                                    fontSize: 11,
                                                    fontWeight: FontWeight.bold,
                                                    color: cartState.paymentMethod == method['key']
                                                        ? AppColors.primary
                                                        : AppColors.textSecondary,
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ),
                                      ),
                                      if (method['key'] != 'CARD') const SizedBox(width: 8),
                                    ],
                                  ],
                                ),

                                const SizedBox(height: 12),

                                // DYNAMIC VIEW: UPI QR Code
                                if (cartState.paymentMethod == 'UPI') ...[
                                  if (upiId != null && upiId.isNotEmpty) ...[
                                    Container(
                                      width: double.infinity,
                                      padding: const EdgeInsets.all(14),
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        borderRadius: BorderRadius.circular(14),
                                        border: Border.all(color: Colors.black12),
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black.withOpacity(0.04),
                                            blurRadius: 8,
                                            offset: const Offset(0, 2),
                                          ),
                                        ],
                                      ),
                                      child: Column(
                                        children: [
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            children: [
                                              Row(
                                                children: [
                                                  const Icon(LucideIcons.qrCode, size: 16, color: Colors.black87),
                                                  const SizedBox(width: 6),
                                                  Text(
                                                    'Scan & Pay via UPI',
                                                    style: GoogleFonts.inter(
                                                      fontSize: 13,
                                                      fontWeight: FontWeight.bold,
                                                      color: Colors.black87,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                              Text(
                                                '₹$grandTotalInRupees',
                                                style: GoogleFonts.outfit(
                                                  fontSize: 16,
                                                  fontWeight: FontWeight.bold,
                                                  color: AppColors.primary,
                                                ),
                                              ),
                                            ],
                                          ),
                                          const SizedBox(height: 10),
                                          // High-resolution Dynamic UPI QR Image
                                          Builder(builder: (context) {
                                            final upiUri = 'upi://pay?pa=${Uri.encodeComponent(upiId)}&pn=${Uri.encodeComponent(restaurant?.name ?? 'Restaurant')}&am=$grandTotalInRupees&cu=INR&tn=${Uri.encodeComponent('$tableDisplayName Order')}';
                                            final qrImageUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=0&data=${Uri.encodeComponent(upiUri)}';

                                            return ClipRRect(
                                              borderRadius: BorderRadius.circular(10),
                                              child: Image.network(
                                                qrImageUrl,
                                                width: 170,
                                                height: 170,
                                                fit: BoxFit.contain,
                                                loadingBuilder: (context, child, progress) {
                                                  if (progress == null) return child;
                                                  return const SizedBox(
                                                    width: 170,
                                                    height: 170,
                                                    child: Center(
                                                      child: CircularProgressIndicator(strokeWidth: 2),
                                                    ),
                                                  );
                                                },
                                                errorBuilder: (context, error, stackTrace) => Container(
                                                  width: 170,
                                                  height: 170,
                                                  color: Colors.grey.shade100,
                                                  alignment: Alignment.center,
                                                  child: Text(
                                                    'Failed to load QR.\nCheck internet connection.',
                                                    textAlign: TextAlign.center,
                                                    style: GoogleFonts.inter(fontSize: 11, color: Colors.grey),
                                                  ),
                                                ),
                                              ),
                                            );
                                          }),
                                          const SizedBox(height: 8),
                                          Text(
                                            'GPay • PhonePe • Paytm • BHIM',
                                            style: GoogleFonts.inter(
                                              fontSize: 11,
                                              fontWeight: FontWeight.w600,
                                              color: Colors.black54,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'UPI ID: $upiId',
                                            style: GoogleFonts.firaCode(
                                              fontSize: 10,
                                              color: Colors.black45,
                                            ),
                                          ),
                                          const SizedBox(height: 8),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                            decoration: BoxDecoration(
                                              color: Colors.amber.shade50,
                                              borderRadius: BorderRadius.circular(8),
                                              border: Border.all(color: Colors.amber.shade200),
                                            ),
                                            child: Row(
                                              children: [
                                                Icon(LucideIcons.info, size: 13, color: Colors.amber.shade900),
                                                const SizedBox(width: 6),
                                                Expanded(
                                                  child: Text(
                                                    'Hold phone for customer to scan. Verify transaction success before placing order.',
                                                    style: GoogleFonts.inter(
                                                      fontSize: 10,
                                                      fontWeight: FontWeight.w500,
                                                      color: const Color(0xFF451A03),
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ] else ...[
                                    Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: AppColors.error.withOpacity(0.08),
                                        borderRadius: BorderRadius.circular(10),
                                        border: Border.all(color: AppColors.error.withOpacity(0.3)),
                                      ),
                                      child: Row(
                                        children: [
                                          const Icon(LucideIcons.alertCircle, size: 18, color: AppColors.error),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              'UPI ID is not set up in Restaurant Settings. Please collect Cash/Card or configure UPI in Admin Dashboard.',
                                              style: GoogleFonts.inter(
                                                fontSize: 11,
                                                fontWeight: FontWeight.w500,
                                                color: AppColors.error,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ],

                                // DYNAMIC VIEW: Cash Collection
                                if (cartState.paymentMethod == 'CASH') ...[
                                  Container(
                                    padding: const EdgeInsets.all(14),
                                    decoration: BoxDecoration(
                                      color: AppColors.success.withOpacity(0.08),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: AppColors.success.withOpacity(0.3)),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(LucideIcons.banknote, size: 24, color: AppColors.success),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                'Collect ₹$grandTotalInRupees in Cash',
                                                style: GoogleFonts.inter(
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.bold,
                                                  color: AppColors.textPrimary,
                                                ),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                'Collect full cash payment from the customer before placing order.',
                                                style: GoogleFonts.inter(
                                                  fontSize: 11,
                                                  color: AppColors.textSecondary,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],

                                // DYNAMIC VIEW: Card / POS Machine
                                if (cartState.paymentMethod == 'CARD') ...[
                                  Container(
                                    padding: const EdgeInsets.all(14),
                                    decoration: BoxDecoration(
                                      color: AppColors.primary.withOpacity(0.08),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: AppColors.primary.withOpacity(0.3)),
                                    ),
                                    child: Row(
                                      children: [
                                        const Icon(LucideIcons.creditCard, size: 24, color: AppColors.primary),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                'Swipe / Tap Card for ₹$grandTotalInRupees',
                                                style: GoogleFonts.inter(
                                                  fontSize: 13,
                                                  fontWeight: FontWeight.bold,
                                                  color: AppColors.textPrimary,
                                                ),
                                              ),
                                              const SizedBox(height: 2),
                                              Text(
                                                'Swipe card on wireless EDC terminal and verify payment confirmation receipt.',
                                                style: GoogleFonts.inter(
                                                  fontSize: 11,
                                                  color: AppColors.textSecondary,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),

                        // Price Breakdown Summary
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.surface,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: AppColors.cardBorder),
                          ),
                          child: Column(
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Subtotal',
                                    style: GoogleFonts.inter(
                                      fontSize: 14,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                  Text(
                                    Formatters.formatCurrency(subtotalInPaise),
                                    style: GoogleFonts.inter(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                              if (taxRate > 0) ...[
                                const SizedBox(height: 6),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'GST / Taxes ($taxRate%)',
                                      style: GoogleFonts.inter(
                                        fontSize: 13,
                                        color: AppColors.textMuted,
                                      ),
                                    ),
                                    Text(
                                      Formatters.formatCurrency(taxInPaise),
                                      style: GoogleFonts.inter(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w500,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                              const SizedBox(height: 10),
                              const Divider(),
                              const SizedBox(height: 6),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    'Total Payable',
                                    style: GoogleFonts.inter(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                  Text(
                                    Formatters.formatCurrency(grandTotalInPaise),
                                    style: GoogleFonts.outfit(
                                      fontSize: 20,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      ],
                    );
                  }(),
                ],
              ),
            ),

      // Bottom Submit Bar
      bottomSheet: !cartState.isEmpty
          ? Container(
              decoration: const BoxDecoration(
                color: AppColors.surface,
                border: Border(
                  top: BorderSide(color: AppColors.cardBorder, width: 1),
                ),
              ),
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              child: SafeArea(
                child: SizedBox(
                  width: double.infinity,
                  height: 52,
                  child: ElevatedButton(
                    onPressed: cartState.isSubmitting ? null : _handleSubmitOrder,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: cartState.paymentStatus == 'PAID'
                          ? AppColors.success
                          : AppColors.primary,
                      foregroundColor: Colors.white,
                      elevation: 0,
                    ),
                    child: cartState.isSubmitting
                        ? const SizedBox(
                            width: 24,
                            height: 24,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              valueColor: AlwaysStoppedAnimation<Color>(
                                  Colors.white),
                            ),
                          )
                        : Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                cartState.paymentStatus == 'PAID'
                                    ? LucideIcons.checkCircle2
                                    : LucideIcons.send,
                                size: 18,
                                color: Colors.white,
                              ),
                              const SizedBox(width: 8),
                              Text(
                                cartState.paymentStatus == 'PAID'
                                    ? 'Confirm Payment & Place Order'
                                    : 'Send Order to Kitchen (Pay Later)',
                                style: GoogleFonts.inter(
                                  fontSize: 15,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                  ),
                ),
              ),
            )
          : null,
    );
  }
}

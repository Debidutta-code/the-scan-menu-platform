import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../auth/providers/auth_provider.dart';
import '../models/order_model.dart';
import '../providers/active_orders_provider.dart';

class OrderDetailScreen extends ConsumerWidget {
  final OrderModel order;

  const OrderDetailScreen({super.key, required this.order});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersState = ref.watch(activeOrdersProvider);
    final authState = ref.watch(authProvider);

    final workflowMode =
        authState.activeRestaurant?.orderWorkflowMode ?? 'FIVE_STEP';

    // Find latest order version from state
    final currentOrder = ordersState.orders.firstWhere(
      (o) => o.id == order.id,
      orElse: () => order,
    );

    final nextStatus = ref
        .read(activeOrdersProvider.notifier)
        .getNextWorkflowStatus(currentOrder.status, workflowMode);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'Order #${currentOrder.orderNumber}',
          style: GoogleFonts.outfit(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 100),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Header Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        currentOrder.tableName ?? 'Takeaway Order',
                        style: GoogleFonts.outfit(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(
                              color: AppColors.primary.withValues(alpha: 0.4)),
                        ),
                        child: Text(
                          currentOrder.status,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      const Icon(LucideIcons.clock,
                          size: 14, color: AppColors.textSecondary),
                      const SizedBox(width: 6),
                      Text(
                        'Placed at ${Formatters.formatTime(currentOrder.createdAt)} (${Formatters.formatTimeAgo(currentOrder.createdAt)})',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: AppColors.textSecondary,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Payment Status & Settlement Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: currentOrder.paymentStatus == 'PAID'
                    ? AppColors.success.withValues(alpha: 0.08)
                    : AppColors.warning.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: currentOrder.paymentStatus == 'PAID'
                      ? AppColors.success.withValues(alpha: 0.3)
                      : AppColors.warning.withValues(alpha: 0.3),
                ),
              ),
              child: Row(
                children: [
                  Icon(
                    currentOrder.paymentStatus == 'PAID'
                        ? LucideIcons.checkCircle2
                        : LucideIcons.alertCircle,
                    color: currentOrder.paymentStatus == 'PAID'
                        ? AppColors.success
                        : AppColors.warning,
                    size: 24,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          currentOrder.paymentStatus == 'PAID'
                              ? 'Payment Verified'
                              : 'Payment Pending',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: currentOrder.paymentStatus == 'PAID'
                                ? AppColors.success
                                : AppColors.warning,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          currentOrder.paymentStatus == 'PAID'
                              ? 'Settled • ${Formatters.formatCurrency(currentOrder.total)}'
                              : 'Due: ${Formatters.formatCurrency(currentOrder.total)}',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  if (currentOrder.paymentStatus != 'PAID')
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 12, vertical: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      ),
                      onPressed: () => _showPaymentModal(
                          context, ref, currentOrder, authState.activeRestaurant),
                      icon: const Icon(LucideIcons.qrCode, size: 14),
                      label: Text(
                        'Collect Bill',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Items List Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Order Items (${currentOrder.items.length})',
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: currentOrder.items.length,
                    separatorBuilder: (_, __) =>
                        const Divider(height: 20, color: AppColors.cardBorder),
                    itemBuilder: (context, index) {
                      final item = currentOrder.items[index];
                      return Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppColors.background,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              '${item.quantity}x',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.name,
                                  style: GoogleFonts.inter(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                if (item.selectedAddOns.isNotEmpty)
                                  Text(
                                    'Add-ons: ${item.selectedAddOns.join(', ')}',
                                    style: GoogleFonts.inter(
                                      fontSize: 12,
                                      color: AppColors.primary,
                                    ),
                                  ),
                                if (item.specialInstructions != null &&
                                    item.specialInstructions!.isNotEmpty)
                                  Text(
                                    'Note: ${item.specialInstructions}',
                                    style: GoogleFonts.inter(
                                      fontSize: 12,
                                      fontStyle: FontStyle.italic,
                                      color: AppColors.warning,
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          Text(
                            Formatters.formatCurrency(
                                item.unitPrice * item.quantity),
                            style: GoogleFonts.outfit(
                              fontSize: 15,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                        ],
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Bill & Amount Breakdown
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Subtotal',
                          style: GoogleFonts.inter(
                              fontSize: 14, color: AppColors.textSecondary)),
                      Text(Formatters.formatCurrency(currentOrder.subtotal),
                          style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary)),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Tax',
                          style: GoogleFonts.inter(
                              fontSize: 14, color: AppColors.textSecondary)),
                      Text(Formatters.formatCurrency(currentOrder.tax),
                          style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.w600,
                              color: AppColors.textPrimary)),
                    ],
                  ),
                  if (currentOrder.roundOff != 0) ...[
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Round Off',
                            style: GoogleFonts.inter(
                                fontSize: 14, color: AppColors.textSecondary)),
                        Text(
                            '${currentOrder.roundOff > 0 ? '+' : ''}${Formatters.formatCurrency(currentOrder.roundOff)}',
                            style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: currentOrder.roundOff > 0
                                    ? AppColors.warning
                                    : AppColors.success)),
                      ],
                    ),
                  ],
                  const SizedBox(height: 8),
                  const Divider(),
                  const SizedBox(height: 6),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Grand Total',
                          style: GoogleFonts.inter(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary)),
                      Text(Formatters.formatCurrency(currentOrder.total),
                          style: GoogleFonts.outfit(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                              color: AppColors.primary)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),

      // Advance Action Bottom Bar
      bottomSheet: nextStatus != null
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
                    onPressed: () async {
                      await ref
                          .read(activeOrdersProvider.notifier)
                          .advanceOrderStatus(currentOrder.id, nextStatus);
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text(
                                'Order #${currentOrder.orderNumber} updated to $nextStatus'),
                            backgroundColor: AppColors.success,
                          ),
                        );
                      }
                    },
                    child: Text(
                      'Advance to $nextStatus',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ),
              ),
            )
          : null,
    );
  }

  void _showPaymentModal(BuildContext context, WidgetRef ref, OrderModel order,
      dynamic restaurant) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _PaymentCollectionModal(
        order: order,
        restaurant: restaurant,
        onPaymentVerified: (method) async {
          final success = await ref
              .read(activeOrdersProvider.notifier)
              .verifyManualPayment(order.id, method: method, amount: order.total);
          if (context.mounted) {
            Navigator.pop(context);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(success
                    ? 'Payment of ${Formatters.formatCurrency(order.total)} marked verified ($method)'
                    : 'Failed to verify payment. Please try again.'),
                backgroundColor: success ? AppColors.success : AppColors.error,
              ),
            );
          }
        },
      ),
    );
  }
}

class _PaymentCollectionModal extends StatefulWidget {
  final OrderModel order;
  final dynamic restaurant;
  final Function(String method) onPaymentVerified;

  const _PaymentCollectionModal({
    required this.order,
    required this.restaurant,
    required this.onPaymentVerified,
  });

  @override
  State<_PaymentCollectionModal> createState() =>
      _PaymentCollectionModalState();
}

class _PaymentCollectionModalState extends State<_PaymentCollectionModal> {
  String _selectedMethod = 'UPI';
  bool _isProcessing = false;

  @override
  Widget build(BuildContext context) {
    final upiId = widget.restaurant?.upiId;
    final grandTotalInRupees = (widget.order.total / 100).toStringAsFixed(2);
    final upiUri = upiId != null && upiId.isNotEmpty
        ? 'upi://pay?pa=${Uri.encodeComponent(upiId)}&pn=${Uri.encodeComponent(widget.restaurant?.name ?? 'Restaurant')}&am=$grandTotalInRupees&cu=INR&tn=${Uri.encodeComponent('Order #${widget.order.orderNumber}')}'
        : null;

    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
        20,
        16,
        20,
        MediaQuery.of(context).viewInsets.bottom + 24,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Handle Bar
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.cardBorder,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Modal Title & Amount Ribbon
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Table Bill Settlement',
                      style: GoogleFonts.outfit(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    Text(
                      'Order #${widget.order.orderNumber} • ${widget.order.tableName ?? 'Table'}',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
                Text(
                  Formatters.formatCurrency(widget.order.total),
                  style: GoogleFonts.outfit(
                    fontSize: 22,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Method Selector Buttons
            Row(
              children: [
                _buildMethodChip('UPI', 'UPI / QR', LucideIcons.qrCode),
                const SizedBox(width: 8),
                _buildMethodChip('CASH', 'Cash', LucideIcons.banknote),
                const SizedBox(width: 8),
                _buildMethodChip('CARD', 'Card', LucideIcons.creditCard),
              ],
            ),
            const SizedBox(height: 16),

            // UPI QR Code View
            if (_selectedMethod == 'UPI') ...[
              if (upiUri != null) ...[
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: AppColors.cardBorder),
                  ),
                  child: Column(
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.network(
                          'https://api.qrserver.com/v1/create-qr-code/?size=250x250&margin=0&data=${Uri.encodeComponent(upiUri)}',
                          width: 170,
                          height: 170,
                          fit: BoxFit.contain,
                          loadingBuilder: (context, child, progress) {
                            if (progress == null) return child;
                            return const SizedBox(
                              width: 170,
                              height: 170,
                              child: Center(
                                  child: CircularProgressIndicator(
                                      strokeWidth: 2)),
                            );
                          },
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Scan with GPay • PhonePe • Paytm • BHIM',
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: Colors.black87,
                        ),
                      ),
                      Text(
                        'UPI ID: $upiId',
                        style: GoogleFonts.firaCode(
                          fontSize: 11,
                          color: Colors.black54,
                        ),
                      ),
                    ],
                  ),
                ),
              ] else ...[
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                        color: AppColors.warning.withValues(alpha: 0.3)),
                  ),
                  child: Text(
                    'UPI ID not configured in Restaurant Settings. Please collect Cash or Card.',
                    style: GoogleFonts.inter(
                        fontSize: 12, color: AppColors.warning),
                  ),
                ),
              ],
            ],

            if (_selectedMethod == 'CASH') ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.success.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                      color: AppColors.success.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(LucideIcons.banknote,
                        size: 28, color: AppColors.success),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Collect exact cash from the guest and verify total before tapping confirm.',
                        style: GoogleFonts.inter(
                            fontSize: 12, color: AppColors.textPrimary),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            if (_selectedMethod == 'CARD') ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                      color: AppColors.primary.withValues(alpha: 0.3)),
                ),
                child: Row(
                  children: [
                    const Icon(LucideIcons.creditCard,
                        size: 28, color: AppColors.primary),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Swipe/Tap card on EDC machine terminal. Confirm receipt approval before marking verified.',
                        style: GoogleFonts.inter(
                            fontSize: 12, color: AppColors.textPrimary),
                      ),
                    ),
                  ],
                ),
              ),
            ],

            const SizedBox(height: 20),

            // Confirm Button
            SizedBox(
              height: 50,
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.success,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                onPressed: _isProcessing
                    ? null
                    : () {
                        setState(() => _isProcessing = true);
                        widget.onPaymentVerified(_selectedMethod);
                      },
                icon: _isProcessing
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(LucideIcons.checkCheck, size: 18),
                label: Text(
                  _isProcessing
                      ? 'Verifying...'
                      : 'Mark Payment Received ($_selectedMethod)',
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildMethodChip(String key, String label, IconData icon) {
    final isSelected = _selectedMethod == key;
    return Expanded(
      child: GestureDetector(
        onTap: () => setState(() => _selectedMethod = key),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.cardBorder,
              width: 1.5,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                icon,
                size: 16,
                color: isSelected ? Colors.black : AppColors.textSecondary,
              ),
              const SizedBox(width: 6),
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? Colors.black : AppColors.textPrimary,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

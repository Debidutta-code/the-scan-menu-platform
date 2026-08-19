import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../models/order_model.dart';

class OrderCard extends StatelessWidget {
  final OrderModel order;
  final String workflowMode;
  final bool isPendingAction;
  final Function(String nextStatus) onAdvanceStatus;
  final VoidCallback onClearOrder;
  final VoidCallback onTap;

  const OrderCard({
    super.key,
    required this.order,
    required this.workflowMode,
    required this.isPendingAction,
    required this.onAdvanceStatus,
    required this.onClearOrder,
    required this.onTap,
  });

  Color _getStatusColor() {
    switch (order.status) {
      case 'ACCEPTED':
        return AppColors.success;
      case 'PREPARING':
        return AppColors.info;
      case 'READY':
        return AppColors.purple;
      case 'SERVED':
        return AppColors.primary;
      case 'CANCELLED':
        return AppColors.error;
      case 'PENDING':
      default:
        return AppColors.warning;
    }
  }

  String? _getNextStatus() {
    if (workflowMode == 'THREE_STEP') {
      switch (order.status) {
        case 'PENDING':
          return 'PREPARING';
        case 'PREPARING':
          return 'SERVED';
        default:
          return null;
      }
    } else if (workflowMode == 'FOUR_STEP') {
      switch (order.status) {
        case 'PENDING':
          return 'PREPARING';
        case 'PREPARING':
          return 'READY';
        case 'READY':
          return 'SERVED';
        default:
          return null;
      }
    } else {
      // FIVE_STEP (Default)
      switch (order.status) {
        case 'PENDING':
          return 'ACCEPTED';
        case 'ACCEPTED':
          return 'PREPARING';
        case 'PREPARING':
          return 'READY';
        case 'READY':
          return 'SERVED';
        default:
          return null;
      }
    }
  }

  String _getActionLabel(String nextStatus) {
    switch (nextStatus) {
      case 'ACCEPTED':
        return 'Accept Order';
      case 'PREPARING':
        return 'Start Kitchen Prep';
      case 'READY':
        return 'Mark as Ready';
      case 'SERVED':
        return 'Mark as Served';
      default:
        return 'Advance Status';
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _getStatusColor();
    final nextStatus = _getNextStatus();
    final isServed = order.status == 'SERVED';

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.cardBorder),
          ),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Bar: Table & Order Number + Status Pill
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          order.tableName ?? 'Takeaway',
                          style: GoogleFonts.outfit(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '#${order.orderNumber}',
                        style: GoogleFonts.outfit(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: statusColor.withValues(alpha: 0.4)),
                    ),
                    child: Text(
                      order.status,
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: statusColor,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),

              // Time & Mode Row
              Row(
                children: [
                  const Icon(LucideIcons.clock,
                      size: 13, color: AppColors.textSecondary),
                  const SizedBox(width: 4),
                  Text(
                    Formatters.formatTimeAgo(order.createdAt),
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(width: 12),
                  const Icon(LucideIcons.shoppingBag,
                      size: 13, color: AppColors.textSecondary),
                  const SizedBox(width: 4),
                  Text(
                    order.orderMode,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const Spacer(),
                  Text(
                    Formatters.formatCurrency(order.total),
                    style: GoogleFonts.outfit(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              const Divider(),
              const SizedBox(height: 8),

              // Items Summary
              ...order.items.take(3).map((item) {
                return Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Row(
                    children: [
                      Text(
                        '${item.quantity}x ',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      Expanded(
                        child: Text(
                          item.name,
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            color: AppColors.textSecondary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                );
              }),
              if (order.items.length > 3)
                Padding(
                  padding: const EdgeInsets.only(top: 4),
                  child: Text(
                    '+${order.items.length - 3} more items...',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontStyle: FontStyle.italic,
                      color: AppColors.textMuted,
                    ),
                  ),
                ),

              // Special Note Banner if exists
              if (order.customerNote != null &&
                  order.customerNote!.isNotEmpty) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: AppColors.warning.withValues(alpha: 0.3)),
                  ),
                  child: Row(
                    children: [
                      const Icon(LucideIcons.alertCircle,
                          size: 14, color: AppColors.warning),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          order.customerNote!,
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            color: AppColors.warning,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                ),
              ],

              const SizedBox(height: 14),

              // Bottom Action Button
              if (isPendingAction)
                const Center(
                  child: SizedBox(
                    height: 24,
                    width: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      valueColor:
                          AlwaysStoppedAnimation<Color>(AppColors.primary),
                    ),
                  ),
                )
              else if (nextStatus != null)
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: ElevatedButton(
                    onPressed: () => onAdvanceStatus(nextStatus),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: statusColor,
                      foregroundColor: (statusColor == AppColors.warning || statusColor == AppColors.primary)
                          ? AppColors.textDark
                          : Colors.white,
                      elevation: 0,
                    ),
                    child: Text(
                      _getActionLabel(nextStatus),
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                )
              else if (isServed)
                SizedBox(
                  width: double.infinity,
                  height: 44,
                  child: OutlinedButton(
                    onPressed: onClearOrder,
                    style: OutlinedButton.styleFrom(
                      side: const BorderSide(color: AppColors.cardBorder),
                    ),
                    child: const Text('Clear Order from Live Board'),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

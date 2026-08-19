import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../models/waiter_call_model.dart';

class WaiterCallCard extends StatelessWidget {
  final WaiterCallModel call;
  final bool isPendingAction;
  final VoidCallback onAcknowledge;
  final VoidCallback onResolve;

  const WaiterCallCard({
    super.key,
    required this.call,
    required this.isPendingAction,
    required this.onAcknowledge,
    required this.onResolve,
  });

  IconData _getIcon() {
    switch (call.requestType) {
      case WaiterCallType.requestBill:
        return LucideIcons.fileText;
      case WaiterCallType.water:
        return LucideIcons.droplet;
      case WaiterCallType.tissue:
        return LucideIcons.layers;
      case WaiterCallType.other:
        return LucideIcons.helpCircle;
      case WaiterCallType.callWaiter:
        return LucideIcons.bellRing;
    }
  }

  Color _getColor() {
    switch (call.requestType) {
      case WaiterCallType.requestBill:
        return AppColors.success;
      case WaiterCallType.water:
        return AppColors.info;
      case WaiterCallType.tissue:
        return AppColors.textSecondary;
      case WaiterCallType.other:
        return AppColors.purple;
      case WaiterCallType.callWaiter:
        return AppColors.warning;
    }
  }

  @override
  Widget build(BuildContext context) {
    final typeColor = _getColor();
    final isPending = call.status == WaiterCallStatus.pending;

    return Container(
      decoration: BoxDecoration(
        color: isPending
            ? AppColors.surface
            : AppColors.surface.withValues(alpha: 0.7),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isPending
              ? typeColor.withValues(alpha: 0.5)
              : AppColors.cardBorder,
          width: isPending ? 1.5 : 1,
        ),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              // Icon Badge
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: typeColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(_getIcon(), color: typeColor, size: 22),
              ),
              const SizedBox(width: 14),

              // Table info & Request label
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'Table ${call.tableNumberSnapshot}',
                          style: GoogleFonts.outfit(
                            fontSize: 17,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: typeColor.withValues(alpha: 0.15),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                                color: typeColor.withValues(alpha: 0.3)),
                          ),
                          child: Text(
                            call.typeLabel,
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: typeColor,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Called ${Formatters.formatTimeAgo(call.createdAt)}',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),

              // Status Pill
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isPending
                      ? AppColors.warning.withValues(alpha: 0.15)
                      : AppColors.info.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  isPending ? 'PENDING' : 'ACKNOWLEDGED',
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.bold,
                    color: isPending ? AppColors.warning : AppColors.info,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),

          // Attending Staff Attribution Banner (if acknowledged)
          if (call.status == WaiterCallStatus.acknowledged && call.acknowledgedBy != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              decoration: BoxDecoration(
                color: AppColors.info.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.info.withValues(alpha: 0.25)),
              ),
              child: Row(
                children: [
                  const Icon(LucideIcons.userCheck, size: 14, color: AppColors.info),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      'Attending: ${call.acknowledgedBy!.name} (${call.acknowledgedBy!.role})',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: AppColors.info,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
          ],

          // Single Progressive Action Button
          SizedBox(
            width: double.infinity,
            child: isPending
                ? ElevatedButton.icon(
                    onPressed: isPendingAction ? null : onAcknowledge,
                    icon: isPendingAction
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(AppColors.textDark),
                            ),
                          )
                        : const Icon(LucideIcons.hand, size: 16),
                    label: Text(
                      isPendingAction ? 'Acknowledging...' : "Acknowledge (I'm On It)",
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primary,
                      foregroundColor: AppColors.textDark,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      elevation: 0,
                    ),
                  )
                : ElevatedButton.icon(
                    onPressed: isPendingAction ? null : onResolve,
                    icon: isPendingAction
                        ? const SizedBox(
                            width: 16,
                            height: 16,
                            child: CircularProgressIndicator(
                              strokeWidth: 2,
                              valueColor: AlwaysStoppedAnimation<Color>(AppColors.textDark),
                            ),
                          )
                        : const Icon(LucideIcons.checkCheck, size: 16),
                    label: Text(
                      isPendingAction ? 'Resolving...' : 'Mark Resolved (Done)',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.success,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 13),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10),
                      ),
                      elevation: 0,
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}

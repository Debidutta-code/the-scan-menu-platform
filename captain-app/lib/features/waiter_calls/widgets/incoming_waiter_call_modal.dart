import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../models/waiter_call_model.dart';
import '../providers/waiter_calls_provider.dart';

class IncomingWaiterCallModal extends ConsumerStatefulWidget {
  final Widget child;

  const IncomingWaiterCallModal({
    super.key,
    required this.child,
  });

  @override
  ConsumerState<IncomingWaiterCallModal> createState() =>
      _IncomingWaiterCallModalState();
}

class _IncomingWaiterCallModalState
    extends ConsumerState<IncomingWaiterCallModal> {
  final Set<String> _hiddenCallIds = {};
  int _currentCallIndex = 0;

  IconData _getIcon(WaiterCallType type) {
    switch (type) {
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

  Color _getColor(WaiterCallType type) {
    switch (type) {
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
    final waiterState = ref.watch(waiterCallsProvider);

    // Get all pending calls that haven't been hidden/snoozed by user
    final pendingCalls = waiterState.calls
        .where((c) =>
            c.status == WaiterCallStatus.pending &&
            !_hiddenCallIds.contains(c.id))
        .toList();

    final hasPendingCalls = pendingCalls.isNotEmpty;

    // Reset index if out of bounds
    if (_currentCallIndex >= pendingCalls.length) {
      _currentCallIndex = 0;
    }

    final activeCall = hasPendingCalls ? pendingCalls[_currentCallIndex] : null;

    return Stack(
      children: [
        widget.child,

        // Floating Modal Alert Overlay
        if (hasPendingCalls && activeCall != null) ...[
          // Backdrop tint (semi-transparent, dismissible)
          Positioned.fill(
            child: GestureDetector(
              onTap: () {
                // Tapping backdrop hides current call
                setState(() {
                  _hiddenCallIds.add(activeCall.id);
                });
              },
              child: Container(
                color: Colors.black.withValues(alpha: 0.35),
              ),
            ),
          ),

          // Center Animated Modal Card
          Align(
            alignment: Alignment.topCenter,
            child: SafeArea(
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                child: Material(
                  color: Colors.transparent,
                  elevation: 12,
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    width: double.infinity,
                    constraints: const BoxConstraints(maxWidth: 420),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: _getColor(activeCall.requestType)
                            .withValues(alpha: 0.7),
                        width: 2,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: _getColor(activeCall.requestType)
                              .withValues(alpha: 0.25),
                          blurRadius: 20,
                          spreadRadius: 2,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Header Bar: Pulsing Bell Icon + Title + Hide Action
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: _getColor(activeCall.requestType)
                                    .withValues(alpha: 0.15),
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: Icon(
                                _getIcon(activeCall.requestType),
                                color: _getColor(activeCall.requestType),
                                size: 20,
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Text(
                                        'WAITING FOR CAPTAIN',
                                        style: GoogleFonts.inter(
                                          fontSize: 10,
                                          fontWeight: FontWeight.w900,
                                          letterSpacing: 0.8,
                                          color:
                                              _getColor(activeCall.requestType),
                                        ),
                                      ),
                                      if (pendingCalls.length > 1) ...[
                                        const SizedBox(width: 6),
                                        Container(
                                          padding: const EdgeInsets.symmetric(
                                              horizontal: 6, vertical: 1),
                                          decoration: BoxDecoration(
                                            color: AppColors.surfaceLight,
                                            borderRadius:
                                                BorderRadius.circular(8),
                                          ),
                                          child: Text(
                                            '${_currentCallIndex + 1}/${pendingCalls.length}',
                                            style: GoogleFonts.inter(
                                              fontSize: 9.5,
                                              fontWeight: FontWeight.bold,
                                              color: AppColors.textSecondary,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ],
                                  ),
                                  Text(
                                    Formatters.formatTimeAgo(
                                        activeCall.createdAt),
                                    style: GoogleFonts.inter(
                                      fontSize: 11,
                                      color: AppColors.textMuted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(
                                LucideIcons.x,
                                size: 18,
                                color: AppColors.textMuted,
                              ),
                              onPressed: () {
                                setState(() {
                                  _hiddenCallIds.add(activeCall.id);
                                });
                              },
                            ),
                          ],
                        ),

                        const SizedBox(height: 12),

                        // Center Info: Table Number & Reason Banner
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: _getColor(activeCall.requestType)
                                .withValues(alpha: 0.08),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: _getColor(activeCall.requestType)
                                  .withValues(alpha: 0.2),
                            ),
                          ),
                          child: Row(
                            children: [
                              // Big Table Number Badge
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 12, vertical: 8),
                                decoration: BoxDecoration(
                                  color: _getColor(activeCall.requestType),
                                  borderRadius: BorderRadius.circular(10),
                                ),
                                child: Text(
                                  'Table ${activeCall.tableNumberSnapshot}',
                                  style: GoogleFonts.outfit(
                                    fontSize: 18,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.white,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),

                              // Request Details
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      activeCall.typeLabel,
                                      style: GoogleFonts.outfit(
                                        fontSize: 15,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    const SizedBox(height: 2),
                                    Text(
                                      'Guest requested service from table',
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

                        const SizedBox(height: 14),

                        // Action Buttons: Accept Directly or Hide / Later
                        Row(
                          children: [
                            // Hide / Later button (for when taking orders)
                            Expanded(
                              flex: 1,
                              child: OutlinedButton(
                                onPressed: () {
                                  setState(() {
                                    _hiddenCallIds.add(activeCall.id);
                                  });
                                },
                                style: OutlinedButton.styleFrom(
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 12),
                                  foregroundColor: AppColors.textSecondary,
                                  side: const BorderSide(
                                      color: AppColors.cardBorder),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                ),
                                child: Text(
                                  'Hide',
                                  style: GoogleFonts.inter(
                                    fontSize: 12.5,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),

                            // Accept Call Direct Action
                            Expanded(
                              flex: 2,
                              child: ElevatedButton.icon(
                                onPressed: waiterState.pendingActionCallIds
                                        .contains(activeCall.id)
                                    ? null
                                    : () async {
                                        final messenger = ScaffoldMessenger.of(context);
                                        final success = await ref
                                            .read(waiterCallsProvider.notifier)
                                            .acknowledgeCall(activeCall.id);
                                        if (success && mounted) {
                                          messenger.showSnackBar(
                                            SnackBar(
                                              content: Text(
                                                  'Accepted call for Table ${activeCall.tableNumberSnapshot}!'),
                                              backgroundColor: AppColors.success,
                                              duration:
                                                  const Duration(seconds: 2),
                                            ),
                                          );
                                        }
                                      },
                                icon: waiterState.pendingActionCallIds
                                        .contains(activeCall.id)
                                    ? const SizedBox(
                                        width: 16,
                                        height: 16,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor:
                                              AlwaysStoppedAnimation<Color>(
                                                  AppColors.textDark),
                                        ),
                                      )
                                    : const Icon(LucideIcons.check, size: 18),
                                label: Text(
                                  waiterState.pendingActionCallIds
                                          .contains(activeCall.id)
                                      ? 'Accepting...'
                                      : 'Accept Call',
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: AppColors.primary,
                                  foregroundColor: AppColors.textDark,
                                  padding:
                                      const EdgeInsets.symmetric(vertical: 12),
                                  shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  elevation: 0,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ],
      ],
    );
  }
}

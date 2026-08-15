import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../constants/app_colors.dart';
import '../sockets/socket_service.dart';
import '../../features/tables/providers/tables_provider.dart';
import '../../features/active_orders/providers/active_orders_provider.dart';
import '../../features/waiter_calls/providers/waiter_calls_provider.dart';

class QuickReloadButton extends ConsumerStatefulWidget {
  final bool showLabel;
  final VoidCallback? onReloadDone;

  const QuickReloadButton({
    super.key,
    this.showLabel = false,
    this.onReloadDone,
  });

  @override
  ConsumerState<QuickReloadButton> createState() => _QuickReloadButtonState();
}

class _QuickReloadButtonState extends ConsumerState<QuickReloadButton>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  bool _isReloading = false;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 800),
    );
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  Future<void> _handleReload() async {
    if (_isReloading) return;

    setState(() => _isReloading = true);
    HapticFeedback.mediumImpact();
    _animController.repeat();

    try {
      // Refresh all core captain data providers in parallel
      await Future.wait([
        ref.read(tablesProvider.notifier).fetchTablesAndZones(),
        ref.read(activeOrdersProvider.notifier).fetchActiveOrders(),
        ref.read(waiterCallsProvider.notifier).fetchWaiterCalls(),
        SocketService().reconnect(),
      ]);

      if (mounted) {
        ScaffoldMessenger.of(context).hideCurrentSnackBar();
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(LucideIcons.checkCircle2, color: AppColors.success, size: 18),
                SizedBox(width: 8),
                Text('Synced latest floor & order data', style: TextStyle(fontSize: 13)),
              ],
            ),
            backgroundColor: AppColors.surface,
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
          ),
        );
      }
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Failed to refresh some data. Please check connection.'),
            backgroundColor: AppColors.error,
          ),
        );
      }
    } finally {
      if (mounted) {
        _animController.stop();
        _animController.reset();
        setState(() => _isReloading = false);
        widget.onReloadDone?.call();
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.showLabel) {
      return ElevatedButton.icon(
        onPressed: _isReloading ? null : _handleReload,
        icon: RotationTransition(
          turns: _animController,
          child: const Icon(LucideIcons.refreshCw, size: 16),
        ),
        label: Text(_isReloading ? 'Reloading...' : 'Quick Reload'),
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.primary,
          foregroundColor: AppColors.textDark,
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    }

    return IconButton(
      tooltip: 'Quick Reload',
      onPressed: _isReloading ? null : _handleReload,
      icon: RotationTransition(
        turns: _animController,
        child: Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: AppColors.surfaceLight.withValues(alpha: 0.5),
            shape: BoxShape.circle,
            border: Border.all(color: AppColors.cardBorder),
          ),
          child: const Icon(
            LucideIcons.refreshCw,
            size: 18,
            color: AppColors.textPrimary,
          ),
        ),
      ),
    );
  }
}

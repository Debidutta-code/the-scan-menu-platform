import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/quick_reload_button.dart';
import '../../auth/providers/auth_provider.dart';
import '../providers/active_orders_provider.dart';
import '../widgets/order_card.dart';
import 'order_detail_screen.dart';

class ActiveOrdersScreen extends ConsumerStatefulWidget {
  const ActiveOrdersScreen({super.key});

  @override
  ConsumerState<ActiveOrdersScreen> createState() => _ActiveOrdersScreenState();
}

class _ActiveOrdersScreenState extends ConsumerState<ActiveOrdersScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final ordersState = ref.watch(activeOrdersProvider);
    final authState = ref.watch(authProvider);

    final workflowMode =
        authState.activeRestaurant?.orderWorkflowMode ?? 'FIVE_STEP';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Live Orders',
              style: GoogleFonts.outfit(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            Text(
              '${ordersState.orders.length} Active Kitchen & Floor Orders',
              style: GoogleFonts.inter(
                fontSize: 12,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
        actions: const [
          QuickReloadButton(),
          SizedBox(width: 8),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () =>
            ref.read(activeOrdersProvider.notifier).fetchActiveOrders(),
        color: AppColors.primary,
        backgroundColor: AppColors.surface,
        child: Column(
          children: [
            // Search Bar
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: TextField(
                controller: _searchController,
                onChanged: (val) => ref
                    .read(activeOrdersProvider.notifier)
                    .setSearchQuery(val),
                decoration: InputDecoration(
                  hintText: 'Search order #, table, customer...',
                  prefixIcon: const Icon(LucideIcons.search,
                      size: 18, color: AppColors.textMuted),
                  suffixIcon: _searchController.text.isNotEmpty
                      ? IconButton(
                          icon: const Icon(LucideIcons.x,
                              size: 16, color: AppColors.textMuted),
                          onPressed: () {
                            _searchController.clear();
                            ref
                                .read(activeOrdersProvider.notifier)
                                .setSearchQuery('');
                          },
                        )
                      : null,
                  contentPadding:
                      const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                ),
              ),
            ),

            // Status Filter Tabs
            Container(
              height: 42,
              margin: const EdgeInsets.only(bottom: 8),
              child: ListView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                children: [
                  _buildTabPill('All (${ordersState.orders.length})', 'ALL',
                      ordersState.statusFilter == 'ALL'),
                  const SizedBox(width: 8),
                  _buildTabPill(
                      'New (${ordersState.pendingCount})',
                      'PENDING',
                      ordersState.statusFilter == 'PENDING',
                      badgeColor: AppColors.warning),
                  const SizedBox(width: 8),
                  if (workflowMode == 'FIVE_STEP') ...[
                    _buildTabPill(
                        'Accepted (${ordersState.acceptedCount})',
                        'ACCEPTED',
                        ordersState.statusFilter == 'ACCEPTED',
                        badgeColor: AppColors.success),
                    const SizedBox(width: 8),
                  ],
                  _buildTabPill(
                      'Kitchen (${ordersState.preparingCount})',
                      'PREPARING',
                      ordersState.statusFilter == 'PREPARING',
                      badgeColor: AppColors.info),
                  const SizedBox(width: 8),
                  _buildTabPill(
                      'Ready (${ordersState.readyCount})',
                      'READY',
                      ordersState.statusFilter == 'READY',
                      badgeColor: AppColors.purple),
                  const SizedBox(width: 8),
                  _buildTabPill(
                      'Served (${ordersState.servedCount})',
                      'SERVED',
                      ordersState.statusFilter == 'SERVED',
                      badgeColor: AppColors.primary),
                ],
              ),
            ),

            // Orders List / Loading / Error
            Expanded(
              child: ordersState.isLoading
                  ? const Center(
                      child: CircularProgressIndicator(
                        valueColor:
                            AlwaysStoppedAnimation<Color>(AppColors.primary),
                      ),
                    )
                  : ordersState.errorMessage != null
                      ? Center(
                          child: Padding(
                            padding: const EdgeInsets.all(24),
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(LucideIcons.alertCircle,
                                    size: 44, color: AppColors.warning),
                                const SizedBox(height: 12),
                                Text(
                                  'Could not load orders',
                                  style: GoogleFonts.outfit(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  ordersState.errorMessage!,
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    color: AppColors.textMuted,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                ElevatedButton.icon(
                                  onPressed: () => ref
                                      .read(activeOrdersProvider.notifier)
                                      .fetchActiveOrders(),
                                  icon: const Icon(LucideIcons.refreshCw, size: 16),
                                  label: const Text('Try Again'),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.primary,
                                    foregroundColor: AppColors.textDark,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        )
                      : ordersState.filteredOrders.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(LucideIcons.checkCircle2,
                                      size: 48, color: AppColors.textMuted),
                                  const SizedBox(height: 12),
                                  Text(
                                    'No orders in this category',
                                    style: GoogleFonts.inter(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'New incoming orders will appear here automatically',
                                    style: GoogleFonts.inter(
                                      fontSize: 13,
                                      color: AppColors.textMuted,
                                    ),
                                  ),
                                  const SizedBox(height: 14),
                                  const QuickReloadButton(showLabel: true),
                                ],
                              ),
                            )
                          : ListView.separated(
                              padding: const EdgeInsets.fromLTRB(16, 4, 16, 30),
                              itemCount: ordersState.filteredOrders.length,
                              separatorBuilder: (_, __) =>
                                  const SizedBox(height: 12),
                              itemBuilder: (ctx, idx) {
                                final order = ordersState.filteredOrders[idx];
                                final isPending = ordersState
                                    .pendingActionOrderIds
                                    .contains(order.id);

                                return OrderCard(
                                  order: order,
                                  workflowMode: workflowMode,
                                  isPendingAction: isPending,
                                  onAdvanceStatus: (nextStatus) {
                                    ref
                                        .read(activeOrdersProvider.notifier)
                                        .advanceOrderStatus(order.id, nextStatus);
                                  },
                                  onClearOrder: () {
                                    ref
                                        .read(activeOrdersProvider.notifier)
                                        .clearOrder(order.id);
                                  },
                                  onTap: () {
                                    Navigator.of(context).push(
                                      MaterialPageRoute(
                                        builder: (_) =>
                                            OrderDetailScreen(order: order),
                                      ),
                                    );
                                  },
                                );
                              },
                            ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTabPill(
    String label,
    String filterValue,
    bool isSelected, {
    Color? badgeColor,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => ref
            .read(activeOrdersProvider.notifier)
            .setStatusFilter(filterValue),
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected
                  ? AppColors.primary
                  : (badgeColor?.withValues(alpha: 0.4) ?? AppColors.cardBorder),
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: isSelected ? AppColors.textDark : AppColors.textPrimary,
            ),
          ),
        ),
      ),
    );
  }
}

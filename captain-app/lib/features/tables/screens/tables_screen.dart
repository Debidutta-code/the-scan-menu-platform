import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/sockets/socket_service.dart';
import '../../../core/widgets/quick_reload_button.dart';
import '../../auth/providers/auth_provider.dart';
import '../../order_creation/providers/cart_provider.dart';
import '../../order_creation/screens/take_order_screen.dart';
import '../models/table_model.dart';
import '../providers/tables_provider.dart';
import '../widgets/table_card.dart';
import '../widgets/table_orders_bottom_sheet.dart';

class TablesScreen extends ConsumerStatefulWidget {
  const TablesScreen({super.key});

  @override
  ConsumerState<TablesScreen> createState() => _TablesScreenState();
}

class _TablesScreenState extends ConsumerState<TablesScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onTableSelected(TableModel table) {
    if (table.status == TableStatus.available) {
      // Direct to take order
      ref.read(cartProvider.notifier).setTable(table);
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const TakeOrderScreen()),
      );
    } else {
      // Show table orders bottom sheet
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => TableOrdersBottomSheet(table: table),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final tablesState = ref.watch(tablesProvider);
    final authState = ref.watch(authProvider);
    final socketService = SocketService();

    final restaurantName =
        authState.activeRestaurant?.name ?? 'ScanMenu Floor';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              margin: const EdgeInsets.only(right: 10),
              decoration: BoxDecoration(
                color: Colors.black,
                borderRadius: BorderRadius.circular(8),
              ),
              padding: const EdgeInsets.all(4),
              child: Image.asset(
                'assets/images/thescanmenu.png',
                fit: BoxFit.contain,
                errorBuilder: (_, __, ___) => const Icon(
                  LucideIcons.qrCode,
                  color: Colors.white,
                  size: 20,
                ),
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    restaurantName,
                    style: GoogleFonts.outfit(
                      fontSize: 17,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                  Text(
                    'Floor Map & Tables',
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
        actions: [
          // Quick Reload Action Button
          const QuickReloadButton(),
          const SizedBox(width: 4),

          // Interactive Live Socket Connection Pill
          ValueListenableBuilder<SocketConnectionState>(
            valueListenable: socketService.connectionState,
            builder: (ctx, state, _) {
              final isConnected = state == SocketConnectionState.connected;
              return GestureDetector(
                onTap: () {
                  if (!isConnected) {
                    socketService.reconnect();
                    ref.read(tablesProvider.notifier).fetchTablesAndZones();
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(
                        content: Text('Reconnecting live socket...'),
                        duration: Duration(seconds: 1),
                      ),
                    );
                  }
                },
                child: Container(
                  margin: const EdgeInsets.only(right: 16),
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: isConnected
                        ? AppColors.success.withValues(alpha: 0.15)
                        : AppColors.warning.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isConnected
                          ? AppColors.success.withValues(alpha: 0.4)
                          : AppColors.warning.withValues(alpha: 0.4),
                    ),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 7,
                        height: 7,
                        decoration: BoxDecoration(
                          color: isConnected ? AppColors.success : AppColors.warning,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        isConnected ? 'LIVE' : 'SYNCING',
                        style: GoogleFonts.inter(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: isConnected ? AppColors.success : AppColors.warning,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () =>
            ref.read(tablesProvider.notifier).fetchTablesAndZones(),
        color: AppColors.primary,
        backgroundColor: AppColors.surface,
        child: Column(
          children: [
            // Search Bar & Summary Stats
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
              child: Column(
                children: [
                  // Search Field
                  TextField(
                    controller: _searchController,
                    onChanged: (val) =>
                        ref.read(tablesProvider.notifier).setSearchQuery(val),
                    decoration: InputDecoration(
                      hintText: 'Search table # or name...',
                      prefixIcon: const Icon(LucideIcons.search,
                          size: 18, color: AppColors.textMuted),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(LucideIcons.x,
                                  size: 16, color: AppColors.textMuted),
                              onPressed: () {
                                _searchController.clear();
                                ref
                                    .read(tablesProvider.notifier)
                                    .setSearchQuery('');
                              },
                            )
                          : null,
                      contentPadding:
                          const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    ),
                  ),
                  const SizedBox(height: 10),

                  // Occupancy Stats Row
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildStatChip(
                          'Available (${tablesState.availableCount})',
                          AppColors.tableAvailable,
                        ),
                        const SizedBox(width: 8),
                        _buildStatChip(
                          'Occupied (${tablesState.occupiedCount})',
                          AppColors.tableOccupied,
                        ),
                        const SizedBox(width: 8),
                        _buildStatChip(
                          'Bill Req (${tablesState.billRequestedCount})',
                          AppColors.tableBillRequested,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Zone Tabs Bar
            if (tablesState.zones.isNotEmpty)
              Container(
                height: 42,
                margin: const EdgeInsets.only(bottom: 6),
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: tablesState.zones.length + 1,
                  separatorBuilder: (_, __) => const SizedBox(width: 8),
                  itemBuilder: (ctx, idx) {
                    if (idx == 0) {
                      final isSelected = tablesState.selectedZoneId == null;
                      return _buildZonePill(
                        'All Zones',
                        isSelected: isSelected,
                        onTap: () => ref
                            .read(tablesProvider.notifier)
                            .setZoneFilter(null),
                      );
                    }
                    final zone = tablesState.zones[idx - 1];
                    final isSelected =
                        tablesState.selectedZoneId == zone.id;
                    return _buildZonePill(
                      zone.name,
                      isSelected: isSelected,
                      onTap: () => ref
                          .read(tablesProvider.notifier)
                          .setZoneFilter(zone.id),
                    );
                  },
                ),
              ),

            // Grid Content / Loading / Error
            Expanded(
              child: tablesState.isLoading
                  ? const Center(
                      child: CircularProgressIndicator(
                        valueColor:
                            AlwaysStoppedAnimation<Color>(AppColors.primary),
                      ),
                    )
                  : tablesState.errorMessage != null
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
                                  'Could not load tables',
                                  style: GoogleFonts.outfit(
                                    fontSize: 18,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  tablesState.errorMessage!,
                                  textAlign: TextAlign.center,
                                  style: GoogleFonts.inter(
                                    fontSize: 13,
                                    color: AppColors.textMuted,
                                  ),
                                ),
                                const SizedBox(height: 16),
                                ElevatedButton.icon(
                                  onPressed: () => ref
                                      .read(tablesProvider.notifier)
                                      .fetchTablesAndZones(),
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
                      : tablesState.filteredTables.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  const Icon(LucideIcons.layoutGrid,
                                      size: 48, color: AppColors.textMuted),
                                  const SizedBox(height: 12),
                                  Text(
                                    'No tables found',
                                    style: GoogleFonts.inter(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                      color: AppColors.textSecondary,
                                    ),
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Try changing your search or zone filter',
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
                          : GridView.builder(
                              padding: const EdgeInsets.fromLTRB(16, 8, 16, 80),
                              gridDelegate:
                                  const SliverGridDelegateWithFixedCrossAxisCount(
                                crossAxisCount: 2,
                                childAspectRatio: 1.15,
                                crossAxisSpacing: 12,
                                mainAxisSpacing: 12,
                              ),
                              itemCount: tablesState.filteredTables.length,
                              itemBuilder: (ctx, idx) {
                                final table = tablesState.filteredTables[idx];
                                return TableCard(
                                  table: table,
                                  onTap: () => _onTableSelected(table),
                                );
                              },
                            ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatChip(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        label,
        style: GoogleFonts.inter(
          fontSize: 11,
          fontWeight: FontWeight.bold,
          color: color,
        ),
      ),
    );
  }

  Widget _buildZonePill(
    String name, {
    required bool isSelected,
    required VoidCallback onTap,
  }) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(20),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
          decoration: BoxDecoration(
            color: isSelected ? AppColors.primary : AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isSelected ? AppColors.primary : AppColors.cardBorder,
            ),
          ),
          alignment: Alignment.center,
          child: Text(
            name,
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

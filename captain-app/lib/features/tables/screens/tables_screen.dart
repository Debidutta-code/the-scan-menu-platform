import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:fuzzy/fuzzy.dart';
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

class _CaptainZoneGroup {
  final String id;
  final String name;
  final List<TableModel> tables;

  _CaptainZoneGroup({
    required this.id,
    required this.name,
    required this.tables,
  });
}

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
    final authState = ref.read(authProvider);
    final hasOrdering = authState.activeRestaurant?.featureFlags.contains('ordering') ?? true;

    if (table.status == TableStatus.available) {
      if (!hasOrdering) return; // Feature disabled

      // Direct to take order
      ref.read(cartProvider.notifier).setTable(table);
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const TakeOrderScreen()),
      );
    } else {
      if (!hasOrdering) return; // Feature disabled

      // Show table orders bottom sheet
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        backgroundColor: Colors.transparent,
        builder: (_) => TableOrdersBottomSheet(table: table),
      );
    }
  }

  List<_CaptainZoneGroup> _getZoneGroups(TablesState state) {
    List<TableModel> matchingTables =
        state.tables.where((t) => t.isActive).toList();

    final query = state.searchQuery.trim();
    if (query.isNotEmpty) {
      final fuse = Fuzzy<TableModel>(
        matchingTables,
        options: FuzzyOptions(
          keys: [
            WeightedKey(
              name: 'displayName',
              getter: (TableModel t) => t.displayName,
              weight: 1.0,
            ),
            WeightedKey(
              name: 'tableNumber',
              getter: (TableModel t) => t.tableNumber,
              weight: 0.9,
            ),
            WeightedKey(
              name: 'status',
              getter: (TableModel t) {
                switch (t.status) {
                  case TableStatus.available:
                    return 'Available Free Open Vacant';
                  case TableStatus.occupied:
                    return 'Occupied Busy Seated';
                  case TableStatus.billRequested:
                    return 'Bill Requested Payment Check';
                  case TableStatus.reserved:
                    return 'Reserved Booked';
                }
              },
              weight: 0.6,
            ),
          ],
          threshold: 0.45,
        ),
      );
      final results = fuse.search(query);
      matchingTables = results.map((r) => r.item).toList();
    }

    final List<_CaptainZoneGroup> groups = [];
    final selectedZone = state.selectedZoneId;

    // 1. Group by defined zones
    for (final zone in state.zones) {
      if (selectedZone != null && selectedZone != zone.id) continue;
      final zoneTables =
          matchingTables.where((t) => t.zoneId == zone.id).toList();
      if (zoneTables.isNotEmpty) {
        groups.add(_CaptainZoneGroup(
          id: zone.id,
          name: zone.name,
          tables: zoneTables,
        ));
      }
    }

    // 2. Unassigned or general tables
    if (selectedZone == null || selectedZone == 'unassigned') {
      final unassigned = matchingTables.where((t) {
        return t.zoneId == null ||
            t.zoneId!.isEmpty ||
            !state.zones.any((z) => z.id == t.zoneId);
      }).toList();

      if (unassigned.isNotEmpty) {
        groups.add(_CaptainZoneGroup(
          id: 'unassigned',
          name: 'Main Dining / General',
          tables: unassigned,
        ));
      }
    }

    return groups;
  }

  @override
  Widget build(BuildContext context) {
    final tablesState = ref.watch(tablesProvider);
    final authState = ref.watch(authProvider);
    final socketService = SocketService();

    final restaurantName =
        authState.activeRestaurant?.name ?? 'ScanMenu Floor';
    final zoneGroups = _getZoneGroups(tablesState);

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
                ],
              ),
            ),

            // Zone Section Filter Chips Bar
            if (tablesState.zones.isNotEmpty)
              Container(
                height: 38,
                margin: const EdgeInsets.only(bottom: 6),
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 16),
                  itemCount: tablesState.zones.length + 1,
                  separatorBuilder: (_, __) => const SizedBox(width: 6),
                  itemBuilder: (ctx, idx) {
                    if (idx == 0) {
                      final isSelected = tablesState.selectedZoneId == null;
                      final totalActive = tablesState.tables
                          .where((t) => t.isActive)
                          .length;
                      return _buildZonePill(
                        'All Zones ($totalActive)',
                        isSelected: isSelected,
                        onTap: () => ref
                            .read(tablesProvider.notifier)
                            .setZoneFilter(null),
                      );
                    }
                    final zone = tablesState.zones[idx - 1];
                    final countInZone = tablesState.tables
                        .where((t) => t.isActive && t.zoneId == zone.id)
                        .length;
                    final isSelected =
                        tablesState.selectedZoneId == zone.id;
                    return _buildZonePill(
                      '${zone.name} ($countInZone)',
                      isSelected: isSelected,
                      onTap: () => ref
                          .read(tablesProvider.notifier)
                          .setZoneFilter(zone.id),
                    );
                  },
                ),
              ),

            // Sectioned Zone View Content / Loading / Error
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
                      : zoneGroups.isEmpty
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
                                    'Try changing your search or zone section filter',
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
                          : ListView.builder(
                              padding: const EdgeInsets.fromLTRB(16, 4, 16, 80),
                              itemCount: zoneGroups.length,
                              itemBuilder: (ctx, groupIdx) {
                                final group = zoneGroups[groupIdx];
                                final occupiedCount = group.tables
                                    .where((t) =>
                                        t.status == TableStatus.occupied ||
                                        t.status == TableStatus.billRequested)
                                    .length;
                                final availableCount =
                                    group.tables.length - occupiedCount;

                                return Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Zone Section Header
                                    Padding(
                                      padding: const EdgeInsets.only(
                                          top: 6, bottom: 8),
                                      child: Row(
                                        children: [
                                          Container(
                                            width: 8,
                                            height: 8,
                                            decoration: const BoxDecoration(
                                              color: AppColors.primary,
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            group.name,
                                            style: GoogleFonts.outfit(
                                              fontSize: 14,
                                              fontWeight: FontWeight.bold,
                                              color: AppColors.textPrimary,
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Container(
                                            padding: const EdgeInsets.symmetric(
                                                horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: AppColors.surfaceLight,
                                              borderRadius:
                                                  BorderRadius.circular(10),
                                              border: Border.all(
                                                  color: AppColors.cardBorder),
                                            ),
                                            child: Text(
                                              '${group.tables.length}',
                                              style: GoogleFonts.inter(
                                                fontSize: 10,
                                                fontWeight: FontWeight.bold,
                                                color: AppColors.textSecondary,
                                              ),
                                            ),
                                          ),
                                          const Spacer(),
                                          Text(
                                            '$occupiedCount busy • $availableCount free',
                                            style: GoogleFonts.inter(
                                              fontSize: 10.5,
                                              fontWeight: FontWeight.w600,
                                              color: AppColors.textMuted,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),

                                    // High-density Grid fitting 4 to 5 tables per row
                                    GridView.builder(
                                      shrinkWrap: true,
                                      physics:
                                          const NeverScrollableScrollPhysics(),
                                      gridDelegate:
                                          SliverGridDelegateWithFixedCrossAxisCount(
                                        crossAxisCount:
                                            MediaQuery.of(context).size.width >
                                                    600
                                                ? 5
                                                : 4,
                                        childAspectRatio: 0.90,
                                        crossAxisSpacing: 8,
                                        mainAxisSpacing: 8,
                                      ),
                                      itemCount: group.tables.length,
                                      itemBuilder: (ctx, idx) {
                                        final table = group.tables[idx];
                                        return TableCard(
                                          table: table,
                                          onTap: () => _onTableSelected(table),
                                        );
                                      },
                                    ),

                                    const SizedBox(height: 12),
                                  ],
                                );
                              },
                            ),
            ),
          ],
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
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
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
              fontSize: 11.5,
              fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
              color: isSelected ? AppColors.textDark : AppColors.textPrimary,
            ),
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../../order_creation/models/category_model.dart';
import '../../order_creation/models/menu_item_model.dart';
import '../../order_creation/providers/menu_provider.dart';

class MenuManagementScreen extends ConsumerStatefulWidget {
  const MenuManagementScreen({super.key});

  @override
  ConsumerState<MenuManagementScreen> createState() => _MenuManagementScreenState();
}

class _MenuManagementScreenState extends ConsumerState<MenuManagementScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onToggleAvailability(MenuItemModel item) async {
    HapticFeedback.mediumImpact();
    final targetState = !item.isAvailable;
    final success = await ref
        .read(menuProvider.notifier)
        .toggleItemAvailability(item.id, item.isAvailable);

    if (mounted) {
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                Icon(
                  targetState ? LucideIcons.circleCheck : LucideIcons.circleSlash2,
                  color: Colors.white,
                  size: 18,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    targetState
                        ? '${item.name} is now Available to diners'
                        : '${item.name} marked as 86\'d / Unavailable',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
            backgroundColor: targetState ? const Color(0xFF10B981) : AppColors.error,
            duration: const Duration(seconds: 2),
            behavior: SnackBarBehavior.floating,
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(LucideIcons.alertCircle, color: Colors.white, size: 18),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Failed to update ${item.name} status. Please check your connection.',
                    style: GoogleFonts.inter(fontWeight: FontWeight.w500),
                  ),
                ),
              ],
            ),
            backgroundColor: AppColors.error,
            duration: const Duration(seconds: 3),
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }

  void _showItemDetailsSheet(MenuItemModel item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _ItemDetailReadOnlySheet(
        item: item,
        onToggle: () => _onToggleAvailability(item),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final menuState = ref.watch(menuProvider);
    final allItems = menuState.menuItems;
    final filteredItems = menuState.filteredItems;

    final totalCount = allItems.length;
    final unavailableCount = allItems.where((i) => !i.isAvailable).length;
    final lowStockCount = allItems
        .where((i) => i.trackStock && i.stockQuantity <= i.lowStockThreshold)
        .length;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Menu & Availability',
              style: GoogleFonts.outfit(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            Text(
              'Floor 86ing & Item Availability',
              style: GoogleFonts.inter(
                fontSize: 12,
                color: AppColors.textSecondary,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(LucideIcons.refreshCw, size: 20),
            tooltip: 'Refresh Menu',
            onPressed: () {
              ref.read(menuProvider.notifier).fetchMenu();
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.read(menuProvider.notifier).fetchMenu(),
        color: AppColors.primary,
        child: Column(
          children: [
            // Top Summary Stats Strip
            _buildStatsStrip(
              totalCount: totalCount,
              unavailableCount: unavailableCount,
              lowStockCount: lowStockCount,
              currentFilter: menuState.selectedFilterTag,
            ),

            // Search and Filter Bar
            _buildSearchAndFilters(menuState),

            // Category Selector
            _buildCategorySelector(menuState.categories, menuState.selectedCategoryId),

            const SizedBox(height: 8),

            // Items List
            Expanded(
              child: menuState.isLoading
                  ? const Center(
                      child: CircularProgressIndicator(color: AppColors.primary),
                    )
                  : menuState.errorMessage != null
                      ? _buildErrorView(menuState.errorMessage!)
                      : filteredItems.isEmpty
                          ? _buildEmptyView()
                          : ListView.separated(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 12,
                              ),
                              itemCount: filteredItems.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 12),
                              itemBuilder: (context, index) {
                                final item = filteredItems[index];
                                return _buildMenuItemCard(item);
                              },
                            ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsStrip({
    required int totalCount,
    required int unavailableCount,
    required int lowStockCount,
    required String? currentFilter,
  }) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.cardBorder),
      ),
      child: Row(
        children: [
          _buildStatPill(
            label: 'Total Items',
            value: '$totalCount',
            color: AppColors.primary,
            icon: LucideIcons.utensils,
            isActive: currentFilter == null || currentFilter == 'ALL',
            onTap: () => ref.read(menuProvider.notifier).setFilterTag('ALL'),
          ),
          const SizedBox(width: 8),
          _buildStatPill(
            label: '86\'d / Off',
            value: '$unavailableCount',
            color: AppColors.error,
            icon: LucideIcons.eyeOff,
            isActive: currentFilter == 'UNAVAILABLE',
            onTap: () => ref.read(menuProvider.notifier).setFilterTag(
                  currentFilter == 'UNAVAILABLE' ? 'ALL' : 'UNAVAILABLE',
                ),
          ),
          const SizedBox(width: 8),
          _buildStatPill(
            label: 'Low Stock',
            value: '$lowStockCount',
            color: const Color(0xFFF59E0B),
            icon: LucideIcons.alertTriangle,
            isActive: currentFilter == 'LOW_STOCK',
            onTap: () => ref.read(menuProvider.notifier).setFilterTag(
                  currentFilter == 'LOW_STOCK' ? 'ALL' : 'LOW_STOCK',
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatPill({
    required String label,
    required String value,
    required Color color,
    required IconData icon,
    required bool isActive,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(10),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 8),
          decoration: BoxDecoration(
            color: isActive ? color.withValues(alpha: 0.12) : Colors.transparent,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: isActive ? color : Colors.transparent,
              width: 1,
            ),
          ),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(icon, size: 13, color: color),
                  const SizedBox(width: 4),
                  Text(
                    value,
                    style: GoogleFonts.outfit(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: color,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 2),
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 10,
                  fontWeight: FontWeight.w600,
                  color: AppColors.textSecondary,
                ),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSearchAndFilters(MenuState menuState) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: Column(
        children: [
          // Search Input
          Container(
            height: 44,
            decoration: BoxDecoration(
              color: AppColors.surface,
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: AppColors.cardBorder),
            ),
            child: TextField(
              controller: _searchController,
              onChanged: (val) {
                ref.read(menuProvider.notifier).setSearchQuery(val);
              },
              style: GoogleFonts.inter(fontSize: 14, color: AppColors.textPrimary),
              decoration: InputDecoration(
                hintText: 'Search dishes, ingredients...',
                hintStyle: GoogleFonts.inter(fontSize: 13, color: AppColors.textMuted),
                prefixIcon: const Icon(LucideIcons.search, size: 18, color: AppColors.textSecondary),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(LucideIcons.x, size: 16, color: AppColors.textMuted),
                        onPressed: () {
                          _searchController.clear();
                          ref.read(menuProvider.notifier).setSearchQuery('');
                        },
                      )
                    : null,
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 12),
              ),
            ),
          ),
          const SizedBox(height: 8),

          // Secondary Filter Tags
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children: [
                _buildFilterChip('ALL', 'All', menuState.selectedFilterTag),
                _buildFilterChip('VEG', 'Veg Only', menuState.selectedFilterTag),
                _buildFilterChip('NON_VEG', 'Non-Veg', menuState.selectedFilterTag),
                _buildFilterChip('UNAVAILABLE', '86\'d Only', menuState.selectedFilterTag),
                _buildFilterChip('LOW_STOCK', 'Low Stock', menuState.selectedFilterTag),
                _buildFilterChip('TOP_PICKS', 'Top Picks', menuState.selectedFilterTag),
                _buildFilterChip('SPECIALS', 'Chef Special', menuState.selectedFilterTag),
                _buildFilterChip('COMBOS', 'Combos', menuState.selectedFilterTag),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String tag, String label, String? currentTag) {
    final isSelected = (currentTag == null && tag == 'ALL') || currentTag == tag;
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: FilterChip(
        label: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? Colors.white : AppColors.textSecondary,
          ),
        ),
        selected: isSelected,
        onSelected: (_) {
          ref.read(menuProvider.notifier).setFilterTag(tag == 'ALL' ? null : tag);
        },
        backgroundColor: AppColors.surface,
        selectedColor: AppColors.primary,
        checkmarkColor: Colors.white,
        showCheckmark: false,
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(
            color: isSelected ? AppColors.primary : AppColors.cardBorder,
          ),
        ),
      ),
    );
  }

  Widget _buildCategorySelector(List<CategoryModel> categories, String? selectedCategoryId) {
    return Container(
      height: 38,
      margin: const EdgeInsets.only(top: 4),
      child: ListView.separated(
        padding: const EdgeInsets.symmetric(horizontal: 16),
        scrollDirection: Axis.horizontal,
        itemCount: categories.length + 1,
        separatorBuilder: (_, __) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          if (index == 0) {
            final isAll = selectedCategoryId == null;
            return ChoiceChip(
              label: Text(
                'All Categories',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: isAll ? FontWeight.bold : FontWeight.w500,
                  color: isAll ? Colors.white : AppColors.textPrimary,
                ),
              ),
              selected: isAll,
              onSelected: (_) => ref.read(menuProvider.notifier).selectCategory(null),
              backgroundColor: AppColors.surface,
              selectedColor: AppColors.primaryDark,
              showCheckmark: false,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
                side: BorderSide(
                  color: isAll ? AppColors.primaryDark : AppColors.cardBorder,
                ),
              ),
            );
          }

          final cat = categories[index - 1];
          final isSelected = selectedCategoryId == cat.id;

          return ChoiceChip(
            label: Text(
              cat.name,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? Colors.white : AppColors.textPrimary,
              ),
            ),
            selected: isSelected,
            onSelected: (_) => ref.read(menuProvider.notifier).selectCategory(cat.id),
            backgroundColor: AppColors.surface,
            selectedColor: AppColors.primaryDark,
            showCheckmark: false,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(10),
              side: BorderSide(
                color: isSelected ? AppColors.primaryDark : AppColors.cardBorder,
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildMenuItemCard(MenuItemModel item) {
    final isAvailable = item.isAvailable;
    final isLowStock = item.trackStock && item.stockQuantity <= item.lowStockThreshold;

    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: isAvailable ? AppColors.cardBorder : AppColors.error.withValues(alpha: 0.3),
          width: isAvailable ? 1 : 1.5,
        ),
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () => _showItemDetailsSheet(item),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Dish Image or Fallback
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Stack(
                    children: [
                      Container(
                        width: 76,
                        height: 76,
                        color: Colors.black.withValues(alpha: 0.05),
                        child: item.imageUrl != null && item.imageUrl!.isNotEmpty
                            ? Image.network(
                                item.imageUrl!,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => const Icon(
                                  LucideIcons.utensils,
                                  color: AppColors.textMuted,
                                  size: 28,
                                ),
                              )
                            : const Icon(
                                LucideIcons.utensils,
                                color: AppColors.textMuted,
                                size: 28,
                              ),
                      ),
                      if (!isAvailable)
                        Container(
                          width: 76,
                          height: 76,
                          color: Colors.black.withValues(alpha: 0.6),
                          child: const Center(
                            child: Icon(
                              LucideIcons.circleSlash2,
                              color: Colors.white,
                              size: 28,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),

                // Item Details
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Veg / Non-veg + Title
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            margin: const EdgeInsets.only(top: 2, right: 6),
                            padding: const EdgeInsets.all(2),
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: item.isVegetarian ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                width: 1.5,
                              ),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Icon(
                              Icons.circle,
                              size: 7,
                              color: item.isVegetarian ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                            ),
                          ),
                          Expanded(
                            child: Text(
                              item.name,
                              style: GoogleFonts.outfit(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: isAvailable ? AppColors.textPrimary : AppColors.textMuted,
                                decoration: isAvailable ? null : TextDecoration.lineThrough,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),

                      // Price & Size Info
                      Text(
                        item.pricingType == 'PORTION'
                            ? 'Multi-portion (${item.variants.length} sizes)'
                            : Formatters.formatCurrency(item.price),
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: isAvailable ? AppColors.primary : AppColors.textMuted,
                        ),
                      ),
                      const SizedBox(height: 6),

                      // Badges Row
                      Wrap(
                        spacing: 6,
                        runSpacing: 4,
                        children: [
                          // Status Badge
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: isAvailable
                                  ? const Color(0xFF10B981).withValues(alpha: 0.12)
                                  : AppColors.error.withValues(alpha: 0.12),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              isAvailable ? 'AVAILABLE' : '86\'D / OFF',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: isAvailable ? const Color(0xFF10B981) : AppColors.error,
                              ),
                            ),
                          ),

                          // Stock count badge
                          if (item.trackStock)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: isLowStock
                                    ? const Color(0xFFF59E0B).withValues(alpha: 0.15)
                                    : AppColors.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                isLowStock
                                    ? 'Stock: ${item.stockQuantity} (Low)'
                                    : 'Stock: ${item.stockQuantity}',
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: isLowStock ? const Color(0xFFD97706) : AppColors.primaryDark,
                                ),
                              ),
                            ),

                          if (item.isSpicy)
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 5, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.orange.withValues(alpha: 0.12),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                'Spicy',
                                style: GoogleFonts.inter(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.orange.shade800,
                                ),
                              ),
                            ),
                        ],
                      ),
                    ],
                  ),
                ),

                // Direct Availability Switch
                Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Switch(
                      value: isAvailable,
                      onChanged: (_) => _onToggleAvailability(item),
                      activeThumbColor: const Color(0xFF10B981),
                      activeTrackColor: const Color(0xFF10B981).withValues(alpha: 0.3),
                      inactiveThumbColor: AppColors.error,
                      inactiveTrackColor: AppColors.error.withValues(alpha: 0.25),
                    ),
                    Text(
                      isAvailable ? 'Live' : 'Off',
                      style: GoogleFonts.inter(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: isAvailable ? const Color(0xFF10B981) : AppColors.error,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildEmptyView() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(LucideIcons.searchX, size: 48, color: AppColors.textMuted),
          const SizedBox(height: 12),
          Text(
            'No matching dishes found',
            style: GoogleFonts.outfit(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Try adjusting your search query or filters',
            style: GoogleFonts.inter(
              fontSize: 13,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildErrorView(String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(LucideIcons.alertTriangle, size: 48, color: AppColors.error),
            const SizedBox(height: 12),
            Text(
              'Failed to load menu items',
              style: GoogleFonts.outfit(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              message,
              textAlign: TextAlign.center,
              style: GoogleFonts.inter(
                fontSize: 12,
                color: AppColors.textSecondary,
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton.icon(
              onPressed: () => ref.read(menuProvider.notifier).fetchMenu(),
              icon: const Icon(LucideIcons.refreshCw, size: 16),
              label: const Text('Try Again'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.primary,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ItemDetailReadOnlySheet extends StatelessWidget {
  final MenuItemModel item;
  final VoidCallback onToggle;

  const _ItemDetailReadOnlySheet({
    required this.item,
    required this.onToggle,
  });

  @override
  Widget build(BuildContext context) {
    final isAvailable = item.isAvailable;

    return Container(
      constraints: BoxConstraints(
        maxHeight: MediaQuery.of(context).size.height * 0.85,
      ),
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Drag Handle
          Container(
            margin: const EdgeInsets.symmetric(vertical: 12),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: AppColors.cardBorder,
              borderRadius: BorderRadius.circular(2),
            ),
          ),

          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(2),
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: item.isVegetarian ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                width: 1.5,
                              ),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Icon(
                              Icons.circle,
                              size: 8,
                              color: item.isVegetarian ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              item.name,
                              style: GoogleFonts.outfit(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textPrimary,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        Formatters.formatCurrency(item.price),
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primary,
                        ),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  icon: const Icon(LucideIcons.x, size: 20, color: AppColors.textSecondary),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),

          const Divider(height: 20),

          // Scrollable Content
          Expanded(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Image
                  if (item.imageUrl != null && item.imageUrl!.isNotEmpty) ...[
                    ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.network(
                        item.imageUrl!,
                        height: 180,
                        width: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (_, __, ___) => const SizedBox.shrink(),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Description
                  if (item.description != null && item.description!.isNotEmpty) ...[
                    Text(
                      'Description',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      item.description!,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: AppColors.textPrimary,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Inventory & Specs Grid
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    child: Column(
                      children: [
                        _buildSpecRow(
                          'Floor Availability',
                          isAvailable ? 'Available (Diners can order)' : '86\'d (Unavailable)',
                          isAvailable ? const Color(0xFF10B981) : AppColors.error,
                        ),
                        if (item.trackStock) ...[
                          const Divider(height: 16),
                          _buildSpecRow(
                            'Stock Quantity',
                            '${item.stockQuantity} portions remaining',
                            AppColors.textPrimary,
                          ),
                          const Divider(height: 16),
                          _buildSpecRow(
                            'Low Stock Alert Level',
                            '<= ${item.lowStockThreshold} portions',
                            const Color(0xFFF59E0B),
                          ),
                        ],
                        if (item.prepTimeMinutes > 0) ...[
                          const Divider(height: 16),
                          _buildSpecRow(
                            'Prep Time',
                            '~${item.prepTimeMinutes} mins',
                            AppColors.textPrimary,
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Variants (if portion-based)
                  if (item.variants.isNotEmpty) ...[
                    Text(
                      'Portions & Sizes',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    const SizedBox(height: 6),
                    ...item.variants.map((v) => Container(
                          margin: const EdgeInsets.only(bottom: 6),
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          decoration: BoxDecoration(
                            color: AppColors.background,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: AppColors.cardBorder),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                v.name,
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              Text(
                                Formatters.formatCurrency(v.price),
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primary,
                                ),
                              ),
                            ],
                          ),
                        )),
                    const SizedBox(height: 16),
                  ],

                  // Security note banner
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(
                        color: AppColors.primary.withValues(alpha: 0.2),
                      ),
                    ),
                    child: Row(
                      children: [
                        const Icon(LucideIcons.shieldCheck, size: 20, color: AppColors.primary),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Text(
                            'View-only floor access. Item ingredients, pricing, and recipes can only be edited by Managers on the Web Dashboard.',
                            style: GoogleFonts.inter(
                              fontSize: 11,
                              color: AppColors.textSecondary,
                              height: 1.3,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          ),

          // Bottom Action Bar with Big Toggle
          Container(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 24),
            decoration: const BoxDecoration(
              color: AppColors.surface,
              border: Border(
                top: BorderSide(color: AppColors.cardBorder),
              ),
            ),
            child: ElevatedButton.icon(
              onPressed: () {
                Navigator.of(context).pop();
                onToggle();
              },
              icon: Icon(
                isAvailable ? LucideIcons.circleSlash2 : LucideIcons.circleCheck,
                size: 20,
              ),
              label: Text(
                isAvailable ? 'Mark as 86\'d (Unavailable)' : 'Mark as Available to Diners',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                ),
              ),
              style: ElevatedButton.styleFrom(
                backgroundColor: isAvailable ? AppColors.error : const Color(0xFF10B981),
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 50),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSpecRow(String label, String value, Color valueColor) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 12,
            color: AppColors.textSecondary,
          ),
        ),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: valueColor,
          ),
        ),
      ],
    );
  }
}

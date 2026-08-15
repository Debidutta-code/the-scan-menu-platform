import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../models/menu_item_model.dart';
import '../providers/cart_provider.dart';
import '../providers/menu_provider.dart';
import '../widgets/addon_selection_sheet.dart';
import 'cart_review_screen.dart';

class TakeOrderScreen extends ConsumerStatefulWidget {
  const TakeOrderScreen({super.key});

  @override
  ConsumerState<TakeOrderScreen> createState() => _TakeOrderScreenState();
}

class _TakeOrderScreenState extends ConsumerState<TakeOrderScreen> {
  final _searchController = TextEditingController();

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _onItemTapped(MenuItemModel item) {
    if (!item.isAvailable) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('This item is currently 86ed / unavailable.')),
      );
      return;
    }

    if (item.addOns.isNotEmpty) {
      _showCustomizationSheet(item);
    } else {
      // 1-Tap direct add
      ref.read(cartProvider.notifier).addItem(item);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Added 1x ${item.name}'),
          duration: const Duration(milliseconds: 900),
        ),
      );
    }
  }

  void _showCustomizationSheet(MenuItemModel item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AddonSelectionSheet(
        item: item,
        onConfirm: (qty, addons, instructions) {
          ref.read(cartProvider.notifier).addItem(
                item,
                quantity: qty,
                selectedAddOns: addons,
                specialInstructions: instructions,
              );
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final menuState = ref.watch(menuProvider);
    final cartState = ref.watch(cartProvider);

    final tableName = cartState.selectedTable != null
        ? cartState.selectedTable!.displayName
        : 'Takeaway Order';

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Take Order',
              style: GoogleFonts.outfit(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            Text(
              tableName,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: AppColors.primary,
              ),
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // Search & Filter
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: TextField(
              controller: _searchController,
              onChanged: (val) =>
                  ref.read(menuProvider.notifier).setSearchQuery(val),
              decoration: InputDecoration(
                hintText: 'Search food or beverage...',
                prefixIcon: const Icon(LucideIcons.search,
                    size: 18, color: AppColors.textMuted),
                suffixIcon: _searchController.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(LucideIcons.x,
                            size: 16, color: AppColors.textMuted),
                        onPressed: () {
                          _searchController.clear();
                          ref.read(menuProvider.notifier).setSearchQuery('');
                        },
                      )
                    : null,
                contentPadding:
                    const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
            ),
          ),

          // Categories horizontal bar
          if (menuState.categories.isNotEmpty)
            Container(
              height: 42,
              margin: const EdgeInsets.only(bottom: 6),
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16),
                itemCount: menuState.categories.length + 1,
                separatorBuilder: (_, __) => const SizedBox(width: 8),
                itemBuilder: (ctx, idx) {
                  if (idx == 0) {
                    final isSelected = menuState.selectedCategoryId == null;
                    return _buildCategoryChip(
                      'All Items',
                      isSelected: isSelected,
                      onTap: () => ref
                          .read(menuProvider.notifier)
                          .selectCategory(null),
                    );
                  }
                  final cat = menuState.categories[idx - 1];
                  final isSelected = menuState.selectedCategoryId == cat.id;
                  return _buildCategoryChip(
                    cat.name,
                    isSelected: isSelected,
                    onTap: () => ref
                        .read(menuProvider.notifier)
                        .selectCategory(cat.id),
                  );
                },
              ),
            ),

          // Menu Items List
          Expanded(
            child: menuState.isLoading
                ? const Center(
                    child: CircularProgressIndicator(
                      valueColor:
                          AlwaysStoppedAnimation<Color>(AppColors.primary),
                    ),
                  )
                : menuState.filteredItems.isEmpty
                    ? Center(
                        child: Text(
                          'No menu items found',
                          style: GoogleFonts.inter(
                            color: AppColors.textSecondary,
                            fontSize: 15,
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
                        itemCount: menuState.filteredItems.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (ctx, idx) {
                          final item = menuState.filteredItems[idx];
                          return _buildMenuItemTile(item);
                        },
                      ),
          ),
        ],
      ),

      // Sticky Bottom Cart Bar
      bottomSheet: !cartState.isEmpty
          ? Container(
              color: AppColors.surface,
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
              child: SafeArea(
                child: Row(
                  children: [
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${cartState.totalItemCount} item${cartState.totalItemCount > 1 ? 's' : ''} in cart',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                        ),
                        Text(
                          Formatters.formatCurrency(cartState.subtotalInPaise),
                          style: GoogleFonts.outfit(
                            fontSize: 20,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),
                      ],
                    ),
                    const Spacer(),
                    ElevatedButton.icon(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) => const CartReviewScreen(),
                          ),
                        );
                      },
                      icon: const Icon(LucideIcons.arrowRight, size: 18),
                      label: const Text('Review Order'),
                      style: ElevatedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 20, vertical: 14),
                      ),
                    ),
                  ],
                ),
              ),
            )
          : null,
    );
  }

  Widget _buildMenuItemTile(MenuItemModel item) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(
          color: item.isAvailable
              ? AppColors.cardBorder
              : AppColors.error.withValues(alpha: 0.3),
        ),
      ),
      padding: const EdgeInsets.all(14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Veg / Non-Veg Indicator
          Padding(
            padding: const EdgeInsets.only(top: 3),
            child: Container(
              padding: const EdgeInsets.all(3),
              decoration: BoxDecoration(
                border: Border.all(
                  color: item.isVegetarian
                      ? AppColors.success
                      : AppColors.error,
                  width: 1.5,
                ),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Icon(
                LucideIcons.circle,
                size: 7,
                color: item.isVegetarian
                    ? AppColors.success
                    : AppColors.error,
              ),
            ),
          ),
          const SizedBox(width: 12),

          // Title, description, price
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.name,
                  style: GoogleFonts.outfit(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: item.isAvailable
                        ? AppColors.textPrimary
                        : AppColors.textMuted,
                  ),
                ),
                if (item.description != null && item.description!.isNotEmpty) ...[
                  const SizedBox(height: 3),
                  Text(
                    item.description!,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: AppColors.textMuted,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
                const SizedBox(height: 6),
                Text(
                  Formatters.formatCurrency(item.price),
                  style: GoogleFonts.outfit(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),

          // Add / Customize Button
          if (item.isAvailable)
            ElevatedButton(
              onPressed: () => _onItemTapped(item),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.surfaceLight,
                foregroundColor: AppColors.primary,
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                minimumSize: Size.zero,
              ),
              child: Text(
                item.addOns.isNotEmpty ? 'Custom' : '+ ADD',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                ),
              ),
            )
          else
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(
                '86ed',
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: AppColors.error,
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCategoryChip(
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

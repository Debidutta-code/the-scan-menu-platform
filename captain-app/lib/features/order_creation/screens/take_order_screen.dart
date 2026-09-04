import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../models/category_model.dart';
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

    _showCustomizationSheet(item);
  }

  void _onQuickIncrement(MenuItemModel item) {
    HapticFeedback.lightImpact();
    final isCustomizable = item.pricingType == 'PORTION' || item.variants.isNotEmpty || item.addOns.isNotEmpty;

    if (isCustomizable) {
      final configs = ref.read(cartProvider.notifier).getItemConfigurations(item.id);
      if (configs.isNotEmpty) {
        _showRepeatCustomizationSheet(item);
        return;
      }
      _showCustomizationSheet(item);
      return;
    }

    ref.read(cartProvider.notifier).incrementItem(item);
  }

  void _onQuickDecrement(MenuItemModel item) {
    HapticFeedback.lightImpact();
    final isCustomizable = item.pricingType == 'PORTION' || item.variants.isNotEmpty || item.addOns.isNotEmpty;

    if (isCustomizable) {
      final configs = ref.read(cartProvider.notifier).getItemConfigurations(item.id);
      if (configs.length > 1) {
        _showRemoveCustomizationSheet(item);
        return;
      } else if (configs.length == 1) {
        ref.read(cartProvider.notifier).decrementSpecificItem(configs.first);
        return;
      }
    }

    ref.read(cartProvider.notifier).decrementItem(item);
  }

  void _showRepeatCustomizationSheet(MenuItemModel item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Consumer(
        builder: (ctx, ref, _) {
          final configs = ref.watch(cartProvider).items.where((i) => i.item.id == item.id).toList();
          if (configs.isEmpty) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (Navigator.canPop(ctx)) Navigator.pop(ctx);
            });
          }
          return Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Repeat Customization?',
                      style: GoogleFonts.outfit(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(LucideIcons.x, size: 20),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                Text(
                  item.name,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(height: 16),
                Flexible(
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: configs.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, idx) {
                      final cfg = configs[idx];
                      return Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.cardBorder),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (cfg.selectedVariant != null)
                                    Text(
                                      'Portion: ${cfg.selectedVariant!.name}',
                                      style: GoogleFonts.inter(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: const Color(0xFF1D4ED8),
                                      ),
                                    ),
                                  if (cfg.selectedAddOns.isNotEmpty)
                                    Text(
                                      '+ ${cfg.selectedAddOns.map((a) => a.name).join(', ')}',
                                      style: GoogleFonts.inter(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  if (cfg.specialInstructions.isNotEmpty)
                                    Text(
                                      'Note: "${cfg.specialInstructions}"',
                                      style: GoogleFonts.inter(
                                        fontSize: 11,
                                        fontStyle: FontStyle.italic,
                                        color: AppColors.textMuted,
                                      ),
                                    ),
                                  const SizedBox(height: 2),
                                  Text(
                                    '${Formatters.formatCurrency(cfg.unitPrice)} (in cart: ${cfg.quantity})',
                                    style: GoogleFonts.outfit(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: AppColors.primary,
                                foregroundColor: AppColors.surface,
                                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              onPressed: () {
                                ref.read(cartProvider.notifier).incrementSpecificItem(cfg);
                                Navigator.pop(ctx);
                              },
                              child: const Text('Repeat (+1)'),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),
                OutlinedButton.icon(
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    side: const BorderSide(color: AppColors.primary),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  icon: const Icon(LucideIcons.plus, size: 16, color: AppColors.primary),
                  label: Text(
                    'Add New Customization',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primary,
                    ),
                  ),
                  onPressed: () {
                    Navigator.pop(ctx);
                    _showCustomizationSheet(item);
                  },
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showRemoveCustomizationSheet(MenuItemModel item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Consumer(
        builder: (ctx, ref, _) {
          final configs = ref.watch(cartProvider).items.where((i) => i.item.id == item.id).toList();
          if (configs.length <= 1) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (Navigator.canPop(ctx)) Navigator.pop(ctx);
            });
          }
          return Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            padding: const EdgeInsets.fromLTRB(20, 16, 20, 28),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(
                      color: Colors.grey.shade300,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Remove Customization',
                      style: GoogleFonts.outfit(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    IconButton(
                      icon: const Icon(LucideIcons.x, size: 20),
                      onPressed: () => Navigator.pop(ctx),
                    ),
                  ],
                ),
                Text(
                  'Select which customization to decrement or remove:',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    color: AppColors.textMuted,
                  ),
                ),
                const SizedBox(height: 16),
                Flexible(
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: configs.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 10),
                    itemBuilder: (context, idx) {
                      final cfg = configs[idx];
                      return Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppColors.surface,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppColors.cardBorder),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  if (cfg.selectedVariant != null)
                                    Text(
                                      'Portion: ${cfg.selectedVariant!.name}',
                                      style: GoogleFonts.inter(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                        color: const Color(0xFF1D4ED8),
                                      ),
                                    ),
                                  if (cfg.selectedAddOns.isNotEmpty)
                                    Text(
                                      '+ ${cfg.selectedAddOns.map((a) => a.name).join(', ')}',
                                      style: GoogleFonts.inter(
                                        fontSize: 12,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.primary,
                                      ),
                                    ),
                                  if (cfg.specialInstructions.isNotEmpty)
                                    Text(
                                      'Note: "${cfg.specialInstructions}"',
                                      style: GoogleFonts.inter(
                                        fontSize: 11,
                                        fontStyle: FontStyle.italic,
                                        color: AppColors.textMuted,
                                      ),
                                    ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Qty: ${cfg.quantity} • ${Formatters.formatCurrency(cfg.itemTotal)}',
                                    style: GoogleFonts.outfit(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.textPrimary,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(LucideIcons.minus, color: AppColors.error),
                              onPressed: () {
                                ref.read(cartProvider.notifier).decrementSpecificItem(cfg);
                              },
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.surfaceLight,
                    foregroundColor: AppColors.textPrimary,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Done'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  void _showCustomizationSheet(MenuItemModel item) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (_) => AddonSelectionSheet(
        item: item,
        onConfirm: (qty, variant, addons, instructions) {
          ref.read(cartProvider.notifier).addItem(
                item,
                selectedVariant: variant,
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
              height: 38,
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
                      'All Categories',
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

          // Dietary & Highlights quick filter bar
          Container(
            height: 34,
            margin: const EdgeInsets.only(bottom: 8),
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: [
                _buildQuickFilterChip(
                  label: 'All Items',
                  tag: 'ALL',
                  isSelected: menuState.selectedFilterTag == null || menuState.selectedFilterTag == 'ALL',
                  icon: LucideIcons.layers,
                ),
                const SizedBox(width: 6),
                _buildQuickFilterChip(
                  label: 'Veg',
                  tag: 'VEG',
                  isSelected: menuState.selectedFilterTag == 'VEG',
                  color: AppColors.success,
                  icon: LucideIcons.leaf,
                ),
                const SizedBox(width: 6),
                _buildQuickFilterChip(
                  label: 'Non-Veg',
                  tag: 'NON_VEG',
                  isSelected: menuState.selectedFilterTag == 'NON_VEG',
                  color: AppColors.error,
                  icon: LucideIcons.drumstick,
                ),
                const SizedBox(width: 6),
                _buildQuickFilterChip(
                  label: 'Top Picks',
                  tag: 'TOP_PICKS',
                  isSelected: menuState.selectedFilterTag == 'TOP_PICKS',
                  color: const Color(0xFFD97706),
                  icon: LucideIcons.star,
                ),
                const SizedBox(width: 6),
                _buildQuickFilterChip(
                  label: "Chef's Specials",
                  tag: 'SPECIALS',
                  isSelected: menuState.selectedFilterTag == 'SPECIALS',
                  color: const Color(0xFFB45309),
                  icon: LucideIcons.sparkles,
                ),
                const SizedBox(width: 6),
                _buildQuickFilterChip(
                  label: 'Combo Deals',
                  tag: 'COMBOS',
                  isSelected: menuState.selectedFilterTag == 'COMBOS',
                  color: const Color(0xFF7E22CE),
                  icon: LucideIcons.packageCheck,
                ),
              ],
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
                    : _buildGroupedMenuList(
                        menuState.filteredItems,
                        menuState.categories,
                        cartState,
                      ),
          ),
        ],
      ),

      // Sticky Bottom Cart Bar
      bottomSheet: !cartState.isEmpty
          ? Container(
              decoration: const BoxDecoration(
                color: AppColors.surface,
                border: Border(
                  top: BorderSide(color: AppColors.cardBorder, width: 1),
                ),
              ),
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

  Widget _buildGroupedMenuList(
    List<MenuItemModel> items,
    List<CategoryModel> categories,
    CartState cartState,
  ) {
    final Map<String, List<MenuItemModel>> categoryMap = {};
    for (final cat in categories) {
      categoryMap[cat.name] = [];
    }

    final List<MenuItemModel> uncategorized = [];

    for (final item in items) {
      CategoryModel? matchedCat;
      for (final cat in categories) {
        if (cat.id == item.categoryId ||
            (item.categoryId.isNotEmpty &&
                (cat.id.contains(item.categoryId) ||
                    item.categoryId.contains(cat.id)))) {
          matchedCat = cat;
          break;
        }
      }
      if (matchedCat != null) {
        categoryMap.putIfAbsent(matchedCat.name, () => []).add(item);
      } else {
        uncategorized.add(item);
      }
    }

    if (uncategorized.isNotEmpty) {
      categoryMap['Other Items'] = uncategorized;
    }

    final activeCategories =
        categoryMap.entries.where((e) => e.value.isNotEmpty).toList();

    return ListView.builder(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 100),
      itemCount: activeCategories.length,
      itemBuilder: (ctx, catIdx) {
        final catEntry = activeCategories[catIdx];
        final catName = catEntry.key;
        final catItems = catEntry.value;

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: EdgeInsets.only(top: catIdx == 0 ? 4 : 18, bottom: 10),
              child: Row(
                children: [
                  Container(
                    width: 4,
                    height: 16,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(2),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    catName,
                    style: GoogleFonts.outfit(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 7, vertical: 1.5),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Text(
                      '${catItems.length}',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Divider(color: AppColors.cardBorder, height: 1),
                  ),
                ],
              ),
            ),
            ListView.separated(
              physics: const NeverScrollableScrollPhysics(),
              shrinkWrap: true,
              itemCount: catItems.length,
              separatorBuilder: (_, __) => const SizedBox(height: 10),
              itemBuilder: (ctx, itemIdx) {
                final item = catItems[itemIdx];
                final qty = cartState.getItemQuantity(item.id);
                return _buildMenuItemTile(item, qty);
              },
            ),
          ],
        );
      },
    );
  }

  Widget _buildMenuItemTile(MenuItemModel item, int quantity) {
    final isSelected = quantity > 0;
    final hasDiscount = item.originalPrice != null && item.originalPrice! > item.price;
    final savingsPaise = hasDiscount ? (item.originalPrice! - item.price) : 0;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: item.isAvailable ? () => _onItemTapped(item) : null,
        borderRadius: BorderRadius.circular(16),
        child: Container(
          decoration: BoxDecoration(
            color: isSelected ? const Color(0xFFFFFBEB) : AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: !item.isAvailable
                  ? AppColors.error.withValues(alpha: 0.3)
                  : isSelected
                      ? AppColors.primary
                      : AppColors.cardBorder,
              width: isSelected ? 1.5 : 1,
            ),
            boxShadow: isSelected
                ? [
                    BoxShadow(
                      color: AppColors.primary.withValues(alpha: 0.1),
                      blurRadius: 8,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
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

              // Title, badges, description, combo breakdown, price, custom badge
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Badges row: Special, Top Pick, Combo
                    if (item.isChefsSpecial || item.isTopPick || item.isCombo)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Wrap(
                          spacing: 6,
                          runSpacing: 4,
                          children: [
                            if (item.isChefsSpecial)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFEF3C7),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(
                                      color: const Color(0xFFFDE68A)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(LucideIcons.sparkles,
                                        size: 10, color: Color(0xFFB45309)),
                                    const SizedBox(width: 3),
                                    Text(
                                      "Chef's Special",
                                      style: GoogleFonts.inter(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: const Color(0xFFB45309),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            if (item.isTopPick)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFFF7ED),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(
                                      color: const Color(0xFFFFEDD5)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(LucideIcons.star,
                                        size: 10, color: Color(0xFFD97706)),
                                    const SizedBox(width: 3),
                                    Text(
                                      'Top Pick',
                                      style: GoogleFonts.inter(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: const Color(0xFFD97706),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            if (item.isCombo)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF3E8FF),
                                  borderRadius: BorderRadius.circular(6),
                                  border: Border.all(
                                      color: const Color(0xFFE9D5FF)),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    const Icon(LucideIcons.packageCheck,
                                        size: 10, color: Color(0xFF7E22CE)),
                                    const SizedBox(width: 3),
                                    Text(
                                      'Combo Bundle',
                                      style: GoogleFonts.inter(
                                        fontSize: 10,
                                        fontWeight: FontWeight.bold,
                                        color: const Color(0xFF7E22CE),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                          ],
                        ),
                      ),

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
                    if (item.description != null &&
                        item.description!.isNotEmpty) ...[
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

                    // Combo Contents Pill Breakdown
                    if (item.isCombo && item.comboItems.isNotEmpty)
                      Container(
                        margin: const EdgeInsets.only(top: 6),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFAF5FF),
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFFF3E8FF)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Includes:',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF7E22CE),
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              item.comboItems
                                  .map((c) => '${c.quantity}x ${c.name}')
                                  .join(' • '),
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w500,
                                color: const Color(0xFF581C87),
                              ),
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),

                    const SizedBox(height: 6),
                    Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 6,
                      runSpacing: 4,
                      children: [
                        // Current Selling Price
                        Text(
                          item.pricingType == 'PORTION' && item.variants.isNotEmpty
                              ? 'From ${Formatters.formatCurrency(item.variants.map((v) => v.price).reduce((a, b) => a < b ? a : b))}'
                              : Formatters.formatCurrency(item.price),
                          style: GoogleFonts.outfit(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: AppColors.primary,
                          ),
                        ),

                        // Original Price MRP (Crossed out)
                        if (hasDiscount)
                          Text(
                            Formatters.formatCurrency(item.originalPrice!),
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              decoration: TextDecoration.lineThrough,
                              color: AppColors.textMuted,
                            ),
                          ),

                        // Savings Badge
                        if (hasDiscount)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 5, vertical: 1.5),
                            decoration: BoxDecoration(
                              color: const Color(0xFFDCFCE7),
                              borderRadius: BorderRadius.circular(4),
                              border: Border.all(color: const Color(0xFFBBF7D0)),
                            ),
                            child: Text(
                              'Save ${Formatters.formatCurrency(savingsPaise)}',
                              style: GoogleFonts.inter(
                                fontSize: 9.5,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF15803D),
                              ),
                            ),
                          ),

                        if (item.pricingType == 'PORTION' && item.variants.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFEFF6FF),
                              borderRadius: BorderRadius.circular(6),
                              border:
                                  Border.all(color: const Color(0xFFBFDBFE)),
                            ),
                            child: Text(
                              '${item.variants.length} Sizes',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF1D4ED8),
                              ),
                            ),
                          ),
                        if (item.addOns.isNotEmpty)
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: const Color(0xFFFEF3C7),
                              borderRadius: BorderRadius.circular(6),
                              border:
                                  Border.all(color: const Color(0xFFFDE68A)),
                            ),
                            child: Text(
                              'Custom',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFFB45309),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 10),

              // Add / Stepper / 86ed
              if (!item.isAvailable)
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
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
                )
              else if (quantity > 0)
                // - [qty] + Stepper Control
                Container(
                  height: 38,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF3C7),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFFCD34D)),
                  ),
                  padding: const EdgeInsets.all(3),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      InkWell(
                        onTap: () => _onQuickDecrement(item),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: const Color(0xFFFDE68A)),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.04),
                                blurRadius: 2,
                                offset: const Offset(0, 1),
                              ),
                            ],
                          ),
                          alignment: Alignment.center,
                          child: const Icon(
                            LucideIcons.minus,
                            size: 14,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                        child: Text(
                          '$quantity',
                          style: GoogleFonts.outfit(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                      InkWell(
                        onTap: () => _onQuickIncrement(item),
                        borderRadius: BorderRadius.circular(8),
                        child: Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(
                            color: AppColors.primary,
                            borderRadius: BorderRadius.circular(8),
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.primary.withValues(alpha: 0.3),
                                blurRadius: 4,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          alignment: Alignment.center,
                          child: const Icon(
                            LucideIcons.plus,
                            size: 14,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                )
              else
                // Simple + Button
                InkWell(
                  onTap: () => _onQuickIncrement(item),
                  borderRadius: BorderRadius.circular(12),
                  child: Container(
                    width: 38,
                    height: 38,
                    decoration: BoxDecoration(
                      color: AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: AppColors.cardBorder),
                    ),
                    alignment: Alignment.center,
                    child: const Icon(
                      LucideIcons.plus,
                      size: 18,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickFilterChip({
    required String label,
    required String tag,
    required bool isSelected,
    Color? color,
    IconData? icon,
  }) {
    final activeColor = color ?? AppColors.primary;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: () => ref.read(menuProvider.notifier).setFilterTag(tag),
        borderRadius: BorderRadius.circular(16),
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: isSelected
                ? activeColor.withValues(alpha: 0.15)
                : AppColors.surface,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(
              color: isSelected ? activeColor : AppColors.cardBorder,
              width: isSelected ? 1.5 : 1,
            ),
          ),
          alignment: Alignment.center,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (icon != null) ...[
                Icon(
                  icon,
                  size: 12,
                  color: isSelected ? activeColor : AppColors.textSecondary,
                ),
                const SizedBox(width: 4),
              ],
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                  color: isSelected ? activeColor : AppColors.textSecondary,
                ),
              ),
            ],
          ),
        ),
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

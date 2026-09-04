import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../models/menu_item_model.dart';

class AddonSelectionSheet extends StatefulWidget {
  final MenuItemModel item;
  final Function(int quantity, MenuItemVariantModel? variant, List<AddOnModel> selectedAddons, String instructions) onConfirm;

  const AddonSelectionSheet({
    super.key,
    required this.item,
    required this.onConfirm,
  });

  @override
  State<AddonSelectionSheet> createState() => _AddonSelectionSheetState();
}

class _AddonSelectionSheetState extends State<AddonSelectionSheet> {
  int _quantity = 1;
  MenuItemVariantModel? _selectedVariant;
  final Set<AddOnModel> _selectedAddons = {};
  final _instructionsController = TextEditingController();

  @override
  void initState() {
    super.initState();
    if (widget.item.variants.isNotEmpty) {
      _selectedVariant = widget.item.variants.firstWhere(
        (v) => v.isDefault,
        orElse: () => widget.item.variants.first,
      );
    }
  }

  @override
  void dispose() {
    _instructionsController.dispose();
    super.dispose();
  }

  int get _calculatedUnitPrice {
    int base = _selectedVariant != null ? _selectedVariant!.price : widget.item.price;
    for (final addon in _selectedAddons) {
      base += addon.priceDelta;
    }
    return base;
  }

  int get _calculatedTotalPrice => _calculatedUnitPrice * _quantity;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      padding: EdgeInsets.fromLTRB(
        20,
        16,
        20,
        MediaQuery.of(context).viewInsets.bottom + 20,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Drag handle
            Center(
              child: Container(
                width: 40,
                height: 4,
                decoration: BoxDecoration(
                  color: AppColors.surfaceLight,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Item Title & Price
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  margin: const EdgeInsets.only(top: 2),
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    border: Border.all(
                      color: widget.item.isVegetarian
                          ? AppColors.success
                          : AppColors.error,
                      width: 1.5,
                    ),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Icon(
                    LucideIcons.circle,
                    size: 8,
                    color: widget.item.isVegetarian
                        ? AppColors.success
                        : AppColors.error,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Badges row: Special, Top Pick, Combo
                      if (widget.item.isChefsSpecial || widget.item.isTopPick || widget.item.isCombo)
                        Padding(
                          padding: const EdgeInsets.only(bottom: 6),
                          child: Wrap(
                            spacing: 6,
                            runSpacing: 4,
                            children: [
                              if (widget.item.isChefsSpecial)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFEF3C7),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: const Color(0xFFFDE68A)),
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
                              if (widget.item.isTopPick)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFFF7ED),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: const Color(0xFFFFEDD5)),
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
                              if (widget.item.isCombo)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFF3E8FF),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: const Color(0xFFE9D5FF)),
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
                        widget.item.name,
                        style: GoogleFonts.outfit(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      if (widget.item.description != null &&
                          widget.item.description!.isNotEmpty)
                        Padding(
                          padding: const EdgeInsets.only(top: 4),
                          child: Text(
                            widget.item.description!,
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              color: AppColors.textSecondary,
                              height: 1.35,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                const SizedBox(width: 10),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Text(
                      Formatters.formatCurrency(_calculatedUnitPrice),
                      style: GoogleFonts.outfit(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                    if (widget.item.originalPrice != null &&
                        widget.item.originalPrice! > _calculatedUnitPrice) ...[
                      const SizedBox(height: 2),
                      Text(
                        Formatters.formatCurrency(widget.item.originalPrice!),
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          decoration: TextDecoration.lineThrough,
                          color: AppColors.textMuted,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 5, vertical: 1.5),
                        decoration: BoxDecoration(
                          color: const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(color: const Color(0xFFBBF7D0)),
                        ),
                        child: Text(
                          'Save ${Formatters.formatCurrency(widget.item.originalPrice! - _calculatedUnitPrice)}',
                          style: GoogleFonts.inter(
                            fontSize: 9.5,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF15803D),
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ),

            // Combo Bundled Items List
            if (widget.item.isCombo && widget.item.comboItems.isNotEmpty) ...[
              const SizedBox(height: 14),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFFAF5FF),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE9D5FF)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(LucideIcons.packageCheck,
                            size: 15, color: Color(0xFF7E22CE)),
                        const SizedBox(width: 6),
                        Text(
                          'Combo Bundle Includes (${widget.item.comboItems.length} items):',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: const Color(0xFF7E22CE),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ...widget.item.comboItems.map((cItem) => Padding(
                          padding: const EdgeInsets.symmetric(vertical: 3.5),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Row(
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                          horizontal: 5, vertical: 1),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFF7E22CE),
                                        borderRadius: BorderRadius.circular(4),
                                      ),
                                      child: Text(
                                        '${cItem.quantity}x',
                                        style: GoogleFonts.inter(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: Colors.white,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(width: 8),
                                    Expanded(
                                      child: Text(
                                        cItem.name,
                                        style: GoogleFonts.inter(
                                          fontSize: 12.5,
                                          fontWeight: FontWeight.w600,
                                          color: const Color(0xFF581C87),
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (cItem.categoryName != null)
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(
                                        color: const Color(0xFFE9D5FF)),
                                  ),
                                  child: Text(
                                    cItem.categoryName!,
                                    style: GoogleFonts.inter(
                                      fontSize: 10,
                                      fontWeight: FontWeight.w500,
                                      color: const Color(0xFF7E22CE),
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        )),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),

            // Portion / Size Selector
            if (widget.item.variants.isNotEmpty) ...[
              const Divider(),
              const SizedBox(height: 8),
              Text(
                'Select Portion / Size',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: widget.item.variants.map((v) {
                  final isSelected = _selectedVariant?.name == v.name;
                  return ChoiceChip(
                    label: Text('${v.name} • ${Formatters.formatCurrency(v.price)}'),
                    selected: isSelected,
                    selectedColor: AppColors.primary,
                    backgroundColor: AppColors.surfaceLight,
                    labelStyle: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: isSelected ? AppColors.textDark : AppColors.textPrimary,
                    ),
                    onSelected: (selected) {
                      if (selected) {
                        setState(() => _selectedVariant = v);
                      }
                    },
                  );
                }).toList(),
              ),
              const SizedBox(height: 12),
            ],

            // Add-ons Section
            if (widget.item.addOns.isNotEmpty) ...[
              const Divider(),
              const SizedBox(height: 8),
              Text(
                'Customize / Add-Ons',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 10),
              ...widget.item.addOns.map((addon) {
                final isChecked = _selectedAddons.contains(addon);
                return CheckboxListTile(
                  contentPadding: EdgeInsets.zero,
                  activeColor: AppColors.primary,
                  checkColor: AppColors.textDark,
                  title: Text(
                    addon.name,
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  secondary: addon.priceDelta > 0
                      ? Text(
                          '+${Formatters.formatCurrency(addon.priceDelta)}',
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: AppColors.primary,
                          ),
                        )
                      : null,
                  value: isChecked,
                  onChanged: (val) {
                    setState(() {
                      if (val == true) {
                        _selectedAddons.add(addon);
                      } else {
                        _selectedAddons.remove(addon);
                      }
                    });
                  },
                );
              }),
            ],

            const SizedBox(height: 12),
            const Divider(),
            const SizedBox(height: 8),

            // Cooking instructions
            Text(
              'Kitchen Cooking Notes',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _instructionsController,
              maxLines: 2,
              style: const TextStyle(color: AppColors.textPrimary, fontSize: 13),
              decoration: const InputDecoration(
                hintText: 'e.g. Less spicy, no onions, extra crispy...',
                contentPadding:
                    EdgeInsets.symmetric(horizontal: 14, vertical: 12),
              ),
            ),
            const SizedBox(height: 20),

            // Quantity Selector & Add Button
            Row(
              children: [
                // Quantity Stepper
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.surfaceLight,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(LucideIcons.minus,
                            size: 18, color: AppColors.textPrimary),
                        onPressed: _quantity > 1
                            ? () => setState(() => _quantity--)
                            : null,
                      ),
                      Text(
                        '$_quantity',
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(LucideIcons.plus,
                            size: 18, color: AppColors.textPrimary),
                        onPressed: () => setState(() => _quantity++),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 14),

                // Add to Cart Button
                Expanded(
                  child: SizedBox(
                    height: 48,
                    child: ElevatedButton(
                      onPressed: () {
                        widget.onConfirm(
                          _quantity,
                          _selectedVariant,
                          _selectedAddons.toList(),
                          _instructionsController.text,
                        );
                        Navigator.of(context).pop();
                      },
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Add to Order'),
                          Text(
                            Formatters.formatCurrency(_calculatedTotalPrice),
                            style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

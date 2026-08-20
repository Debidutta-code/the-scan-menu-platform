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
                        Text(
                          widget.item.description!,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: AppColors.textSecondary,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                    ],
                  ),
                ),
                Text(
                  Formatters.formatCurrency(_calculatedUnitPrice),
                  style: GoogleFonts.outfit(
                    fontSize: 17,
                    fontWeight: FontWeight.bold,
                    color: AppColors.primary,
                  ),
                ),
              ],
            ),
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

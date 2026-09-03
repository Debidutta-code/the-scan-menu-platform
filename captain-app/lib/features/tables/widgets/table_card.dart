import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/utils/formatters.dart';
import '../models/table_model.dart';

class TableCard extends StatelessWidget {
  final TableModel table;
  final VoidCallback onTap;

  const TableCard({
    super.key,
    required this.table,
    required this.onTap,
  });

  Color _getStatusColor() {
    switch (table.status) {
      case TableStatus.occupied:
        return AppColors.tableOccupied;
      case TableStatus.billRequested:
        return AppColors.tableBillRequested;
      case TableStatus.reserved:
        return AppColors.tableReserved;
      case TableStatus.available:
        return AppColors.tableAvailable;
    }
  }

  String _getStatusShortLabel() {
    switch (table.status) {
      case TableStatus.occupied:
        return 'BUSY';
      case TableStatus.billRequested:
        return 'BILL';
      case TableStatus.reserved:
        return 'RSVD';
      case TableStatus.available:
        return 'FREE';
    }
  }

  @override
  Widget build(BuildContext context) {
    final statusColor = _getStatusColor();
    final isOccupied = table.status == TableStatus.occupied ||
        table.status == TableStatus.billRequested;

    final displayNameClean = table.displayName.trim();
    final hasCustomName = displayNameClean.isNotEmpty &&
        displayNameClean.toLowerCase() !=
            'table ${table.tableNumber}'.toLowerCase() &&
        displayNameClean != table.tableNumber;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Container(
          decoration: BoxDecoration(
            color: isOccupied
                ? statusColor.withValues(alpha: 0.08)
                : AppColors.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isOccupied
                  ? statusColor.withValues(alpha: 0.6)
                  : AppColors.cardBorder,
              width: isOccupied ? 1.5 : 1,
            ),
            boxShadow: isOccupied
                ? [
                    BoxShadow(
                      color: statusColor.withValues(alpha: 0.12),
                      blurRadius: 6,
                      offset: const Offset(0, 2),
                    ),
                  ]
                : null,
          ),
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              // Top Row: Table Number Badge + Micro Status Pill
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  // Table Number Badge
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 5, vertical: 1.5),
                    decoration: BoxDecoration(
                      color: isOccupied ? statusColor : AppColors.surfaceLight,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      table.tableNumber,
                      style: GoogleFonts.outfit(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: isOccupied ? Colors.white : AppColors.textPrimary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),

                  // Mini Status Label
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      _getStatusShortLabel(),
                      style: GoogleFonts.inter(
                        fontSize: 8,
                        fontWeight: FontWeight.w900,
                        color: statusColor,
                      ),
                    ),
                  ),
                ],
              ),

              // Middle: Full Display Name (allows up to 2 lines so full table names are shown without truncation)
              if (hasCustomName)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 1),
                  child: Text(
                    displayNameClean,
                    style: GoogleFonts.inter(
                      fontSize: 9,
                      height: 1.15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),

              // Bottom Row: Active order count & total amount if occupied
              if (isOccupied)
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    if (table.activeOrderCount > 0)
                      Text(
                        '${table.activeOrderCount} ord',
                        style: GoogleFonts.inter(
                          fontSize: 9,
                          fontWeight: FontWeight.bold,
                          color: statusColor,
                        ),
                      )
                    else if (table.seatedAt != null)
                      Text(
                        Formatters.formatTimeAgo(table.seatedAt!),
                        style: GoogleFonts.inter(
                          fontSize: 8.5,
                          color: AppColors.textMuted,
                        ),
                      ),
                    if (table.totalAmountInPaise > 0)
                      Expanded(
                        child: Text(
                          Formatters.formatCurrency(table.totalAmountInPaise),
                          style: GoogleFonts.outfit(
                            fontSize: 9.5,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                          textAlign: TextAlign.end,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                  ],
                ),
            ],
          ),
        ),
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/widgets/quick_reload_button.dart';
import '../providers/waiter_calls_provider.dart';
import '../widgets/waiter_call_card.dart';

class WaiterCallsScreen extends ConsumerWidget {
  const WaiterCallsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final callsState = ref.watch(waiterCallsProvider);

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Floor Assistance',
              style: GoogleFonts.outfit(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            Text(
              'Live Customer Call Requests',
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
            ref.read(waiterCallsProvider.notifier).fetchWaiterCalls(),
        color: AppColors.primary,
        backgroundColor: AppColors.surface,
        child: callsState.isLoading
            ? const Center(
                child: CircularProgressIndicator(
                  valueColor: AlwaysStoppedAnimation<Color>(AppColors.primary),
                ),
              )
            : callsState.errorMessage != null
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
                            'Could not load waiter calls',
                            style: GoogleFonts.outfit(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textPrimary,
                            ),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            callsState.errorMessage!,
                            textAlign: TextAlign.center,
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              color: AppColors.textMuted,
                            ),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton.icon(
                            onPressed: () => ref
                                .read(waiterCallsProvider.notifier)
                                .fetchWaiterCalls(),
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
                : callsState.activeCalls.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(32),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Container(
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  color: AppColors.success.withValues(alpha: 0.12),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  LucideIcons.checkCircle2,
                                  size: 48,
                                  color: AppColors.success,
                                ),
                              ),
                              const SizedBox(height: 20),
                              Text(
                                'All tables satisfied',
                                style: GoogleFonts.outfit(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textPrimary,
                                ),
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'No pending waiter calls right now.\nNew calls from tables will chime here instantly.',
                                textAlign: TextAlign.center,
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  color: AppColors.textSecondary,
                                  height: 1.4,
                                ),
                              ),
                              const SizedBox(height: 16),
                              const QuickReloadButton(showLabel: true),
                            ],
                          ),
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 12, 16, 30),
                        itemCount: callsState.activeCalls.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 12),
                        itemBuilder: (ctx, idx) {
                          final call = callsState.activeCalls[idx];
                          final isPending = callsState.pendingActionCallIds
                              .contains(call.id);

                          return WaiterCallCard(
                            call: call,
                            isPendingAction: isPending,
                            onAcknowledge: () {
                              ref
                                  .read(waiterCallsProvider.notifier)
                                  .acknowledgeCall(call.id);
                            },
                            onResolve: () {
                              ref
                                  .read(waiterCallsProvider.notifier)
                                  .resolveCall(call.id);
                            },
                          );
                        },
                      ),
      ),
    );
  }
}

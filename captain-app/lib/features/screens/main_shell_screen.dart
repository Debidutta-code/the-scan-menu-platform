import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:badges/badges.dart' as badges;
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../core/constants/app_colors.dart';
import '../../core/notifications/notification_permission_dialog.dart';
import '../../core/notifications/push_notification_service.dart';
import '../active_orders/providers/active_orders_provider.dart';
import '../active_orders/screens/active_orders_screen.dart';
import '../profile/screens/profile_screen.dart';
import '../tables/screens/tables_screen.dart';
import '../waiter_calls/providers/waiter_calls_provider.dart';
import '../waiter_calls/screens/waiter_calls_screen.dart';

class MainShellScreen extends ConsumerStatefulWidget {
  const MainShellScreen({super.key});

  @override
  ConsumerState<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends ConsumerState<MainShellScreen> {
  int _currentIndex = 0;
  StreamSubscription? _notifSubscription;

  final List<Widget> _screens = const [
    TablesScreen(),
    ActiveOrdersScreen(),
    WaiterCallsScreen(),
    ProfileScreen(),
  ];

  @override
  void initState() {
    super.initState();

    // Check notification permission eligibility after initial layout
    WidgetsBinding.instance.addPostFrameCallback((_) {
      NotificationPermissionDialog.showIfEligible(context);
    });

    // Listen for notification taps to route directly to relevant tab
    _notifSubscription = PushNotificationService().onNotificationClick.listen((data) {
      final type = data['type']?.toString() ?? '';
      if (type == 'WAITER_CALL') {
        setState(() => _currentIndex = 2); // Waiter calls tab
      } else if (type == 'NEW_ORDER') {
        setState(() => _currentIndex = 1); // Active orders tab
      }
    });
  }

  @override
  void dispose() {
    _notifSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final activeOrdersState = ref.watch(activeOrdersProvider);
    final waiterCallsState = ref.watch(waiterCallsProvider);

    final activeOrdersCount = activeOrdersState.orders.length;
    final pendingCallsCount = waiterCallsState.pendingCount;

    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (idx) => setState(() => _currentIndex = idx),
        items: [
          const BottomNavigationBarItem(
            icon: Icon(LucideIcons.layoutGrid),
            activeIcon: Icon(LucideIcons.layoutGrid, color: AppColors.primary),
            label: 'Tables',
          ),
          BottomNavigationBarItem(
            icon: badges.Badge(
              showBadge: activeOrdersCount > 0,
              badgeContent: Text(
                '$activeOrdersCount',
                style: const TextStyle(
                  color: AppColors.textDark,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
              badgeStyle: const badges.BadgeStyle(
                badgeColor: AppColors.primary,
                padding: EdgeInsets.all(4),
              ),
              child: const Icon(LucideIcons.receipt),
            ),
            label: 'Orders',
          ),
          BottomNavigationBarItem(
            icon: badges.Badge(
              showBadge: pendingCallsCount > 0,
              badgeContent: Text(
                '$pendingCallsCount',
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
              badgeStyle: const badges.BadgeStyle(
                badgeColor: AppColors.error,
                padding: EdgeInsets.all(4),
              ),
              child: const Icon(LucideIcons.bellRing),
            ),
            label: 'Calls',
          ),
          const BottomNavigationBarItem(
            icon: Icon(LucideIcons.user),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

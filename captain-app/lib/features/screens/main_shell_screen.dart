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
import '../auth/providers/auth_provider.dart';
import '../auth/screens/mobile_disabled_screen.dart';
import '../profile/screens/profile_screen.dart';
import '../tables/screens/tables_screen.dart';
import '../waiter_calls/providers/waiter_calls_provider.dart';
import '../waiter_calls/screens/waiter_calls_screen.dart';
import '../waiter_calls/widgets/incoming_waiter_call_modal.dart';

class MainShellScreen extends ConsumerStatefulWidget {
  const MainShellScreen({super.key});

  @override
  ConsumerState<MainShellScreen> createState() => _MainShellScreenState();
}

class _MainShellScreenState extends ConsumerState<MainShellScreen>
    with WidgetsBindingObserver {
  int _currentIndex = 0;
  StreamSubscription? _notifSubscription;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);

    // Check notification permission eligibility after initial layout
    WidgetsBinding.instance.addPostFrameCallback((_) {
      NotificationPermissionDialog.showIfEligible(context);

      // Consume any cold-start launch payload (when app was launched by tapping a notification)
      final initialData = PushNotificationService().consumeInitialPayload();
      if (initialData != null) {
        _handleNotificationRoute(initialData);
      }
    });

    // Listen for notification taps to route directly to relevant tab
    _notifSubscription = PushNotificationService().onNotificationClick.listen((data) {
      _handleNotificationRoute(data);
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) {
      debugPrint('[MainShell] App resumed from background -> Auto-refreshing calls & orders');
      ref.read(waiterCallsProvider.notifier).fetchWaiterCalls(isSilent: true);
      ref.read(activeOrdersProvider.notifier).fetchActiveOrders(isSilent: true);
    }
  }

  void _handleNotificationRoute(Map<String, dynamic> data) {
    final type = (data['type'] ?? data['notificationType'] ?? '').toString().toUpperCase();
    debugPrint('[MainShell] Notification navigation route triggered for type: $type | data: $data');
    if (type == 'WAITER_CALL' || type == 'CALL') {
      if (mounted) {
        setState(() => _currentIndex = 2); // Waiter calls tab
      }
      ref.read(waiterCallsProvider.notifier).fetchWaiterCalls(isSilent: false);
    } else if (type == 'NEW_ORDER' || type == 'ORDER') {
      if (mounted) {
        setState(() => _currentIndex = 1); // Active orders tab
      }
      ref.read(activeOrdersProvider.notifier).fetchActiveOrders(isSilent: false);
    }
  }

  void _onTabSelected(int idx) {
    setState(() => _currentIndex = idx);
    if (idx == 2) {
      ref.read(waiterCallsProvider.notifier).fetchWaiterCalls(isSilent: true);
    } else if (idx == 1) {
      ref.read(activeOrdersProvider.notifier).fetchActiveOrders(isSilent: true);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _notifSubscription?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);

    // Gate screen if mobile access is disabled
    if (authState.status == AuthStatus.mobileDisabled ||
        (authState.user != null &&
         authState.user!.role != 'SUPER_ADMIN' &&
         authState.activeRestaurant != null &&
         !authState.activeRestaurant!.featureFlags.contains('mobile_app'))) {
      return const MobileDisabledScreen();
    }

    final activeOrdersState = ref.watch(activeOrdersProvider);
    final waiterCallsState = ref.watch(waiterCallsProvider);

    final activeOrdersCount = activeOrdersState.orders.length;
    final pendingCallsCount = waiterCallsState.pendingCount;

    final featureFlags = authState.activeRestaurant?.featureFlags ?? [];
    // Default to true if featureFlags list is empty (e.g. legacy backend) or explicitly contains the flag
    final hasOrdering = featureFlags.isEmpty || featureFlags.contains('ordering');
    final hasWaiterCall = featureFlags.isEmpty || featureFlags.contains('waiter_call');

    // Build tabs dynamically based on feature flags
    final List<Widget> activeScreens = [
      const TablesScreen(),
      if (hasOrdering) const ActiveOrdersScreen(),
      if (hasWaiterCall) const WaiterCallsScreen(),
      const ProfileScreen(),
    ];

    final List<BottomNavigationBarItem> navItems = [
      const BottomNavigationBarItem(
        icon: Icon(LucideIcons.layoutGrid),
        activeIcon: Icon(LucideIcons.layoutGrid, color: AppColors.primaryDark),
        label: 'Tables',
      ),
      if (hasOrdering)
        BottomNavigationBarItem(
          icon: badges.Badge(
            showBadge: activeOrdersCount > 0,
            badgeContent: Text(
              '$activeOrdersCount',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
            badgeStyle: const badges.BadgeStyle(
              badgeColor: AppColors.primaryDark,
              padding: EdgeInsets.all(4),
            ),
            child: const Icon(LucideIcons.receipt),
          ),
          activeIcon: badges.Badge(
            showBadge: activeOrdersCount > 0,
            badgeContent: Text(
              '$activeOrdersCount',
              style: const TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.bold,
              ),
            ),
            badgeStyle: const badges.BadgeStyle(
              badgeColor: AppColors.primaryDark,
              padding: EdgeInsets.all(4),
            ),
            child: const Icon(LucideIcons.receipt, color: AppColors.primaryDark),
          ),
          label: 'Orders',
        ),
      if (hasWaiterCall)
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
          activeIcon: badges.Badge(
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
            child: const Icon(LucideIcons.bellRing, color: AppColors.primaryDark),
          ),
          label: 'Calls',
        ),
      const BottomNavigationBarItem(
        icon: Icon(LucideIcons.user),
        activeIcon: Icon(LucideIcons.user, color: AppColors.primaryDark),
        label: 'Profile',
      ),
    ];

    // Ensure _currentIndex is valid for the dynamically built list
    final safeIndex = _currentIndex >= activeScreens.length ? 0 : _currentIndex;

    return IncomingWaiterCallModal(
      child: Scaffold(
        body: IndexedStack(
          index: safeIndex,
          children: activeScreens,
        ),
        bottomNavigationBar: Container(
          decoration: const BoxDecoration(
            border: Border(
              top: BorderSide(color: AppColors.cardBorder, width: 1),
            ),
          ),
          child: BottomNavigationBar(
            currentIndex: safeIndex,
            onTap: _onTabSelected,
            items: navItems,
            type: BottomNavigationBarType.fixed,
          ),
        ),
      ),
    );
  }
}

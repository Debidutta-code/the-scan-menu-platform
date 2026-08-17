import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/constants/app_colors.dart';
import '../../../core/network/api_client.dart';
import '../../../core/notifications/push_notification_service.dart';
import '../../../core/storage/secure_storage_service.dart';
import '../../auth/providers/auth_provider.dart';
import '../../auth/screens/login_screen.dart';

class ProfileScreen extends ConsumerStatefulWidget {
  const ProfileScreen({super.key});

  @override
  ConsumerState<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends ConsumerState<ProfileScreen> {
  bool _soundEnabled = true;
  bool _vibrationEnabled = true;
  String _serverUrl = ApiConstants.defaultBaseUrl;

  @override
  void initState() {
    super.initState();
    _loadPreferences();
  }

  Future<void> _loadPreferences() async {
    final sound = await SecureStorageService.isSoundEnabled();
    final vibration = await SecureStorageService.isVibrationEnabled();
    final url = await SecureStorageService.getBaseUrl();
    if (mounted) {
      setState(() {
        _soundEnabled = sound;
        _vibrationEnabled = vibration;
        _serverUrl = url ?? ApiConstants.defaultBaseUrl;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authProvider);
    final user = authState.user;
    final restaurant = authState.activeRestaurant;

    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'Staff Profile',
          style: GoogleFonts.outfit(
            fontSize: 18,
            fontWeight: FontWeight.bold,
            color: AppColors.textPrimary,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // User Info Header Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Column(
                children: [
                  Container(
                    width: 64,
                    height: 64,
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.15),
                      shape: BoxShape.circle,
                      border: Border.all(color: AppColors.primary.withValues(alpha: 0.4)),
                    ),
                    child: Center(
                      child: Text(
                        (user?.name.isNotEmpty == true)
                            ? user!.name.substring(0, 1).toUpperCase()
                            : 'S',
                        style: GoogleFonts.outfit(
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    user?.name ?? 'Staff Member',
                    style: GoogleFonts.outfit(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    user?.email ?? '',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(20),
                      border:
                          Border.all(color: AppColors.primary.withValues(alpha: 0.3)),
                    ),
                    child: Text(
                      user?.role ?? 'STAFF',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primary,
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Assigned Outlet Card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.surface,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: AppColors.cardBorder),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Active Restaurant Outlet',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(LucideIcons.store,
                          color: AppColors.primary, size: 20),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          restaurant?.name ?? 'Loading restaurant...',
                          style: GoogleFonts.outfit(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (restaurant?.address != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      restaurant!.address!,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Preferences Card
            Material(
              color: AppColors.surface,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(16),
                side: const BorderSide(color: AppColors.cardBorder),
              ),
              child: Column(
                children: [
                  SwitchListTile(
                    title: Text(
                      'Audible Alerts',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    subtitle: Text(
                      'Play chimes on new orders and waiter calls',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    secondary: const Icon(LucideIcons.volume2,
                        color: AppColors.textSecondary),
                    activeThumbColor: AppColors.primary,
                    value: _soundEnabled,
                    onChanged: (val) async {
                      setState(() => _soundEnabled = val);
                      await SecureStorageService.setSoundEnabled(val);
                    },
                  ),
                  const Divider(height: 1),
                  SwitchListTile(
                    title: Text(
                      'Haptic Vibration',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    subtitle: Text(
                      'Vibrate device on incoming floor requests',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    secondary: const Icon(LucideIcons.vibrate,
                        color: AppColors.textSecondary),
                    activeThumbColor: AppColors.primary,
                    value: _vibrationEnabled,
                    onChanged: (val) async {
                      setState(() => _vibrationEnabled = val);
                      await SecureStorageService.setVibrationEnabled(val);
                    },
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(LucideIcons.bellRing, color: AppColors.primary),
                    title: Text(
                      'Push Floor Notifications',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    subtitle: Text(
                      'Alerts when app is closed or in background',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: AppColors.textSecondary,
                      ),
                    ),
                    trailing: TextButton(
                      onPressed: () async {
                        final messenger = ScaffoldMessenger.of(context);
                        final granted = await PushNotificationService().requestPermission();
                        if (granted) {
                          await PushNotificationService().showLocalNotification(
                            id: 999,
                            title: '🛎️ Test Notification',
                            body: 'Floor notification system is operational!',
                          );
                          messenger.showSnackBar(
                            const SnackBar(content: Text('Notifications active! Test alert sent.')),
                          );
                        } else {
                          messenger.showSnackBar(
                            const SnackBar(content: Text('Notification permission is disabled in Android settings.')),
                          );
                        }
                      },
                      child: Text(
                        'Test / Enable',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primary,
                        ),
                      ),
                    ),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(LucideIcons.globe, color: AppColors.textSecondary),
                    title: Text(
                      'Backend Server URL',
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w600,
                        color: AppColors.textPrimary,
                      ),
                    ),
                    subtitle: Text(
                      _serverUrl,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: AppColors.primary,
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    trailing: const Icon(LucideIcons.chevronRight, color: AppColors.textMuted, size: 18),
                    onTap: () {
                      final urlController = TextEditingController(text: _serverUrl);
                      showDialog(
                        context: context,
                        builder: (ctx) => AlertDialog(
                          backgroundColor: AppColors.surface,
                          title: Text(
                            'Server Configuration',
                            style: GoogleFonts.outfit(
                              color: AppColors.textPrimary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          content: Column(
                            mainAxisSize: MainAxisSize.min,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Local Server: http://192.168.31.127:5000\nCloud Server: https://the-scan-menu-platform.onrender.com',
                                style: GoogleFonts.inter(
                                  color: AppColors.textSecondary,
                                  fontSize: 12,
                                ),
                              ),
                              const SizedBox(height: 16),
                              TextField(
                                controller: urlController,
                                decoration: const InputDecoration(
                                  labelText: 'API Base URL',
                                  prefixIcon: Icon(LucideIcons.globe, color: AppColors.textMuted),
                                ),
                              ),
                            ],
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.of(ctx).pop(),
                              child: const Text('Cancel'),
                            ),
                            ElevatedButton(
                              onPressed: () async {
                                String newUrl = urlController.text.trim();
                                if (newUrl.isNotEmpty) {
                                  final messenger = ScaffoldMessenger.of(context);
                                  newUrl = newUrl.replaceAll(RegExp(r'/+$'), '');
                                  await SecureStorageService.saveBaseUrl(newUrl);
                                  await ApiClient().updateBaseUrl();
                                  if (ctx.mounted) Navigator.of(ctx).pop();
                                  if (mounted) {
                                    setState(() => _serverUrl = newUrl);
                                    messenger.showSnackBar(
                                      SnackBar(content: Text('API URL set to: $newUrl')),
                                    );
                                  }
                                }
                              },
                              child: const Text('Save & Apply'),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 32),

            // Logout Button
            SizedBox(
              height: 48,
              child: OutlinedButton.icon(
                onPressed: () async {
                  await ref.read(authProvider.notifier).logout();
                  if (context.mounted) {
                    Navigator.of(context).pushAndRemoveUntil(
                      MaterialPageRoute(builder: (_) => const LoginScreen()),
                      (route) => false,
                    );
                  }
                },
                icon: const Icon(LucideIcons.logOut,
                    color: AppColors.error, size: 18),
                label: Text(
                  'Sign Out from Shift',
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: AppColors.error,
                  ),
                ),
                style: OutlinedButton.styleFrom(
                  side: BorderSide(color: AppColors.error.withValues(alpha: 0.4)),
                ),
              ),
            ),
            const SizedBox(height: 20),
            Center(
              child: Text(
                'ScanMenu Captain App v1.0.0',
                style: GoogleFonts.inter(
                  fontSize: 11,
                  color: AppColors.textMuted,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

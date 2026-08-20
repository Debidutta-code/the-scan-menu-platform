import 'package:flutter/material.dart';
import 'core/constants/app_theme.dart';
import 'features/auth/screens/splash_screen.dart';
import 'core/widgets/network_toast_overlay.dart';

class CaptainApp extends StatelessWidget {
  const CaptainApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ScanMenu Captain',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      builder: (context, child) {
        return NetworkToastOverlay(child: child!);
      },
      home: const SplashScreen(),
    );
  }
}

import 'package:flutter/material.dart';
import 'core/constants/app_theme.dart';
import 'features/auth/screens/splash_screen.dart';

class CaptainApp extends StatelessWidget {
  const CaptainApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ScanMenu Captain',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const SplashScreen(),
    );
  }
}

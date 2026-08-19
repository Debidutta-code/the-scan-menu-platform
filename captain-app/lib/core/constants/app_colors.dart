import 'package:flutter/material.dart';

class AppColors {
  // Light Background & Surface Tones
  static const Color background = Color(0xFFF8FAFC); // Slate 50
  static const Color surface = Color(0xFFFFFFFF); // Pure White
  static const Color surfaceLight = Color(0xFFF1F5F9); // Slate 100
  static const Color cardBorder = Color(0xFFE2E8F0); // Slate 200

  // Primary Gold / Amber Accent
  static const Color primary = Color(0xFFF59E0B); // Amber 500
  static const Color primaryLight = Color(0xFFFBBF24); // Amber 400
  static const Color primaryDark = Color(0xFFD97706); // Amber 600

  // Status Colors
  static const Color success = Color(0xFF10B981); // Emerald 500
  static const Color successBg = Color(0xFFECFDF5); // Emerald 50
  static const Color info = Color(0xFF0EA5E9); // Sky 500
  static const Color infoBg = Color(0xFFF0F9FF); // Sky 50
  static const Color warning = Color(0xFFF59E0B); // Amber 500
  static const Color warningBg = Color(0xFFFFFBEB); // Amber 50
  static const Color error = Color(0xFFEF4444); // Rose 500
  static const Color errorBg = Color(0xFFFEF2F2); // Rose 50
  static const Color purple = Color(0xFF8B5CF6); // Violet 500
  static const Color purpleBg = Color(0xFFF5F3FF); // Violet 50

  // Text Colors (High Contrast on White/Light background)
  static const Color textPrimary = Color(0xFF0F172A); // Slate 900
  static const Color textSecondary = Color(0xFF475569); // Slate 600
  static const Color textMuted = Color(0xFF94A3B8); // Slate 400
  static const Color textDark = Color(0xFF0F172A); // Slate 900
  static const Color textLight = Color(0xFFF8FAFC); // Slate 50

  // Table State Colors
  static const Color tableAvailable = Color(0xFF10B981);
  static const Color tableOccupied = Color(0xFFF59E0B);
  static const Color tableBillRequested = Color(0xFF8B5CF6);
  static const Color tableReserved = Color(0xFF3B82F6);
}

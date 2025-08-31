import 'package:flutter/material.dart';

class AppColors {
  // Primary colors (exact match with frontend CSS variables)
  static const Color primary = Color(
    0xFF7C7CFF,
  ); // hsl(238.73 83.53% 66.67%) - frontend primary
  static const Color primaryForeground = Color(
    0xFFFFFFFF,
  ); // hsl(0 0% 100%) - white text on primary

  // Secondary colors (exact match with frontend)
  static const Color secondary = Color(
    0xFFE1E5EA,
  ); // hsl(220 13.04% 90.98%) - light gray
  static const Color secondaryForeground = Color(
    0xFF444444,
  ); // hsl(216.92 19.12% 26.67%) - dark text

  // Semantic colors (exact match with frontend)
  static const Color success = Color(
    0xFF22C55E,
  ); // hsl(142.1 76.2% 36.3%) - success green
  static const Color warning = Color(
    0xFFF59E0B,
  ); // hsl(38 92% 50%) - warning orange
  static const Color error = Color(
    0xFFEF4444,
  ); // hsl(0 84.24% 60.20%) - error red
  static const Color info = Color(0xFF3B82F6); // hsl(199 89% 48%) - info blue

  // Background colors (exact match with frontend)
  static const Color background = Color(
    0xFFFAFBFC,
  ); // hsl(210.00 40.00% 98.04%) - light blue-gray
  static const Color surface = Color(
    0xFFFFFFFF,
  ); // hsl(0 0% 100%) - white card background
  static const Color muted = Color(
    0xFFF5F7FA,
  ); // hsl(220.00 14.29% 95.88%) - subtle background
  static const Color accent = Color(
    0xFFE8F2FF,
  ); // hsl(226.45 100% 93.92%) - accent background

  // Text colors (exact match with frontend)
  static const Color foreground = Color(
    0xFF2C3E50,
  ); // hsl(217.24 32.58% 17.45%) - primary text
  static const Color mutedForeground = Color(
    0xFF6B7280,
  ); // hsl(220 8.94% 46.08%) - secondary text
  static const Color cardForeground = Color(
    0xFF2C3E50,
  ); // hsl(217.24 32.58% 17.45%) - text on cards

  // Border & Input colors (exact match with frontend)
  static const Color border = Color(
    0xFFD1D5DB,
  ); // hsl(216.00 12.20% 83.92%) - default borders
  static const Color input = Color(
    0xFFD1D5DB,
  ); // hsl(216.00 12.20% 83.92%) - input borders
  static const Color ring = Color(
    0xFF7C7CFF,
  ); // hsl(238.73 83.53% 66.67%) - focus ring (matches primary)

  // Shadow colors (exact match with frontend)
  static const Color shadow = Color(
    0x0D000000,
  ); // hsl(0 0% 0% / 0.05) - very subtle shadow
  static const Color shadowLight = Color(
    0x0D000000,
  ); // hsl(0 0% 0% / 0.05) - light shadow
  static const Color shadowMedium = Color(
    0x1A000000,
  ); // hsl(0 0% 0% / 0.10) - medium shadow
  static const Color shadowDark = Color(
    0x40000000,
  ); // hsl(0 0% 0% / 0.25) - dark shadow

  // Utility colors
  static const Color transparent = Colors.transparent; // Transparent color
  static const Color white = Color(0xFFFFFFFF); // Pure white
  static const Color black = Color(0xFF000000); // Pure black

  // Legacy color mappings for backward compatibility
  static const Color primaryLight = Color(0xFF9999FF);
  static const Color primaryDark = Color(0xFF6366F1);

  // Neutral colors
  static const Color grey50 = Color(0xFFF9FAFB);
  static const Color grey100 = Color(0xFFF3F4F6);
  static const Color grey200 = Color(0xFFE5E7EB);
  static const Color grey300 = Color(0xFFD1D5DB);
  static const Color grey400 = Color(0xFF9CA3AF);
  static const Color grey500 = Color(0xFF6B7280);
  static const Color grey600 = Color(0xFF4B5563);
  static const Color grey700 = Color(0xFF374151);
  static const Color grey800 = Color(0xFF1F2937);
  static const Color grey900 = Color(0xFF111827);

  // Legacy text color mappings
  static const Color textPrimary = foreground;
  static const Color textSecondary = mutedForeground;
  static const Color textDisabled = grey400;
  static const Color textOnPrimary = primaryForeground;

  // Legacy border color mappings
  static const Color borderLight = grey200;
  static const Color borderDark = grey400;
}

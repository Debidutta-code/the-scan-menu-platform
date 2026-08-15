import 'package:intl/intl.dart';

class Formatters {
  // Format paise/cents into INR currency (₹)
  static String formatCurrency(int amountInPaise, {String currency = 'INR'}) {
    final double value = amountInPaise / 100.0;
    if (currency == 'INR') {
      final formatter = NumberFormat.currency(
        locale: 'en_IN',
        symbol: '₹',
        decimalDigits: 2,
      );
      return formatter.format(value);
    }
    final formatter = NumberFormat.currency(
      symbol: currency,
      decimalDigits: 2,
    );
    return formatter.format(value);
  }

  // Format ISO DateTime to relative time (e.g. "Just now", "5m ago", "2h 10m ago")
  static String formatTimeAgo(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inSeconds < 60) {
      return 'Just now';
    } else if (difference.inMinutes < 60) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inHours < 24) {
      final minutes = difference.inMinutes % 60;
      return '${difference.inHours}h ${minutes}m ago';
    } else {
      return DateFormat('dd MMM, hh:mm a').format(dateTime);
    }
  }

  // Format time (e.g. "07:30 PM")
  static String formatTime(DateTime dateTime) {
    return DateFormat('hh:mm a').format(dateTime);
  }
}

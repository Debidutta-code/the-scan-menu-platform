import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:google_fonts/google_fonts.dart';
import '../sockets/socket_service.dart';
import '../constants/app_colors.dart';

class NetworkToastOverlay extends StatefulWidget {
  final Widget child;

  const NetworkToastOverlay({super.key, required this.child});

  @override
  State<NetworkToastOverlay> createState() => _NetworkToastOverlayState();
}

class _NetworkToastOverlayState extends State<NetworkToastOverlay> {
  SocketConnectionState _connectionState = SocketConnectionState.disconnected;
  bool _isRetrying = false;

  @override
  void initState() {
    super.initState();
    _connectionState = SocketService().connectionState.value;
    SocketService().connectionState.addListener(_onConnectionStateChanged);
  }

  @override
  void dispose() {
    SocketService().connectionState.removeListener(_onConnectionStateChanged);
    super.dispose();
  }

  void _onConnectionStateChanged() {
    setState(() {
      _connectionState = SocketService().connectionState.value;
      if (_connectionState == SocketConnectionState.connected) {
        _isRetrying = false;
      }
    });
  }

  Future<void> _handleRetry() async {
    setState(() {
      _isRetrying = true;
    });
    await SocketService().reconnect();
    // Stop spinning after a brief moment if not connected
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted && _connectionState != SocketConnectionState.connected) {
        setState(() {
          _isRetrying = false;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    // Show toast if disconnected or if explicitly trying to connect but haven't yet (optional).
    // Let's only show if disconnected.
    final showToast = _connectionState == SocketConnectionState.disconnected;

    return Stack(
      textDirection: TextDirection.ltr,
      children: [
        widget.child,
        if (showToast)
          Positioned(
            bottom: 24,
            left: 16,
            right: 16,
            child: Material(
              color: Colors.transparent,
              child: AnimatedOpacity(
                opacity: showToast ? 1.0 : 0.0,
                duration: const Duration(milliseconds: 300),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A), // slate-900
                    borderRadius: BorderRadius.circular(12),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.2),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: AppColors.error.withOpacity(0.2),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(
                          LucideIcons.wifiOff,
                          color: AppColors.error,
                          size: 20,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'No Connection',
                              style: GoogleFonts.inter(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                            Text(
                              'Please check your network.',
                              style: GoogleFonts.inter(
                                color: Colors.white70,
                                fontSize: 12,
                              ),
                            ),
                          ],
                        ),
                      ),
                      IconButton(
                        icon: _isRetrying
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  valueColor: AlwaysStoppedAnimation<Color>(Colors.white70),
                                ),
                              )
                            : const Icon(
                                LucideIcons.refreshCw,
                                color: Colors.white70,
                                size: 20,
                              ),
                        onPressed: _isRetrying ? null : _handleRetry,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
      ],
    );
  }
}

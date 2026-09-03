import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:google_fonts/google_fonts.dart';
import '../sockets/socket_service.dart';
import '../constants/app_colors.dart';
import '../../features/auth/providers/auth_provider.dart';

class NetworkToastOverlay extends ConsumerStatefulWidget {
  final Widget child;

  const NetworkToastOverlay({super.key, required this.child});

  @override
  ConsumerState<NetworkToastOverlay> createState() => _NetworkToastOverlayState();
}

class _NetworkToastOverlayState extends ConsumerState<NetworkToastOverlay> {
  SocketConnectionState _connectionState = SocketConnectionState.disconnected;
  bool _isRetrying = false;
  bool _showToast = false;
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _evaluateConnectionState();
    SocketService().connectionState.addListener(_onConnectionStateChanged);
  }

  @override
  void dispose() {
    _debounceTimer?.cancel();
    SocketService().connectionState.removeListener(_onConnectionStateChanged);
    super.dispose();
  }

  void _onConnectionStateChanged() {
    _evaluateConnectionState();
  }

  void _evaluateConnectionState() {
    final newState = SocketService().connectionState.value;

    if (newState == SocketConnectionState.connected) {
      _debounceTimer?.cancel();
      if (_showToast || _isRetrying || _connectionState != newState) {
        setState(() {
          _connectionState = newState;
          _showToast = false;
          _isRetrying = false;
        });
      }
    } else if (newState == SocketConnectionState.connecting) {
      _debounceTimer?.cancel();
      if (_connectionState != newState) {
        setState(() {
          _connectionState = newState;
        });
      }
    } else {
      // Disconnected
      if (_connectionState != newState) {
        _connectionState = newState;
      }
      _debounceTimer?.cancel();
      _debounceTimer = Timer(const Duration(seconds: 3), () {
        if (mounted &&
            SocketService().connectionState.value ==
                SocketConnectionState.disconnected) {
          setState(() {
            _showToast = true;
          });
        }
      });
    }
  }

  Future<void> _handleRetry() async {
    setState(() {
      _isRetrying = true;
    });
    await SocketService().reconnect();
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
    final authState = ref.watch(authProvider);
    final shouldDisplay = authState.status == AuthStatus.authenticated &&
        _connectionState == SocketConnectionState.disconnected &&
        _showToast;

    return Stack(
      textDirection: TextDirection.ltr,
      children: [
        widget.child,
        if (shouldDisplay)
          Positioned(
            bottom: 24,
            left: 16,
            right: 16,
            child: Material(
              color: Colors.transparent,
              child: AnimatedOpacity(
                opacity: shouldDisplay ? 1.0 : 0.0,
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

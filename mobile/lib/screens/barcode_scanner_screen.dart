import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class BarcodeScannerScreen extends StatefulWidget {
  final String title;

  const BarcodeScannerScreen({
    super.key,
    this.title = 'Scan Barcode',
  });

  @override
  State<BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends State<BarcodeScannerScreen> {
  late final MobileScannerController controller;

  bool detected = false;
  bool torchEnabled = false;
  bool frontCamera = false;

  @override
  void initState() {
    super.initState();

    controller = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      facing: CameraFacing.back,
      torchEnabled: false,
    );
  }

  // ============================================================
  // DISPOSE
  // ============================================================

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  // ============================================================
  // DETECT BARCODE
  // ============================================================

  void _detect(
    BarcodeCapture capture,
  ) {
    if (detected) {
      return;
    }

    for (final barcode in capture.barcodes) {
      final value = barcode.rawValue?.trim();

      if (value == null || value.isEmpty) {
        continue;
      }

      detected = true;

      Navigator.pop(
        context,
        value,
      );

      return;
    }
  }

  // ============================================================
  // TORCH
  // ============================================================

  Future<void> _toggleTorch() async {
    await controller.toggleTorch();

    if (!mounted) return;

    setState(() {
      torchEnabled = !torchEnabled;
    });
  }

  // ============================================================
  // CAMERA
  // ============================================================

  Future<void> _switchCamera() async {
    await controller.switchCamera();

    if (!mounted) return;

    setState(() {
      frontCamera = !frontCamera;
    });
  }

  // ============================================================
  // CLOSE
  // ============================================================

  void _close() {
    if (detected) {
      return;
    }

    Navigator.pop(context);
  }

  // ============================================================
  // BUILD
  // ============================================================

  @override
  Widget build(
    BuildContext context,
  ) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          onPressed: _close,
          icon: const Icon(
            Icons.close,
          ),
        ),
        title: Text(
          widget.title,
          style: const TextStyle(
            fontWeight: FontWeight.w800,
          ),
        ),
        actions: [
          IconButton(
            tooltip: torchEnabled ? 'Matikan lampu' : 'Nyalakan lampu',
            onPressed: _toggleTorch,
            icon: Icon(
              torchEnabled ? Icons.flash_on : Icons.flash_off,
            ),
          ),
          IconButton(
            tooltip: 'Ganti kamera',
            onPressed: _switchCamera,
            icon: const Icon(
              Icons.cameraswitch,
            ),
          ),
        ],
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          // =====================================================
          // CAMERA
          // =====================================================

          MobileScanner(
            controller: controller,
            onDetect: _detect,
          ),

          // =====================================================
          // DARK OVERLAY
          // =====================================================

          IgnorePointer(
            child: CustomPaint(
              painter: _ScannerOverlayPainter(),
            ),
          ),

          // =====================================================
          // SCAN FRAME
          // =====================================================

          Center(
            child: SizedBox(
              width: 300,
              height: 200,
              child: Stack(
                children: [
                  Positioned(
                    left: 0,
                    top: 0,
                    child: _corner(
                      top: true,
                      left: true,
                    ),
                  ),
                  Positioned(
                    right: 0,
                    top: 0,
                    child: _corner(
                      top: true,
                      left: false,
                    ),
                  ),
                  Positioned(
                    left: 0,
                    bottom: 0,
                    child: _corner(
                      top: false,
                      left: true,
                    ),
                  ),
                  Positioned(
                    right: 0,
                    bottom: 0,
                    child: _corner(
                      top: false,
                      left: false,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // =====================================================
          // CENTER INSTRUCTION
          // =====================================================

          Positioned(
            left: 24,
            right: 24,
            bottom: 130,
            child: Container(
              padding: const EdgeInsets.symmetric(
                horizontal: 18,
                vertical: 14,
              ),
              decoration: BoxDecoration(
                color: Colors.black.withValues(
                  alpha: .72,
                ),
                borderRadius: BorderRadius.circular(
                  14,
                ),
              ),
              child: Column(
                children: [
                  const Icon(
                    Icons.qr_code_scanner,
                    color: Colors.white,
                    size: 30,
                  ),
                  const SizedBox(
                    height: 8,
                  ),
                  Text(
                    'Arahkan kamera ke barcode',
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(
                    height: 4,
                  ),
                  const Text(
                    'Pallet atau SKU akan terdeteksi otomatis.',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
          ),

          // =====================================================
          // CAMERA INFO
          // =====================================================

          Positioned(
            left: 0,
            right: 0,
            bottom: 35,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                _bottomAction(
                  icon: torchEnabled ? Icons.flash_on : Icons.flash_off,
                  label: 'Lampu',
                  onTap: _toggleTorch,
                ),
                const SizedBox(
                  width: 28,
                ),
                _bottomAction(
                  icon: Icons.cameraswitch,
                  label: frontCamera ? 'Depan' : 'Belakang',
                  onTap: _switchCamera,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // ============================================================
  // CORNER
  // ============================================================

  Widget _corner({
    required bool top,
    required bool left,
  }) {
    const size = 30.0;
    const thickness = 4.0;

    return SizedBox(
      width: size,
      height: size,
      child: Stack(
        children: [
          Positioned(
            top: top ? 0 : null,
            bottom: top ? null : 0,
            left: left ? 0 : null,
            right: left ? null : 0,
            child: Container(
              width: size,
              height: thickness,
              color: Colors.white,
            ),
          ),
          Positioned(
            top: top ? 0 : null,
            bottom: top ? null : 0,
            left: left ? 0 : null,
            right: left ? null : 0,
            child: Container(
              width: thickness,
              height: size,
              color: Colors.white,
            ),
          ),
        ],
      ),
    );
  }

  // ============================================================
  // BOTTOM ACTION
  // ============================================================

  Widget _bottomAction({
    required IconData icon,
    required String label,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(
        40,
      ),
      child: Container(
        padding: const EdgeInsets.symmetric(
          horizontal: 18,
          vertical: 10,
        ),
        decoration: BoxDecoration(
          color: Colors.black.withValues(
            alpha: .65,
          ),
          borderRadius: BorderRadius.circular(
            40,
          ),
        ),
        child: Row(
          children: [
            Icon(
              icon,
              color: Colors.white,
              size: 20,
            ),
            const SizedBox(
              width: 7,
            ),
            Text(
              label,
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ================================================================
// SCANNER OVERLAY
// ================================================================

class _ScannerOverlayPainter extends CustomPainter {
  @override
  void paint(
    Canvas canvas,
    Size size,
  ) {
    final overlayPaint = Paint()
      ..color = Colors.black.withValues(
        alpha: .38,
      );

    final centerRect = Rect.fromCenter(
      center: Offset(
        size.width / 2,
        size.height / 2,
      ),
      width: 300,
      height: 200,
    );

    final fullRect = Offset.zero & size;

    final path = Path()
      ..addRect(fullRect)
      ..addRect(centerRect);

    canvas.drawPath(
      path,
      overlayPaint,
    );
  }

  @override
  bool shouldRepaint(
    covariant CustomPainter oldDelegate,
  ) {
    return false;
  }
}

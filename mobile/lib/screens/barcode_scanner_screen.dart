import '../services/api_service.dart';

import 'package:flutter/material.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class BarcodeScannerScreen extends StatefulWidget {
  final String title;
  const BarcodeScannerScreen({super.key, this.title = 'Scan Barcode'});

  @override
  State<BarcodeScannerScreen> createState() => _BarcodeScannerScreenState();
}

class _BarcodeScannerScreenState extends State<BarcodeScannerScreen> {
  final MobileScannerController controller = MobileScannerController();
  bool detected = false;

  @override
  void dispose() {
    controller.dispose();
    super.dispose();
  }

  void _detect(BarcodeCapture capture) {
    if (detected) return;
    for (final barcode in capture.barcodes) {
      final value = barcode.rawValue?.trim();
      if (value != null && value.isNotEmpty) {
        detected = true;
        Navigator.pop(context, value);
        return;
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(widget.title),
        actions: [
          IconButton(
            icon: const Icon(Icons.flash_on),
            onPressed: () => controller.toggleTorch(),
          ),
          IconButton(
            icon: const Icon(Icons.cameraswitch),
            onPressed: () => controller.switchCamera(),
          ),
        ],
      ),
      body: Stack(
        fit: StackFit.expand,
        children: [
          MobileScanner(controller: controller, onDetect: _detect),
          Center(
            child: Container(
              width: 290,
              height: 190,
              decoration: BoxDecoration(
                border: Border.all(color: Colors.white, width: 3),
                borderRadius: BorderRadius.circular(18),
              ),
            ),
          ),
          Positioned(
            left: 20,
            right: 20,
            bottom: 36,
            child: Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.black.withValues(alpha: .72),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Text(
                'Arahkan kamera HP ke barcode pallet atau SKU.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.white),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class ScanMenuScreen extends StatelessWidget {
  final ApiService? api;
  const ScanMenuScreen({super.key, this.api});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan', style: TextStyle(fontWeight: FontWeight.w800))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _card(context, Icons.inventory_2_outlined, 'Scan Pallet',
              'Baca barcode pallet menggunakan kamera HP.', 'Pallet'),
          _card(context, Icons.qr_code_2, 'Scan SKU',
              'Baca barcode SKU menggunakan kamera HP.', 'SKU'),
        ],
      ),
    );
  }

  Widget _card(BuildContext context, IconData icon, String title, String desc, String mode) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: CircleAvatar(child: Icon(icon)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
        subtitle: Padding(padding: const EdgeInsets.only(top: 5), child: Text(desc)),
        trailing: const Icon(Icons.chevron_right),
        onTap: () async {
          final code = await Navigator.push<String>(
            context,
            MaterialPageRoute(builder: (_) => BarcodeScannerScreen(title: title)),
          );
          if (code == null || !context.mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('$mode terbaca: $code')),
          );
        },
      ),
    );
  }
}

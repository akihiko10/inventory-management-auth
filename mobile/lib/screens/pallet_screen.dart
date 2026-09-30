
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'barcode_scanner_screen.dart';
import 'pallet_detail_screen.dart';

class PalletScreen extends StatefulWidget {
  final ApiService api;
  final String? submenu;
  const PalletScreen({super.key, required this.api, this.submenu});

  @override
  State<PalletScreen> createState() => _PalletScreenState();
}

class _PalletScreenState extends State<PalletScreen> {
  List<dynamic> pallets = [];
  bool loading = true;
  String query = '';

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() => loading = true);
    try {
      final data = await widget.api.get('/pallets');
      pallets = data is List ? data : [];
    } catch (e) {
      _msg(e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void _msg(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  Future<void> scanPallet() async {
    final code = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const BarcodeScannerScreen(title: 'Scan Pallet')),
    );
    if (code == null) return;
    try {
      final result = await widget.api.post('/pallets/validate-barcode', {'barcode': code});
      final matches = result is Map && result['matches'] is List ? result['matches'] as List : [];
      if (matches.isEmpty) {
        _msg('Barcode tidak ditemukan.');
        return;
      }
      final first = matches.first;
      if (first is Map && first['palletId'] != null) {
        _openDetail('${first['palletId']}');
      }
    } catch (e) {
      _msg(e.toString());
    }
  }

  Future<void> scanSku() async {
    final code = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const BarcodeScannerScreen(title: 'Scan SKU')),
    );
    if (code == null) return;
    try {
      final result = await widget.api.post('/pallets/validate-barcode', {'barcode': code});
      if (!mounted) return;
      final matches = result is Map && result['matches'] is List ? result['matches'] as List : [];
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Hasil Scan'),
          content: matches.isEmpty
              ? Text('Barcode $code tidak ditemukan.')
              : SizedBox(
                  width: double.maxFinite,
                  child: ListView(
                    shrinkWrap: true,
                    children: matches.map((raw) {
                      final m = raw is Map ? raw : <String, dynamic>{};
                      final item = m['item'] is Map ? m['item'] as Map : {};
                      return ListTile(
                        title: Text('${item['itemName'] ?? '-'}'),
                        subtitle: Text('SKU: ${item['sku'] ?? '-'} • Pallet: ${m['palletId'] ?? '-'}'),
                        onTap: () {
                          Navigator.pop(context);
                          _openDetail('${m['palletId']}');
                        },
                      );
                    }).toList(),
                  ),
                ),
          actions: [TextButton(onPressed: () => Navigator.pop(context), child: const Text('Tutup'))],
        ),
      );
    } catch (e) {
      _msg(e.toString());
    }
  }

  void _openDetail(String id) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => PalletDetailScreen(api: widget.api, palletId: id)),
    ).then((_) => load());
  }

  @override
  Widget build(BuildContext context) {
    final filtered = pallets.where((raw) {
      final p = raw is Map ? raw : <String, dynamic>{};
      final text = [
        p['id'], p['name'], p['status'], p['state'], p['validationStatus'],
        p['locationStatus'], p['location'],
      ].join(' ').toLowerCase();
      return text.contains(query.toLowerCase());
    }).toList();

    final mode = widget.submenu ?? 'Master Data Pallet';

    return RefreshIndicator(
      onRefresh: load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(mode, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 5),
          Text(_description(mode), style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 16),
          if (mode == 'Barcode & SKU') ...[
            FilledButton.icon(onPressed: scanPallet, icon: const Icon(Icons.inventory_2), label: const Text('Scan Barcode Pallet')),
            const SizedBox(height: 10),
            OutlinedButton.icon(onPressed: scanSku, icon: const Icon(Icons.qr_code_2), label: const Text('Scan Barcode SKU')),
            const SizedBox(height: 20),
          ],
          if (mode == 'Summary Fisik') _summaryOverview(),
          TextField(
            onChanged: (v) => setState(() => query = v),
            decoration: const InputDecoration(prefixIcon: Icon(Icons.search), labelText: 'Cari pallet / SKU / barang'),
          ),
          const SizedBox(height: 12),
          if (loading) const LinearProgressIndicator(),
          const SizedBox(height: 8),
          if (filtered.isEmpty && !loading)
            const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('Data pallet tidak ditemukan.'))),
          ...filtered.map(_card),
        ],
      ),
    );
  }

  String _description(String mode) {
    switch (mode) {
      case 'Manajer Barang Dalam Palet':
        return 'Buka pallet untuk tambah, edit, hapus, dan scan barang.';
      case 'Barcode & SKU':
        return 'Gunakan kamera HP untuk validasi barcode pallet atau SKU melalui API.';
      case 'Summary Fisik':
        return 'Ringkasan jumlah SKU, kemasan, dan berat dari data backend.';
      case 'Riwayat Posisi':
        return 'Pilih pallet untuk melihat riwayat perpindahan posisi.';
      default:
        return 'Cari pallet dan buka detail operasional.';
    }
  }

  Widget _summaryOverview() {
    num weight = 0, cartons = 0, sacks = 0, boxes = 0, packages = 0;
    int sku = 0;
    for (final raw in pallets) {
      if (raw is! Map) continue;
      final s = raw['summary'] is Map ? raw['summary'] as Map : {};
      weight += num.tryParse('${s['totalWeight'] ?? 0}') ?? 0;
      cartons += num.tryParse('${s['totalCartons'] ?? 0}') ?? 0;
      sacks += num.tryParse('${s['totalSacks'] ?? 0}') ?? 0;
      boxes += num.tryParse('${s['totalBoxes'] ?? 0}') ?? 0;
      packages += num.tryParse('${s['totalPackages'] ?? 0}') ?? 0;
      sku += int.tryParse('${s['totalSku'] ?? 0}') ?? 0;
    }
    return Column(children: [
      Row(children: [
        _metric('SKU', '$sku'), _metric('Berat', '${weight.toStringAsFixed(1)} kg'),
      ]),
      Row(children: [
        _metric('Karton', '$cartons'), _metric('Karung', '$sacks'),
      ]),
      Row(children: [
        _metric('Box', '$boxes'), _metric('Kemasan', '$packages'),
      ]),
      const SizedBox(height: 8),
    ]);
  }

  Widget _metric(String label, String value) => Expanded(
    child: Card(child: Padding(
      padding: const EdgeInsets.all(12),
      child: Column(children: [
        Text(value, style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18)),
        Text(label, style: const TextStyle(color: Colors.grey)),
      ]),
    )),
  );

  Widget _card(dynamic raw) {
    final p = raw is Map ? raw : <String, dynamic>{};
    final s = p['summary'] is Map ? p['summary'] as Map : {};
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: ListTile(
        contentPadding: const EdgeInsets.all(14),
        leading: const CircleAvatar(child: Icon(Icons.inventory_2_outlined)),
        title: Text('${p['id'] ?? '-'}', style: const TextStyle(fontWeight: FontWeight.w800)),
        subtitle: Text(
          '${p['name'] ?? '-'}\n'
          'Status: ${p['state'] ?? p['status'] ?? '-'} • '
          'Validasi: ${p['validationStatus'] ?? '-'}\n'
          'SKU: ${s['totalSku'] ?? 0} • Berat: ${s['totalWeight'] ?? 0} kg',
        ),
        isThreeLine: true,
        trailing: const Icon(Icons.chevron_right),
        onTap: () => _openDetail('${p['id']}'),
      ),
    );
  }
}

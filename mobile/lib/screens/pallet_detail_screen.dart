
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'barcode_scanner_screen.dart';
import 'update_position_screen.dart';
class PalletDetailScreen extends StatefulWidget {
  final ApiService api;
  final String palletId;
  const PalletDetailScreen({super.key, required this.api, required this.palletId});

  @override
  State<PalletDetailScreen> createState() => _PalletDetailScreenState();
}

class _PalletDetailScreenState extends State<PalletDetailScreen> {
  Map<String, dynamic>? pallet;
  List<dynamic> history = [];
  bool loading = true;

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() => loading = true);
    try {
      final p = await widget.api.get('/pallets/${Uri.encodeComponent(widget.palletId)}');
      pallet = p is Map ? Map<String, dynamic>.from(p) : null;
      final h = await widget.api.get('/pallets/${Uri.encodeComponent(widget.palletId)}/position-history');
      history = h is List ? h : [];
    } catch (e) {
      _msg(e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  List<dynamic> get items => pallet?['items'] is List ? pallet!['items'] as List : [];

  Future<void> _addOrEdit([Map<String, dynamic>? item]) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (_) => ItemFormSheet(
        api: widget.api,
        palletId: widget.palletId,
        item: item,
      ),
    );
    if (saved == true) load();
  }

  Future<void> _deleteItem(String itemId) async {
    final yes = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Hapus barang?'),
        content: const Text('Barang akan dihapus dari pallet melalui API backend.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Batal')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Hapus')),
        ],
      ),
    );
    if (yes != true) return;
    try {
      await widget.api.delete('/pallets/${Uri.encodeComponent(widget.palletId)}/items/$itemId');
      _msg('Barang berhasil dihapus');
      load();
    } catch (e) {
      _msg(e.toString());
    }
  }

  Future<void> _scanSku() async {
    final code = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const BarcodeScannerScreen(title: 'Scan SKU')),
    );
    if (code == null) return;
    final found = items.where((x) => x is Map && '${x['barcode'] ?? ''}' == code).toList();
    if (found.isEmpty) {
      _msg('Barcode $code tidak ditemukan di pallet ini.');
      return;
    }
    final item = found.first as Map;
    if (!mounted) return;
    showModalBottomSheet(
      context: context,
      builder: (_) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('${item['itemName'] ?? '-'}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            Text('SKU: ${item['sku'] ?? '-'}'),
            Text('Barcode: ${item['barcode'] ?? '-'}'),
            Text('Karton: ${item['cartonQty'] ?? 0} • Karung: ${item['sackQty'] ?? 0} • Box: ${item['boxQty'] ?? 0}'),
            Text('Kemasan: ${item['packageQty'] ?? 0} • Berat: ${item['weightKg'] ?? 0} kg'),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  Future<void> _move() async {
    if (pallet == null) return;
    final changed = await Navigator.push<bool>(
      context,
      MaterialPageRoute(
        builder: (_) => UpdatePositionScreen(
          api: widget.api,
          palletId: widget.palletId,
          pallet: pallet!,
        ),
      ),
    );
    if (changed == true) load();
  }

  void _msg(String value) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(value)));
  }

  String _location() {
    final loc = pallet?['location'];
    if (loc is Map) {
      return [
        loc['warehouseCode'] ?? loc['warehouseName'],
        loc['coldStorageCode'] ?? loc['coldStorageName'],
        loc['rackCode'],
        loc['levelCode'],
        loc['slotCode'],
      ].where((x) => x != null && '$x'.isNotEmpty).join(' / ');
    }
    return 'Belum ditempatkan';
  }

  @override
  Widget build(BuildContext context) {
    final summary = pallet?['summary'] is Map ? pallet!['summary'] as Map : {};
    return Scaffold(
      appBar: AppBar(
        title: Text('${pallet?['id'] ?? widget.palletId}', style: const TextStyle(fontWeight: FontWeight.w800)),
      ),
      body: RefreshIndicator(
        onRefresh: load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (loading) const LinearProgressIndicator(),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text('${pallet?['name'] ?? '-'}', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 6),
                  Text('Status: ${pallet?['state'] ?? pallet?['status'] ?? '-'}'),
                  Text('Validasi: ${pallet?['validationStatus'] ?? '-'}'),
                  Text('Posisi: $_location()'),
                ]),
              ),
            ),
            const SizedBox(height: 10),
            Row(children: [
              _summaryCard('Item', '${summary['itemCount'] ?? items.length}'),
              _summaryCard('SKU', '${summary['skuCount'] ?? summary['totalSku'] ?? 0}'),
              _summaryCard('Berat', '${summary['totalWeight'] ?? 0} kg'),
            ]),
            const SizedBox(height: 12),
            Row(children: [
              Expanded(child: FilledButton.icon(onPressed: () => _addOrEdit(), icon: const Icon(Icons.add), label: const Text('Tambah Barang'))),
              const SizedBox(width: 8),
              Expanded(child: OutlinedButton.icon(onPressed: _scanSku, icon: const Icon(Icons.qr_code_scanner), label: const Text('Scan SKU'))),
            ]),
            const SizedBox(height: 8),
            SizedBox(width: double.infinity, child: OutlinedButton.icon(onPressed: _move, icon: const Icon(Icons.open_with), label: const Text('Update Posisi'))),
            const SizedBox(height: 22),
            const Text('Barang Dalam Pallet', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            if (items.isEmpty) const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('Belum ada barang.'))),
            ...items.map((raw) {
              if (raw is! Map) return const SizedBox.shrink();
              final item = Map<String, dynamic>.from(raw);
              return Card(
                child: ListTile(
                  title: Text('${item['itemName'] ?? '-'}', style: const TextStyle(fontWeight: FontWeight.w800)),
                  subtitle: Text(
                    'SKU: ${item['sku'] ?? '-'}\n'
                    'Package ${item['packageQty'] ?? 0} • Karton ${item['cartonQty'] ?? 0} • Karung ${item['sackQty'] ?? 0} • Box ${item['boxQty'] ?? 0}\n'
                    'Berat: ${item['weightKg'] ?? 0} kg • Barcode: ${item['barcode'] ?? '-'}',
                  ),
                  isThreeLine: true,
                  trailing: PopupMenuButton<String>(
                    onSelected: (v) {
                      if (v == 'edit') _addOrEdit(item);
                      if (v == 'delete') _deleteItem('${item['id']}');
                    },
                    itemBuilder: (_) => const [
                      PopupMenuItem(value: 'edit', child: Text('Edit')),
                      PopupMenuItem(value: 'delete', child: Text('Hapus')),
                    ],
                  ),
                ),
              );
            }),
            const SizedBox(height: 20),
            const Text('Riwayat Posisi', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
            const SizedBox(height: 8),
            if (history.isEmpty) const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('Belum ada riwayat posisi.'))),
            ...history.map((raw) {
              final h = raw is Map ? raw : <String, dynamic>{};
              return Card(child: ListTile(
                leading: const Icon(Icons.history),
                title: Text('${h['to'] ?? h['slotCode'] ?? 'Movement'}'),
                subtitle: Text('${h['movedAt'] ?? h['createdAt'] ?? '-'} • ${h['username'] ?? '-'}'),
              ));
            }),
          ],
        ),
      ),
    );
  }

  Widget _summaryCard(String label, String value) => Expanded(
    child: Card(child: Padding(
      padding: const EdgeInsets.all(12),
      child: Column(children: [
        Text(value, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w900)),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(color: Colors.grey)),
      ]),
    )),
  );
}

class ItemFormSheet extends StatefulWidget {
  final ApiService api;
  final String palletId;
  final Map<String, dynamic>? item;
  const ItemFormSheet({super.key, required this.api, required this.palletId, this.item});

  @override
  State<ItemFormSheet> createState() => _ItemFormSheetState();
}

class _ItemFormSheetState extends State<ItemFormSheet> {
  late final TextEditingController sku, name, type, packaging, packageQty, cartonQty, sackQty, boxQty, weight, barcode;
  bool saving = false;
  bool get editing => widget.item != null;

  @override
  void initState() {
    super.initState();
    final x = widget.item ?? {};
    sku = TextEditingController(text: '${x['sku'] ?? ''}');
    name = TextEditingController(text: '${x['itemName'] ?? ''}');
    type = TextEditingController(text: '${x['itemType'] ?? ''}');
    packaging = TextEditingController(text: '${x['packaging'] ?? ''}');
    packageQty = TextEditingController(text: '${x['packageQty'] ?? 0}');
    cartonQty = TextEditingController(text: '${x['cartonQty'] ?? 0}');
    sackQty = TextEditingController(text: '${x['sackQty'] ?? 0}');
    boxQty = TextEditingController(text: '${x['boxQty'] ?? 0}');
    weight = TextEditingController(text: '${x['weightKg'] ?? 0}');
    barcode = TextEditingController(text: '${x['barcode'] ?? ''}');
  }

  @override
  void dispose() {
    for (final c in [sku, name, type, packaging, packageQty, cartonQty, sackQty, boxQty, weight, barcode]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> save() async {
    if (sku.text.trim().isEmpty || name.text.trim().isEmpty) {
      _msg('SKU dan nama barang wajib diisi.');
      return;
    }
    setState(() => saving = true);
    final body = {
      'sku': sku.text.trim(),
      'itemName': name.text.trim(),
      'itemType': type.text.trim(),
      'packaging': packaging.text.trim(),
      'packageQty': int.tryParse(packageQty.text) ?? 0,
      'cartonQty': int.tryParse(cartonQty.text) ?? 0,
      'sackQty': int.tryParse(sackQty.text) ?? 0,
      'boxQty': int.tryParse(boxQty.text) ?? 0,
      'weightKg': double.tryParse(weight.text) ?? 0,
      'barcode': barcode.text.trim(),
    };
    try {
      if (editing) {
        await widget.api.put('/pallets/${Uri.encodeComponent(widget.palletId)}/items/${widget.item!['id']}', body);
      } else {
        await widget.api.post('/pallets/${Uri.encodeComponent(widget.palletId)}/items', body);
      }
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      _msg(e.toString());
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  void _msg(String value) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(value)));
  }

  @override
  Widget build(BuildContext context) {
    final bottom = MediaQuery.of(context).viewInsets.bottom;
    return Padding(
      padding: EdgeInsets.only(bottom: bottom),
      child: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(editing ? 'Edit Barang' : 'Tambah Barang', style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
            const SizedBox(height: 16),
            _field('SKU', sku),
            _field('Nama Barang', name),
            _field('Jenis Barang', type),
            _field('Kemasan', packaging),
            _field('Package', packageQty, numeric: true),
            _field('Karton', cartonQty, numeric: true),
            _field('Karung', sackQty, numeric: true),
            _field('Box', boxQty, numeric: true),
            _field('Berat (kg)', weight, numeric: true),
            _field('Barcode', barcode),
            const SizedBox(height: 8),
            SizedBox(width: double.infinity, child: FilledButton(onPressed: saving ? null : save, child: Text(saving ? 'Menyimpan...' : 'Simpan'))),
          ]),
        ),
      ),
    );
  }

  Widget _field(String label, TextEditingController c, {bool numeric = false}) => Padding(
    padding: const EdgeInsets.only(bottom: 10),
    child: TextField(
      controller: c,
      keyboardType: numeric ? const TextInputType.numberWithOptions(decimal: true) : TextInputType.text,
      decoration: InputDecoration(labelText: label),
    ),
  );
}

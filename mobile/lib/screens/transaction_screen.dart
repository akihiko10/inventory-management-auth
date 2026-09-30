
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'barcode_scanner_screen.dart';

class TransactionScreen extends StatefulWidget {
  final ApiService api;
  final String? submenu;
  const TransactionScreen({super.key, required this.api, this.submenu});

  @override
  State<TransactionScreen> createState() => _TransactionScreenState();
}

class _TransactionScreenState extends State<TransactionScreen> {
  List<dynamic> pallets = [];
  List<dynamic> transactions = [];
  List<dynamic> drafts = [];
  Map<String, dynamic>? selectedPallet;
  final Map<String, Map<String, TextEditingController>> qtyControllers = {};
  final Set<String> selectedItems = {};
  final driver = TextEditingController();
  final nopol = TextEditingController();
  final newSku = TextEditingController();
  final newName = TextEditingController();
  final newBarcode = TextEditingController();
  final newPackage = TextEditingController(text: '0');
  final newCarton = TextEditingController(text: '0');
  final newSack = TextEditingController(text: '0');
  final newBox = TextEditingController(text: '0');
  final newWeight = TextEditingController(text: '0');

  bool loading = true;
  bool saving = false;

  String get type => widget.submenu == 'Gateway Outbound' ? 'outbound' : 'inbound';
  bool get isDraftPage => widget.submenu == 'Transaksi Draf';

  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void dispose() {
    driver.dispose();
    nopol.dispose();
    newSku.dispose();
    newName.dispose();
    newBarcode.dispose();
    newPackage.dispose();
    newCarton.dispose();
    newSack.dispose();
    newBox.dispose();
    newWeight.dispose();
    for (final group in qtyControllers.values) {
    for (final c in group.values) {
      c.dispose();
    }
  }
    super.dispose();
  }

  Future<void> load() async {
    setState(() => loading = true);
    try {
      final p = await widget.api.get('/pallets');
      final t = await widget.api.get('/transactions?type=$type');
      final d = await widget.api.get('/transactions/drafts');
      pallets = p is List ? p : [];
      transactions = t is List ? t : [];
      drafts = d is List ? d : [];
    } catch (e) {
      _msg(e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> selectPallet(Map<String, dynamic> summary) async {
    final id = '${summary['id']}';
    try {
      final result = await widget.api.get('/pallets/${Uri.encodeComponent(id)}');
      selectedPallet = result is Map ? Map<String, dynamic>.from(result) : summary;
      selectedItems.clear();
      _resetItemControllers();
      setState(() {});
    } catch (e) {
      _msg(e.toString());
    }
  }

  void _resetItemControllers() {
    for (final group in qtyControllers.values) {
    for (final c in group.values) {
      c.dispose();
    }
  }
    qtyControllers.clear();
    final items = selectedPallet?['items'] is List ? selectedPallet!['items'] as List : [];
    for (final raw in items) {
      if (raw is! Map) continue;
      final id = '${raw['id']}';
      qtyControllers[id] = {
        'packageQty': TextEditingController(text: '0'),
        'cartonQty': TextEditingController(text: '0'),
        'sackQty': TextEditingController(text: '0'),
        'boxQty': TextEditingController(text: '0'),
        'weightKg': TextEditingController(text: '0'),
      };
    }
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
        _msg('Barcode pallet tidak ditemukan.');
        return;
      }
      final id = matches.first is Map ? matches.first['palletId'] : null;
      final found = pallets.where((p) => p is Map && '${p['id']}' == '$id').toList();
      if (found.isNotEmpty) {
        selectPallet(Map<String, dynamic>.from(found.first as Map));
      } else if (id != null) {
        selectPallet({'id': id});
      }
    } catch (e) {
      _msg(e.toString());
    }
  }

  Map<String, dynamic> _transactionBody({required bool direct}) {
    final items = <Map<String, dynamic>>[];
    final rawItems = selectedPallet?['items'] is List ? selectedPallet!['items'] as List : [];
    for (final raw in rawItems) {
      if (raw is! Map) continue;
      final id = '${raw['id']}';
      if (!selectedItems.contains(id)) continue;
      final c = qtyControllers[id]!;
      items.add({
        'itemId': raw['id'],
        'sku': raw['sku'] ?? '',
        'itemName': raw['itemName'] ?? '',
        'itemType': raw['itemType'] ?? '',
        'packaging': raw['packaging'] ?? '-',
        'packageQty': int.tryParse(c['packageQty']!.text) ?? 0,
        'cartonQty': int.tryParse(c['cartonQty']!.text) ?? 0,
        'sackQty': int.tryParse(c['sackQty']!.text) ?? 0,
        'boxQty': int.tryParse(c['boxQty']!.text) ?? 0,
        'weightKg': double.tryParse(c['weightKg']!.text) ?? 0,
        'barcode': raw['barcode'] ?? '',
        'selected': true,
      });
    }

    if (type == 'inbound' && newSku.text.trim().isNotEmpty) {
      items.add({
        'itemId': null,
        'sku': newSku.text.trim(),
        'itemName': newName.text.trim(),
        'itemType': '',
        'packaging': 'Karton',
        'packageQty': int.tryParse(newPackage.text) ?? 0,
        'cartonQty': int.tryParse(newCarton.text) ?? 0,
        'sackQty': int.tryParse(newSack.text) ?? 0,
        'boxQty': int.tryParse(newBox.text) ?? 0,
        'weightKg': double.tryParse(newWeight.text) ?? 0,
        'barcode': newBarcode.text.trim(),
        'selected': true,
      });
    }

    return {
      'type': type,
      'palletId': selectedPallet?['id'],
      'driverName': driver.text.trim(),
      'nopol': nopol.text.trim(),
      'items': items,
    };
  }

  Future<void> submit({required bool direct}) async {
    if (selectedPallet == null) {
      _msg('Pilih pallet terlebih dahulu.');
      return;
    }
    if (driver.text.trim().isEmpty || nopol.text.trim().isEmpty) {
      _msg('Nama driver dan nopol wajib diisi.');
      return;
    }

    final body = _transactionBody(direct: direct);
    final items = body['items'] as List;
    if (items.isEmpty) {
      _msg('Pilih minimal satu barang atau masukkan SKU baru untuk inbound.');
      return;
    }

    setState(() => saving = true);
    try {
      final result = await widget.api.post(
        direct ? '/transactions' : '/transactions/drafts',
        body,
      );
      _msg(result is Map && result['message'] != null
          ? '${result['message']}'
          : direct ? 'Transaksi berhasil disimpan.' : 'Draft berhasil dibuat.');
      _clearForm();
      await load();
    } catch (e) {
      _msg(e.toString());
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  void _clearForm() {
    selectedPallet = null;
    selectedItems.clear();
    driver.clear();
    nopol.clear();
    newSku.clear();
    newName.clear();
    newBarcode.clear();
   for (final c in [
  newPackage,
  newCarton,
  newSack,
  newBox,
  newWeight,
]) {
  c.text = '0';
}

_resetItemControllers();

setState(() {});
  }

  Future<void> verify(String id) async {
    try {
      await widget.api.put('/transactions/drafts/$id/verify', {'note': 'Diverifikasi melalui mobile'});
      _msg('Draft berhasil diverifikasi.');
      load();
    } catch (e) {
      _msg(e.toString());
    }
  }

  Future<void> reject(String id) async {
    try {
      await widget.api.put('/transactions/drafts/$id/reject', {'note': 'Draft ditolak melalui mobile'});
      _msg('Draft ditolak.');
      load();
    } catch (e) {
      _msg(e.toString());
    }
  }

  void _msg(String text) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(text)));
  }

  @override
  Widget build(BuildContext context) {
    if (widget.submenu == 'Dispatch Driver & Nopol') return _dispatch();
    if (widget.submenu == 'Transaksi Draf') return _drafts();
    if (widget.submenu == 'Log & Riwayat') return _logs();
    return _transactionPage();
  }

  Widget _transactionPage() {
    final title = type == 'inbound' ? 'Gateway Inbound' : 'Gateway Outbound';
    return RefreshIndicator(
      onRefresh: load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(title, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 5),
          Text(
            type == 'inbound'
                ? 'Pilih pallet, barang, quantity fisik, driver dan nopol lalu kirim ke API.'
                : 'Pilih pallet dan barang yang tersedia, lalu tentukan quantity outbound.',
            style: const TextStyle(color: Colors.grey),
          ),
          const SizedBox(height: 16),
          if (loading) const LinearProgressIndicator(),
          _palletSelector(),
          if (selectedPallet != null) ...[
            const SizedBox(height: 12),
            _headerForm(),
            const SizedBox(height: 12),
            _itemPicker(),
            if (type == 'inbound') ...[
              const SizedBox(height: 12),
              _newInboundItem(),
            ],
            const SizedBox(height: 14),
            Row(children: [
              Expanded(child: OutlinedButton(
                onPressed: saving ? null : () => submit(direct: false),
                child: const Text('Simpan Draft'),
              )),
              const SizedBox(width: 10),
              Expanded(child: FilledButton(
                onPressed: saving ? null : () => submit(direct: true),
                child: Text(saving ? 'Menyimpan...' : 'Selesaikan'),
              )),
            ]),
          ],
          const SizedBox(height: 24),
          Text('Riwayat ${type == 'inbound' ? 'Inbound' : 'Outbound'}',
              style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          ...transactions.take(30).map(_transactionCard),
        ],
      ),
    );
  }

  Widget _palletSelector() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('1. Pilih Pallet', style: TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(
              child: DropdownButtonFormField<String>(
                initialValue: selectedPallet?['id']?.toString(),
                decoration: const InputDecoration(labelText: 'Pallet'),
                items: pallets.whereType<Map>().map((p) {
                  return DropdownMenuItem<String>(
                    value: '${p['id']}',
                    child: Text('${p['id']} • ${p['name'] ?? '-'}'),
                  );
                }).toList(),
                onChanged: (id) {
                  if (id == null) return;
                  final p = pallets.firstWhere((x) => x is Map && '${x['id']}' == id);
                  selectPallet(Map<String, dynamic>.from(p as Map));
                },
              ),
            ),
            const SizedBox(width: 8),
            IconButton.filled(
              onPressed: scanPallet,
              icon: const Icon(Icons.qr_code_scanner),
              tooltip: 'Scan pallet',
            ),
          ]),
        ]),
      ),
    );
  }

  Widget _headerForm() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('2. Driver & Armada', style: TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 10),
          TextField(controller: driver, decoration: const InputDecoration(labelText: 'Nama Driver')),
          const SizedBox(height: 10),
          TextField(controller: nopol, textCapitalization: TextCapitalization.characters, decoration: const InputDecoration(labelText: 'Nopol Armada')),
        ]),
      ),
    );
  }

  Widget _itemPicker() {
    final items = selectedPallet?['items'] is List ? selectedPallet!['items'] as List : [];
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('3. Pilih Barang', style: TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          Text(type == 'outbound' ? 'Hanya barang yang ada di pallet yang dapat dipilih.' : 'Barang yang sudah ada dapat ditambah quantity-nya.'),
          const SizedBox(height: 8),
          if (items.isEmpty)
            const Padding(padding: EdgeInsets.all(8), child: Text('Belum ada barang. Untuk inbound gunakan form SKU baru di bawah.')),
          ...items.map((raw) {
            if (raw is! Map) return const SizedBox.shrink();
            final item = Map<String, dynamic>.from(raw);
            final id = '${item['id']}';
            final controllers = qtyControllers[id]!;
            final selected = selectedItems.contains(id);
            return Card(
              color: selected ? const Color(0xFF4F64A3).withValues(alpha: .06) : null,
              child: Padding(
                padding: const EdgeInsets.all(10),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  CheckboxListTile(
                    contentPadding: EdgeInsets.zero,
                    value: selected,
                    onChanged: (v) => setState(() => v == true ? selectedItems.add(id) : selectedItems.remove(id)),
                    title: Text('${item['itemName'] ?? '-'}', style: const TextStyle(fontWeight: FontWeight.w800)),
                    subtitle: Text('SKU ${item['sku'] ?? '-'} • Stok: ${_stockText(item)}'),
                  ),
                  if (selected) _qtyFields(controllers, item),
                ]),
              ),
            );
          }),
        ]),
      ),
    );
  }

  String _stockText(Map item) =>
      'Karton ${item['cartonQty'] ?? 0}, Karung ${item['sackQty'] ?? 0}, Box ${item['boxQty'] ?? 0}, Kemasan ${item['packageQty'] ?? 0}, ${item['weightKg'] ?? 0} kg';

  Widget _qtyFields(Map<String, TextEditingController> c, Map item) {
    final fields = [
      ('Package', 'packageQty'),
      ('Karton', 'cartonQty'),
      ('Karung', 'sackQty'),
      ('Box', 'boxQty'),
      ('Berat kg', 'weightKg'),
    ];
    return Column(children: [
      Row(children: fields.take(2).map((f) => Expanded(child: Padding(
        padding: const EdgeInsets.only(right: 5),
        child: TextField(controller: c[f.$2], keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: InputDecoration(labelText: f.$1)),
      ))).toList()),
      Row(children: fields.skip(2).map((f) => Expanded(child: Padding(
        padding: const EdgeInsets.only(right: 5),
        child: TextField(controller: c[f.$2], keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: InputDecoration(labelText: f.$1)),
      ))).toList()),
    ]);
  }

  Widget _newInboundItem() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('4. Barang Baru untuk Inbound', style: TextStyle(fontWeight: FontWeight.w900)),
          const SizedBox(height: 4),
          const Text('Isi SKU dan nama jika barang belum ada di pallet. Backend akan menambah item saat transaksi dikonfirmasi.'),
          const SizedBox(height: 10),
          TextField(controller: newSku, decoration: const InputDecoration(labelText: 'SKU')),
          const SizedBox(height: 10),
          TextField(controller: newName, decoration: const InputDecoration(labelText: 'Nama Barang')),
          const SizedBox(height: 10),
          TextField(controller: newBarcode, decoration: const InputDecoration(labelText: 'Barcode (opsional)')),
          const SizedBox(height: 10),
          Row(children: [
            Expanded(child: _newField('Package', newPackage)),
            const SizedBox(width: 6),
            Expanded(child: _newField('Karton', newCarton)),
          ]),
          Row(children: [
            Expanded(child: _newField('Karung', newSack)),
            const SizedBox(width: 6),
            Expanded(child: _newField('Box', newBox)),
          ]),
          _newField('Berat kg', newWeight),
        ]),
      ),
    );
  }

  Widget _newField(String label, TextEditingController c) => Padding(
    padding: const EdgeInsets.only(top: 8),
    child: TextField(controller: c, keyboardType: const TextInputType.numberWithOptions(decimal: true), decoration: InputDecoration(labelText: label)),
  );

  Widget _transactionCard(dynamic raw) {
    final x = raw is Map ? raw : <String, dynamic>{};
    return Card(child: ListTile(
      leading: CircleAvatar(child: Icon(type == 'outbound' ? Icons.outbox : Icons.move_to_inbox)),
      title: Text('${x['id'] ?? '-'} • ${x['type'] ?? '-'}'),
      subtitle: Text('${x['palletName'] ?? x['palletId'] ?? '-'} • ${x['driverName'] ?? '-'} • ${x['nopol'] ?? '-'}'),
      trailing: Text('${x['status'] ?? '-'}'),
    ));
  }

  Widget _drafts() {
    return RefreshIndicator(
      onRefresh: load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Transaksi Draf', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 6),
          const Text('Draft pending yang dapat diverifikasi dari mobile.'),
          const SizedBox(height: 16),
          if (loading) const LinearProgressIndicator(),
          ...drafts.map((raw) {
            final x = raw is Map ? raw : <String, dynamic>{};
            final id = '${x['id'] ?? ''}';
            return Card(child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${x['id'] ?? '-'}', style: const TextStyle(fontWeight: FontWeight.w900)),
                Text('${x['type'] ?? '-'} • ${x['palletName'] ?? x['palletId'] ?? '-'}'),
                Text('${x['driverName'] ?? '-'} • ${x['nopol'] ?? '-'}'),
                Text('Item: ${x['items'] is List ? (x['items'] as List).length : 0} • Status: ${x['status'] ?? '-'}'),
                Row(children: [
                  Expanded(child: OutlinedButton(onPressed: id.isEmpty ? null : () => reject(id), child: const Text('Tolak'))),
                  const SizedBox(width: 8),
                  Expanded(child: FilledButton(onPressed: id.isEmpty ? null : () => verify(id), child: const Text('Verifikasi'))),
                ]),
              ]),
            ));
          }),
        ],
      ),
    );
  }

  Widget _dispatch() {
    return RefreshIndicator(
      onRefresh: load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Dispatch Driver & Nopol', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 6),
          const Text('Data driver dan nopol berasal dari transaksi backend.'),
          const SizedBox(height: 16),
          ...transactions.map((x) {
            final m = x is Map ? x : <String, dynamic>{};
            return Card(child: ListTile(
              leading: const Icon(Icons.local_shipping_outlined),
              title: Text('${m['driverName'] ?? '-'}'),
              subtitle: Text('${m['nopol'] ?? '-'} • ${m['type'] ?? '-'} • ${m['palletName'] ?? m['palletId'] ?? '-'}'),
              trailing: Chip(label: Text('${m['status'] ?? '-'}')),
            ));
          }),
        ],
      ),
    );
  }

  Widget _logs() {
    return FutureBuilder<dynamic>(
      future: widget.api.get('/transactions/logs'),
      builder: (context, snap) {
        if (snap.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snap.hasError) return Center(child: Text('${snap.error}'));
        final logs = snap.data is List ? snap.data as List : [];
        return ListView(
          padding: const EdgeInsets.all(16),
          children: [
            const Text('Log & Riwayat', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
            const SizedBox(height: 12),
            ...logs.take(100).map((raw) {
              final x = raw is Map ? raw : <String, dynamic>{};
              return Card(child: ListTile(
                leading: const Icon(Icons.history),
                title: Text('${x['action'] ?? '-'} • ${x['type'] ?? '-'}'),
                subtitle: Text('${x['message'] ?? '-'}\n${x['username'] ?? '-'} • ${x['createdAt'] ?? '-'}'),
              ));
            }),
          ],
        );
      },
    );
  }
}

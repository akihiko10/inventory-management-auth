import 'package:flutter/material.dart';

import '../services/api_service.dart';
import 'barcode_scanner_screen.dart';

class TransactionScreen extends StatefulWidget {
  final ApiService api;
  final String? submenu;

  const TransactionScreen({
    super.key,
    required this.api,
    this.submenu,
  });

  @override
  State<TransactionScreen> createState() => _TransactionScreenState();
}

class _TransactionScreenState extends State<TransactionScreen> {
  List<dynamic> pallets = [];
  List<dynamic> transactions = [];
  List<dynamic> drafts = [];

  Map<String, dynamic>? selectedPallet;

  final Set<String> selectedItems = {};

  final Map<String, Map<String, TextEditingController>> quantityControllers =
      {};

  final driverController = TextEditingController();
  final nopolController = TextEditingController();

  final newSkuController = TextEditingController();
  final newNameController = TextEditingController();
  final newBarcodeController = TextEditingController();

  final newPackageController = TextEditingController(text: '0');
  final newCartonController = TextEditingController(text: '0');
  final newSackController = TextEditingController(text: '0');
  final newBoxController = TextEditingController(text: '0');
  final newWeightController = TextEditingController(text: '0');

  bool loading = true;
  bool saving = false;

  String get transactionType {
    return widget.submenu == 'Gateway Outbound' ||
            widget.submenu == 'Outbound - Pilih Pallet' ||
            widget.submenu == 'Outbound - Quantity' ||
            widget.submenu == 'Outbound - Driver'
        ? 'outbound'
        : 'inbound';
  }

  bool get isInbound => transactionType == 'inbound';

  bool get isDraftPage => widget.submenu == 'Transaksi Draf';

  bool get isPendingPage => widget.submenu == 'Pending Verification';

  bool get isHistoryPage => widget.submenu == 'Riwayat Transaksi';

  bool get isLogPage => widget.submenu == 'Log Aktivitas';

  @override
  void initState() {
    super.initState();
    load();
  }

  @override
  void dispose() {
    driverController.dispose();
    nopolController.dispose();

    newSkuController.dispose();
    newNameController.dispose();
    newBarcodeController.dispose();

    newPackageController.dispose();
    newCartonController.dispose();
    newSackController.dispose();
    newBoxController.dispose();
    newWeightController.dispose();

    _disposeQuantityControllers();

    super.dispose();
  }

  void _disposeQuantityControllers() {
    for (final group in quantityControllers.values) {
      for (final controller in group.values) {
        controller.dispose();
      }
    }

    quantityControllers.clear();
  }

  // ============================================================
  // LOAD DATA
  // ============================================================

  Future<void> load() async {
    if (mounted) {
      setState(() {
        loading = true;
      });
    }

    try {
      final palletResponse = await widget.api.get('/pallets');

      final transactionResponse = await widget.api.get(
        '/transactions?type=$transactionType',
      );

      final draftResponse = await widget.api.get(
        '/transactions/drafts',
      );

      pallets = palletResponse is List ? palletResponse : [];

      transactions = transactionResponse is List ? transactionResponse : [];

      drafts = draftResponse is List ? draftResponse : [];
    } catch (e) {
      _message(e.toString());
    } finally {
      if (mounted) {
        setState(() {
          loading = false;
        });
      }
    }
  }

  // ============================================================
  // PALLET
  // ============================================================

  Future<void> selectPallet(
    Map<String, dynamic> palletSummary,
  ) async {
    final id = '${palletSummary['id'] ?? ''}';

    if (id.isEmpty) {
      _message('ID pallet tidak ditemukan.');
      return;
    }

    try {
      final result = await widget.api.get(
        '/pallets/${Uri.encodeComponent(id)}',
      );

      selectedPallet =
          result is Map ? Map<String, dynamic>.from(result) : palletSummary;

      selectedItems.clear();

      _resetQuantityControllers();

      if (mounted) {
        setState(() {});
      }
    } catch (e) {
      _message(e.toString());
    }
  }

  void _resetQuantityControllers() {
    _disposeQuantityControllers();

    final items = selectedPallet?['items'] is List
        ? selectedPallet!['items'] as List
        : [];

    for (final raw in items) {
      if (raw is! Map) continue;

      final itemId = '${raw['id'] ?? ''}';

      if (itemId.isEmpty) continue;

      quantityControllers[itemId] = {
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
      MaterialPageRoute(
        builder: (_) => const BarcodeScannerScreen(
          title: 'Scan Pallet',
        ),
      ),
    );

    if (code == null || code.trim().isEmpty) {
      return;
    }

    try {
      final result = await widget.api.post(
        '/pallets/validate-barcode',
        {
          'barcode': code,
        },
      );

      final matches = result is Map && result['matches'] is List
          ? result['matches'] as List
          : [];

      if (matches.isEmpty) {
        _message(
          'Barcode pallet tidak ditemukan.',
        );
        return;
      }

      final first = matches.first;

      if (first is! Map || first['palletId'] == null) {
        _message(
          'Pallet dari barcode tidak ditemukan.',
        );
        return;
      }

      final palletId = '${first['palletId']}';

      final localPallet = pallets.where((raw) {
        return raw is Map && '${raw['id']}' == palletId;
      }).toList();

      if (localPallet.isNotEmpty && localPallet.first is Map) {
        await selectPallet(
          Map<String, dynamic>.from(
            localPallet.first as Map,
          ),
        );
      } else {
        await selectPallet({
          'id': palletId,
        });
      }
    } catch (e) {
      _message(e.toString());
    }
  }

  // ============================================================
  // ITEM
  // ============================================================

  List<dynamic> get palletItems {
    final raw = selectedPallet?['items'];

    if (raw is List) {
      return raw;
    }

    return [];
  }

  void toggleItem(String itemId) {
    setState(() {
      if (selectedItems.contains(itemId)) {
        selectedItems.remove(itemId);
      } else {
        selectedItems.add(itemId);
      }
    });
  }

  // ============================================================
  // TRANSACTION BODY
  // ============================================================

  Map<String, dynamic> _buildTransactionBody() {
    final selected = <Map<String, dynamic>>[];

    for (final raw in palletItems) {
      if (raw is! Map) continue;

      final itemId = '${raw['id'] ?? ''}';

      if (!selectedItems.contains(itemId)) {
        continue;
      }

      final controllers = quantityControllers[itemId];

      if (controllers == null) {
        continue;
      }

      selected.add({
        'itemId': raw['id'],
        'sku': raw['sku'] ?? '',
        'itemName': raw['itemName'] ?? '',
        'itemType': raw['itemType'] ?? '',
        'packaging': raw['packaging'] ?? '-',
        'packageQty': int.tryParse(
              controllers['packageQty']!.text,
            ) ??
            0,
        'cartonQty': int.tryParse(
              controllers['cartonQty']!.text,
            ) ??
            0,
        'sackQty': int.tryParse(
              controllers['sackQty']!.text,
            ) ??
            0,
        'boxQty': int.tryParse(
              controllers['boxQty']!.text,
            ) ??
            0,
        'weightKg': double.tryParse(
              controllers['weightKg']!.text,
            ) ??
            0,
        'barcode': raw['barcode'] ?? '',
        'selected': true,
      });
    }

    // Barang baru hanya untuk inbound.
    if (isInbound && newSkuController.text.trim().isNotEmpty) {
      selected.add({
        'itemId': null,
        'sku': newSkuController.text.trim(),
        'itemName': newNameController.text.trim(),
        'itemType': '',
        'packaging': 'Karton',
        'packageQty': int.tryParse(
              newPackageController.text,
            ) ??
            0,
        'cartonQty': int.tryParse(
              newCartonController.text,
            ) ??
            0,
        'sackQty': int.tryParse(
              newSackController.text,
            ) ??
            0,
        'boxQty': int.tryParse(
              newBoxController.text,
            ) ??
            0,
        'weightKg': double.tryParse(
              newWeightController.text,
            ) ??
            0,
        'barcode': newBarcodeController.text.trim(),
        'selected': true,
      });
    }

    return {
      'type': transactionType,
      'palletId': selectedPallet?['id'],
      'driverName': driverController.text.trim(),
      'nopol': nopolController.text.trim(),
      'items': selected,
    };
  }

  // ============================================================
  // SUBMIT TRANSACTION
  // ============================================================

  Future<void> submit({
    required bool direct,
  }) async {
    if (selectedPallet == null) {
      _message(
        'Pilih atau scan pallet terlebih dahulu.',
      );
      return;
    }

    if (driverController.text.trim().isEmpty) {
      _message(
        'Nama driver wajib diisi.',
      );
      return;
    }

    if (nopolController.text.trim().isEmpty) {
      _message(
        'Nomor polisi kendaraan wajib diisi.',
      );
      return;
    }

    final body = _buildTransactionBody();

    final items = body['items'] as List;

    if (items.isEmpty) {
      _message(
        isInbound
            ? 'Pilih barang atau masukkan barang baru.'
            : 'Pilih minimal satu barang yang keluar.',
      );
      return;
    }

    setState(() {
      saving = true;
    });

    try {
      final response = await widget.api.post(
        direct ? '/transactions' : '/transactions/drafts',
        body,
      );

      final message = response is Map && response['message'] != null
          ? '${response['message']}'
          : direct
              ? 'Transaksi berhasil disimpan.'
              : 'Draft berhasil dibuat.';

      _message(message);

      _clearForm();

      await load();
    } catch (e) {
      _message(e.toString());
    } finally {
      if (mounted) {
        setState(() {
          saving = false;
        });
      }
    }
  }

  void _clearForm() {
    selectedPallet = null;
    selectedItems.clear();

    driverController.clear();
    nopolController.clear();

    newSkuController.clear();
    newNameController.clear();
    newBarcodeController.clear();

    for (final controller in [
      newPackageController,
      newCartonController,
      newSackController,
      newBoxController,
      newWeightController,
    ]) {
      controller.text = '0';
    }

    _resetQuantityControllers();

    if (mounted) {
      setState(() {});
    }
  }

  // ============================================================
  // DRAFT / VERIFICATION
  // ============================================================

  Future<void> verifyDraft(
    String id,
  ) async {
    if (id.trim().isEmpty) {
      _message(
        'ID draft tidak ditemukan.',
      );
      return;
    }

    try {
      await widget.api.put(
        '/transactions/drafts/$id/verify',
        {
          'note': 'Diverifikasi melalui mobile',
        },
      );

      _message(
        'Draft berhasil diverifikasi.',
      );

      await load();
    } catch (e) {
      _message(e.toString());
    }
  }

  Future<void> rejectDraft(
    String id,
  ) async {
    if (id.trim().isEmpty) {
      _message(
        'ID draft tidak ditemukan.',
      );
      return;
    }

    try {
      await widget.api.put(
        '/transactions/drafts/$id/reject',
        {
          'note': 'Draft ditolak melalui mobile',
        },
      );

      _message(
        'Draft berhasil ditolak.',
      );

      await load();
    } catch (e) {
      _message(e.toString());
    }
  }

  // ============================================================
  // BUILD
  // ============================================================

  @override
  Widget build(BuildContext context) {
    if (isDraftPage) {
      return _buildDraftPage();
    }

    if (isPendingPage) {
      return _buildPendingPage();
    }

    if (isHistoryPage) {
      return _buildHistoryPage();
    }

    if (isLogPage) {
      return _buildLogPage();
    }

    return _buildOperationalPage();
  }

  // ============================================================
  // OPERATIONAL
  // ============================================================

  Widget _buildOperationalPage() {
    final title = isInbound ? 'Inbound' : 'Outbound';

    return RefreshIndicator(
      onRefresh: load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _pageHeader(
            title: title,
            description: isInbound
                ? 'Penerimaan barang ke dalam gudang.'
                : 'Pengeluaran barang dari pallet untuk proses outbound.',
            icon: isInbound
                ? Icons.move_to_inbox_outlined
                : Icons.outbox_outlined,
          ),
          const SizedBox(height: 18),
          if (loading) const LinearProgressIndicator(),
          _stepCard(
            number: '1',
            title: 'Pilih Pallet',
            description:
                'Cari pallet dari daftar atau gunakan kamera untuk scan barcode.',
            child: _palletSelector(),
          ),
          if (selectedPallet != null) ...[
            const SizedBox(height: 12),
            _stepCard(
              number: '2',
              title:
                  isInbound ? 'Cek & Checklist Barang' : 'Pilih Barang Keluar',
              description: isInbound
                  ? 'Periksa barang yang diterima dan pilih item yang sesuai.'
                  : 'Pilih barang dan masukkan jumlah fisik yang keluar.',
              child: _itemSelector(),
            ),
            if (isInbound) ...[
              const SizedBox(height: 12),
              _stepCard(
                number: '3',
                title: 'Barang Baru',
                description:
                    'Jika barang belum terdaftar pada pallet, masukkan data barang baru.',
                child: _newInboundItem(),
              ),
            ],
            const SizedBox(height: 12),
            _stepCard(
              number: isInbound ? '4' : '3',
              title: 'Driver & Kendaraan',
              description:
                  'Masukkan identitas driver dan nomor polisi kendaraan.',
              child: _driverForm(),
            ),
            const SizedBox(height: 12),
            _stepCard(
              number: isInbound ? '5' : '4',
              title: 'Review',
              description: 'Periksa kembali data sebelum menyimpan transaksi.',
              child: _reviewSection(),
            ),
            const SizedBox(height: 16),
            _actionButtons(),
          ],
          const SizedBox(height: 28),
          Text(
            isInbound ? 'Riwayat Inbound' : 'Riwayat Outbound',
            style: const TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 8),
          if (transactions.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'Belum ada transaksi.',
                ),
              ),
            ),
          ...transactions.take(20).map(_transactionCard),
        ],
      ),
    );
  }

  // ============================================================
  // PALLET SELECTOR
  // ============================================================

  Widget _palletSelector() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (selectedPallet != null)
              _selectedPalletCard()
            else
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: scanPallet,
                      icon: const Icon(
                        Icons.qr_code_scanner,
                      ),
                      label: const Text(
                        'Scan Pallet',
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: FilledButton.icon(
                      onPressed: _showPalletPicker,
                      icon: const Icon(
                        Icons.inventory_2_outlined,
                      ),
                      label: const Text(
                        'Pilih Pallet',
                      ),
                    ),
                  ),
                ],
              ),
          ],
        ),
      ),
    );
  }

  Widget _selectedPalletCard() {
    final p = selectedPallet!;

    final summary = p['summary'] is Map ? p['summary'] as Map : {};

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const CircleAvatar(
              child: Icon(
                Icons.inventory_2_outlined,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    '${p['id'] ?? '-'}',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  Text(
                    '${p['name'] ?? '-'}',
                    style: const TextStyle(
                      color: Colors.grey,
                    ),
                  ),
                ],
              ),
            ),
            IconButton(
              onPressed: () {
                setState(() {
                  selectedPallet = null;
                  selectedItems.clear();
                  _resetQuantityControllers();
                });
              },
              icon: const Icon(
                Icons.close,
              ),
            ),
          ],
        ),
        const Divider(),
        Row(
          children: [
            _miniMetric(
              'SKU',
              '${summary['totalSku'] ?? 0}',
            ),
            _miniMetric(
              'Berat',
              '${summary['totalWeight'] ?? 0} kg',
            ),
            _miniMetric(
              'Item',
              '${summary['itemCount'] ?? palletItems.length}',
            ),
          ],
        ),
      ],
    );
  }

  Future<void> _showPalletPicker() async {
    final result = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (_) {
        return SafeArea(
          child: SizedBox(
            height: MediaQuery.of(context).size.height * .75,
            child: Column(
              children: [
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Align(
                    alignment: Alignment.centerLeft,
                    child: Text(
                      'Pilih Pallet',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.w900,
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                    ),
                    itemCount: pallets.length,
                    itemBuilder: (_, index) {
                      final raw = pallets[index];

                      if (raw is! Map) {
                        return const SizedBox();
                      }

                      final pallet = Map<String, dynamic>.from(
                        raw,
                      );

                      final summary = pallet['summary'] is Map
                          ? pallet['summary'] as Map
                          : {};

                      return Card(
                        child: ListTile(
                          leading: const CircleAvatar(
                            child: Icon(
                              Icons.inventory_2,
                            ),
                          ),
                          title: Text(
                            '${pallet['id'] ?? '-'}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                          subtitle: Text(
                            '${pallet['name'] ?? '-'}\n'
                            'SKU: ${summary['totalSku'] ?? 0} • '
                            'Berat: ${summary['totalWeight'] ?? 0} kg',
                          ),
                          isThreeLine: true,
                          onTap: () {
                            Navigator.pop(
                              context,
                              pallet,
                            );
                          },
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );

    if (result != null) {
      await selectPallet(result);
    }
  }

  // ============================================================
  // ITEMS
  // ============================================================

  Widget _itemSelector() {
    if (palletItems.isEmpty) {
      return const Card(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text(
            'Pallet belum memiliki barang.',
          ),
        ),
      );
    }

    return Column(
      children: [
        Row(
          children: [
            Text(
              '${selectedItems.length} barang dipilih',
              style: const TextStyle(
                fontWeight: FontWeight.w700,
              ),
            ),
            const Spacer(),
            TextButton(
              onPressed: () {
                setState(() {
                  if (selectedItems.length == palletItems.length) {
                    selectedItems.clear();
                  } else {
                    selectedItems.clear();

                    for (final raw in palletItems) {
                      if (raw is Map && raw['id'] != null) {
                        selectedItems.add(
                          '${raw['id']}',
                        );
                      }
                    }
                  }
                });
              },
              child: Text(
                selectedItems.length == palletItems.length
                    ? 'Batalkan Semua'
                    : 'Pilih Semua',
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ...palletItems.map(
          _itemCard,
        ),
      ],
    );
  }

  Widget _itemCard(dynamic raw) {
    if (raw is! Map) {
      return const SizedBox();
    }

    final item = Map<String, dynamic>.from(raw);

    final id = '${item['id'] ?? ''}';

    final selected = selectedItems.contains(id);

    final controller = quantityControllers[id];

    return Card(
      margin: const EdgeInsets.only(
        bottom: 10,
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          children: [
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              value: selected,
              onChanged: (_) {
                toggleItem(id);
              },
              title: Text(
                '${item['itemName'] ?? '-'}',
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                ),
              ),
              subtitle: Text(
                'SKU: ${item['sku'] ?? '-'}\n'
                'Stok: '
                'Karton ${item['cartonQty'] ?? 0} • '
                'Karung ${item['sackQty'] ?? 0} • '
                'Box ${item['boxQty'] ?? 0} • '
                'Berat ${item['weightKg'] ?? 0} kg',
              ),
            ),
            if (selected && controller != null) ...[
              const Divider(),
              const Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Jumlah transaksi',
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(
                height: 10,
              ),
              _quantityRow(
                controller,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _quantityRow(
    Map<String, TextEditingController> controllers,
  ) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _numberField(
                'Karton',
                controllers['cartonQty']!,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _numberField(
                'Karung',
                controllers['sackQty']!,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _numberField(
                'Box',
                controllers['boxQty']!,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _numberField(
                'Package',
                controllers['packageQty']!,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        _numberField(
          'Berat (kg)',
          controllers['weightKg']!,
          decimal: true,
        ),
      ],
    );
  }

  // ============================================================
  // INBOUND NEW ITEM
  // ============================================================

  Widget _newInboundItem() {
    return Column(
      children: [
        _textField(
          'SKU Baru',
          newSkuController,
          hint: 'Contoh: SKU-001',
        ),
        const SizedBox(height: 10),
        _textField(
          'Nama Barang Baru',
          newNameController,
          hint: 'Nama barang',
        ),
        const SizedBox(height: 10),
        _textField(
          'Barcode',
          newBarcodeController,
          hint: 'Barcode barang',
        ),
        const SizedBox(height: 10),
        Row(
          children: [
            Expanded(
              child: _numberField(
                'Karton',
                newCartonController,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _numberField(
                'Karung',
                newSackController,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            Expanded(
              child: _numberField(
                'Box',
                newBoxController,
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: _numberField(
                'Package',
                newPackageController,
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        _numberField(
          'Berat (kg)',
          newWeightController,
          decimal: true,
        ),
      ],
    );
  }

  // ============================================================
  // DRIVER
  // ============================================================

  Widget _driverForm() {
    return Column(
      children: [
        _textField(
          'Nama Driver',
          driverController,
          hint: 'Nama pengemudi',
          icon: Icons.person_outline,
        ),
        const SizedBox(height: 10),
        _textField(
          'Nomor Polisi',
          nopolController,
          hint: 'Contoh: B 1234 XYZ',
          icon: Icons.directions_car_outlined,
        ),
      ],
    );
  }

  // ============================================================
  // REVIEW
  // ============================================================

  Widget _reviewSection() {
    final body = _buildTransactionBody();

    final items = body['items'] is List ? body['items'] as List : [];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _reviewRow(
          'Jenis',
          isInbound ? 'INBOUND' : 'OUTBOUND',
        ),
        _reviewRow(
          'Pallet',
          '${selectedPallet?['id'] ?? '-'}',
        ),
        _reviewRow(
          'Driver',
          driverController.text.isEmpty ? '-' : driverController.text,
        ),
        _reviewRow(
          'Nopol',
          nopolController.text.isEmpty ? '-' : nopolController.text,
        ),
        _reviewRow(
          'Jumlah Item',
          '${items.length}',
        ),
      ],
    );
  }

  Widget _reviewRow(
    String label,
    String value,
  ) {
    return Padding(
      padding: const EdgeInsets.only(
        bottom: 8,
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: const TextStyle(
                color: Colors.grey,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ============================================================
  // ACTION
  // ============================================================

  Widget _actionButtons() {
    return Row(
      children: [
        Expanded(
          child: OutlinedButton.icon(
            onPressed: saving
                ? null
                : () {
                    submit(
                      direct: false,
                    );
                  },
            icon: const Icon(
              Icons.save_outlined,
            ),
            label: const Text(
              'Simpan Draft',
            ),
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: FilledButton.icon(
            onPressed: saving
                ? null
                : () {
                    submit(
                      direct: true,
                    );
                  },
            icon: const Icon(
              Icons.check_circle_outline,
            ),
            label: Text(
              saving ? 'Menyimpan...' : 'Konfirmasi',
            ),
          ),
        ),
      ],
    );
  }

  // ============================================================
  // DRAFT PAGE
  // ============================================================

  Widget _buildDraftPage() {
    return RefreshIndicator(
      onRefresh: load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _pageHeader(
            title: 'Draft Transaksi',
            description: 'Transaksi yang masih berupa draft.',
            icon: Icons.drafts_outlined,
          ),
          const SizedBox(height: 16),
          if (loading) const LinearProgressIndicator(),
          if (drafts.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'Belum ada draft transaksi.',
                ),
              ),
            ),
          ...drafts.map(
            (raw) => _draftCard(
              raw,
              showAction: false,
            ),
          ),
        ],
      ),
    );
  }

  // ============================================================
  // PENDING PAGE
  // ============================================================

  Widget _buildPendingPage() {
    final pending = drafts.where((raw) {
      if (raw is! Map) {
        return false;
      }

      final status = '${raw['status'] ?? ''}'.toLowerCase();

      return status == 'pending' || status == 'draft';
    }).toList();

    return RefreshIndicator(
      onRefresh: load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _pageHeader(
            title: 'Pending Verification',
            description: 'Draft transaksi yang menunggu verifikasi.',
            icon: Icons.pending_actions,
          ),
          const SizedBox(height: 16),
          if (pending.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'Tidak ada transaksi pending.',
                ),
              ),
            ),
          ...pending.map(
            (raw) => _draftCard(
              raw,
              showAction: true,
            ),
          ),
        ],
      ),
    );
  }

  Widget _draftCard(
    dynamic raw, {
    required bool showAction,
  }) {
    if (raw is! Map) {
      return const SizedBox();
    }

    final draft = Map<String, dynamic>.from(
      raw,
    );

    // ==========================================================
    // PENTING:
    //
    // Backend menggunakan:
    //
    // Transaction.findOne({
    //   id: req.params.transactionId
    // })
    //
    // Jadi HARUS memakai draft['id'] terlebih dahulu.
    //
    // Jangan memprioritaskan draft['_id'].
    // ==========================================================

    final id = '${draft['id'] ?? draft['_id'] ?? ''}';

    final items = draft['items'] is List ? draft['items'] as List : [];

    return Card(
      margin: const EdgeInsets.only(
        bottom: 12,
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${draft['type'] ?? '-'}'.toUpperCase(),
              style: const TextStyle(
                fontWeight: FontWeight.w900,
              ),
            ),

            const SizedBox(height: 6),

            // ID transaksi ditampilkan supaya
            // gampang memastikan ID yang digunakan.
            Text(
              'ID: ${draft['id'] ?? '-'}',
              style: const TextStyle(
                fontSize: 12,
                color: Colors.grey,
              ),
            ),

            const SizedBox(height: 4),

            Text(
              'Pallet: ${draft['palletId'] ?? '-'}',
            ),

            Text(
              'Driver: ${draft['driverName'] ?? '-'}',
            ),

            Text(
              'Nopol: ${draft['nopol'] ?? '-'}',
            ),

            Text(
              'Status: ${draft['status'] ?? '-'}',
            ),

            Text(
              'Barang: ${items.length}',
            ),

            if (showAction && id.isNotEmpty) ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () {
                        rejectDraft(id);
                      },
                      child: const Text(
                        'Tolak',
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: FilledButton(
                      onPressed: () {
                        verifyDraft(id);
                      },
                      child: const Text(
                        'Verifikasi',
                      ),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  // ============================================================
  // HISTORY
  // ============================================================

  Widget _buildHistoryPage() {
    return RefreshIndicator(
      onRefresh: load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _pageHeader(
            title: 'Riwayat Transaksi',
            description: 'Riwayat inbound dan outbound yang sudah tercatat.',
            icon: Icons.history,
          ),
          const SizedBox(height: 16),
          if (transactions.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'Belum ada riwayat transaksi.',
                ),
              ),
            ),
          ...transactions.map(
            _transactionCard,
          ),
        ],
      ),
    );
  }

  // ============================================================
  // LOG
  // ============================================================

  Widget _buildLogPage() {
    return RefreshIndicator(
      onRefresh: load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _pageHeader(
            title: 'Log Aktivitas',
            description: 'Aktivitas transaksi yang tercatat pada sistem.',
            icon: Icons.list_alt_outlined,
          ),
          const SizedBox(height: 16),
          if (transactions.isEmpty)
            const Card(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text(
                  'Belum ada log aktivitas.',
                ),
              ),
            ),
          ...transactions.map(
            _transactionCard,
          ),
        ],
      ),
    );
  }

  Widget _transactionCard(
    dynamic raw,
  ) {
    if (raw is! Map) {
      return const SizedBox();
    }

    final x = Map<String, dynamic>.from(
      raw,
    );

    final type = '${x['type'] ?? 'transaction'}';

    final outbound = type.toLowerCase() == 'outbound';

    return Card(
      margin: const EdgeInsets.only(
        bottom: 10,
      ),
      child: ListTile(
        leading: CircleAvatar(
          child: Icon(
            outbound ? Icons.outbox_outlined : Icons.move_to_inbox_outlined,
          ),
        ),
        title: Text(
          '${x['id'] ?? '-'} • '
          '${type.toUpperCase()}',
          style: const TextStyle(
            fontWeight: FontWeight.w800,
          ),
        ),
        subtitle: Text(
          '${x['palletName'] ?? x['palletId'] ?? '-'}\n'
          'Driver: ${x['driverName'] ?? '-'} • '
          '${x['nopol'] ?? '-'}',
        ),
        isThreeLine: true,
        trailing: Text(
          '${x['status'] ?? '-'}',
        ),
      ),
    );
  }

  // ============================================================
  // COMMON UI
  // ============================================================

  Widget _pageHeader({
    required String title,
    required String description,
    required IconData icon,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CircleAvatar(
              radius: 24,
              child: Icon(icon),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    description,
                    style: const TextStyle(
                      color: Colors.grey,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _stepCard({
    required String number,
    required String title,
    required String description,
    required Widget child,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  radius: 15,
                  child: Text(
                    number,
                    style: const TextStyle(
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(
                      fontSize: 17,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 5),
            Padding(
              padding: const EdgeInsets.only(
                left: 40,
              ),
              child: Text(
                description,
                style: const TextStyle(
                  color: Colors.grey,
                ),
              ),
            ),
            const SizedBox(height: 14),
            child,
          ],
        ),
      ),
    );
  }

  Widget _miniMetric(
    String label,
    String value,
  ) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w900,
            ),
          ),
          const SizedBox(height: 3),
          Text(
            label,
            style: const TextStyle(
              color: Colors.grey,
              fontSize: 12,
            ),
          ),
        ],
      ),
    );
  }

  Widget _textField(
    String label,
    TextEditingController controller, {
    String? hint,
    IconData? icon,
  }) {
    return TextField(
      controller: controller,
      decoration: InputDecoration(
        labelText: label,
        hintText: hint,
        prefixIcon: icon == null ? null : Icon(icon),
      ),
    );
  }

  Widget _numberField(
    String label,
    TextEditingController controller, {
    bool decimal = false,
  }) {
    return TextField(
      controller: controller,
      keyboardType: TextInputType.numberWithOptions(
        decimal: decimal,
      ),
      decoration: InputDecoration(
        labelText: label,
      ),
    );
  }

  void _message(String message) {
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
      ),
    );
  }
}

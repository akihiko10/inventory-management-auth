import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'barcode_scanner_screen.dart';
import 'update_position_screen.dart';

class PalletDetailScreen extends StatefulWidget {
  final ApiService api;
  final String palletId;

  const PalletDetailScreen({
    super.key,
    required this.api,
    required this.palletId,
  });

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

  // ============================================================
  // LOAD PALLET
  // ============================================================

  Future<void> load() async {
    if (mounted) {
      setState(() {
        loading = true;
      });
    }

    try {
      final palletData = await widget.api.get(
        '/pallets/${Uri.encodeComponent(widget.palletId)}',
      );

      final historyData = await widget.api.get(
        '/pallets/${Uri.encodeComponent(widget.palletId)}/position-history',
      );

      if (!mounted) return;

      setState(() {
        pallet = palletData is Map
            ? Map<String, dynamic>.from(
                palletData,
              )
            : null;

        history = historyData is List ? historyData : [];
      });
    } catch (e) {
      _msg(e.toString());
    } finally {
      if (mounted) {
        setState(() {
          loading = false;
        });
      }
    }
  }

  // ============================================================
  // ITEMS
  // ============================================================

  List<dynamic> get items {
    final data = pallet?['items'];

    return data is List ? data : [];
  }

  // ============================================================
  // MESSAGE
  // ============================================================

  void _msg(String value) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(value),
      ),
    );
  }

  // ============================================================
  // SCAN SKU
  // ============================================================

  Future<void> _scanSku() async {
    final code = await Navigator.push<String>(
      context,
      MaterialPageRoute(
        builder: (_) => const BarcodeScannerScreen(
          title: 'Scan SKU',
        ),
      ),
    );

    if (code == null || code.trim().isEmpty) {
      return;
    }

    final found = items.where((raw) {
      if (raw is! Map) {
        return false;
      }

      return '${raw['barcode'] ?? ''}' == code;
    }).toList();

    if (found.isEmpty) {
      _msg(
        'Barcode $code tidak ditemukan di pallet ini.',
      );
      return;
    }

    final raw = found.first;

    if (raw is Map) {
      _showItemDetail(
        Map<String, dynamic>.from(
          raw,
        ),
      );
    }
  }

  // ============================================================
  // SHOW ITEM DETAIL
  // ============================================================

  void _showItemDetail(
    Map<String, dynamic> item,
  ) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const CircleAvatar(
                      child: Icon(
                        Icons.inventory_2_outlined,
                      ),
                    ),
                    const SizedBox(
                      width: 12,
                    ),
                    Expanded(
                      child: Text(
                        '${item['itemName'] ?? '-'}',
                        style: const TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(
                  height: 20,
                ),
                _infoRow(
                  'SKU',
                  '${item['sku'] ?? '-'}',
                ),
                _infoRow(
                  'Barcode',
                  '${item['barcode'] ?? '-'}',
                ),
                _infoRow(
                  'Jenis',
                  '${item['itemType'] ?? '-'}',
                ),
                _infoRow(
                  'Kemasan',
                  '${item['packaging'] ?? '-'}',
                ),
                const Divider(
                  height: 24,
                ),
                _infoRow(
                  'Package',
                  '${item['packageQty'] ?? 0}',
                ),
                _infoRow(
                  'Karton',
                  '${item['cartonQty'] ?? 0}',
                ),
                _infoRow(
                  'Karung',
                  '${item['sackQty'] ?? 0}',
                ),
                _infoRow(
                  'Box',
                  '${item['boxQty'] ?? 0}',
                ),
                _infoRow(
                  'Berat',
                  '${item['weightKg'] ?? 0} kg',
                ),
                const SizedBox(
                  height: 12,
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  // ============================================================
  // UPDATE POSITION
  // ============================================================

  Future<void> _move() async {
    if (pallet == null) {
      return;
    }

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

    if (changed == true) {
      await load();
    }
  }

  // ============================================================
  // LOCATION
  // ============================================================

  String _location() {
    final location = pallet?['location'];

    if (location is Map) {
      final values = [
        location['warehouseCode'] ?? location['warehouseName'],
        location['coldStorageCode'] ?? location['coldStorageName'],
        location['rackCode'],
        location['levelCode'],
        location['slotCode'],
      ];

      final filtered = values.where(
        (value) => value != null && '$value'.trim().isNotEmpty,
      );

      if (filtered.isNotEmpty) {
        return filtered.join(' / ');
      }
    }

    return 'Belum ditempatkan';
  }

  // ============================================================
  // BUILD
  // ============================================================

  @override
  Widget build(
    BuildContext context,
  ) {
    final summary = pallet?['summary'] is Map
        ? pallet!['summary'] as Map
        : <String, dynamic>{};

    return Scaffold(
      appBar: AppBar(
        title: Text(
          '${pallet?['id'] ?? widget.palletId}',
          style: const TextStyle(
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: RefreshIndicator(
        onRefresh: load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            if (loading) const LinearProgressIndicator(),
            const SizedBox(height: 8),
            _palletHeader(),
            const SizedBox(height: 10),
            _summarySection(
              summary,
            ),
            const SizedBox(height: 12),
            _actionSection(),
            const SizedBox(height: 22),
            _itemsSection(),
            const SizedBox(height: 22),
            _historySection(),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // PALLET HEADER
  // ============================================================

  Widget _palletHeader() {
    final state = '${pallet?['state'] ?? pallet?['status'] ?? '-'}';

    final validation = '${pallet?['validationStatus'] ?? '-'}';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const CircleAvatar(
                  radius: 27,
                  child: Icon(
                    Icons.inventory_2_outlined,
                    size: 28,
                  ),
                ),
                const SizedBox(
                  width: 14,
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${pallet?['id'] ?? widget.palletId}',
                        style: const TextStyle(
                          fontSize: 21,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                      const SizedBox(
                        height: 3,
                      ),
                      Text(
                        '${pallet?['name'] ?? '-'}',
                        style: const TextStyle(
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const Divider(
              height: 28,
            ),
            _infoRow(
              'Status',
              state,
            ),
            _infoRow(
              'Validasi',
              validation,
            ),
            _infoRow(
              'Posisi',
              _location(),
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // SUMMARY
  // ============================================================

  Widget _summarySection(
    Map summary,
  ) {
    final itemCount = summary['itemCount'] ?? items.length;

    final skuCount = summary['skuCount'] ?? summary['totalSku'] ?? 0;

    final weight = summary['totalWeight'] ?? 0;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Summary Fisik',
          style: TextStyle(
            fontSize: 19,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(
          height: 8,
        ),
        Row(
          children: [
            _summaryCard(
              'Item',
              '$itemCount',
            ),
            _summaryCard(
              'SKU',
              '$skuCount',
            ),
            _summaryCard(
              'Berat',
              '$weight kg',
            ),
          ],
        ),
      ],
    );
  }

  // ============================================================
  // SUMMARY CARD
  // ============================================================

  Widget _summaryCard(
    String label,
    String value,
  ) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            children: [
              Text(
                value,
                style: const TextStyle(
                  fontSize: 17,
                  fontWeight: FontWeight.w900,
                ),
              ),
              const SizedBox(
                height: 4,
              ),
              Text(
                label,
                style: const TextStyle(
                  color: Colors.grey,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ============================================================
  // ACTIONS
  // ============================================================

  Widget _actionSection() {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: FilledButton.icon(
                onPressed: _scanSku,
                icon: const Icon(
                  Icons.qr_code_scanner,
                ),
                label: const Text(
                  'Scan SKU',
                ),
              ),
            ),
            const SizedBox(
              width: 8,
            ),
            Expanded(
              child: OutlinedButton.icon(
                onPressed: _move,
                icon: const Icon(
                  Icons.open_with,
                ),
                label: const Text(
                  'Movement',
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  // ============================================================
  // ITEMS SECTION
  // ============================================================

  Widget _itemsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Barang Dalam Pallet',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            Text(
              '${items.length} item',
              style: const TextStyle(
                color: Colors.grey,
              ),
            ),
          ],
        ),
        const SizedBox(
          height: 8,
        ),
        if (items.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Belum ada barang dalam pallet.',
              ),
            ),
          ),
        ...items.map(
          (raw) => _itemCard(raw),
        ),
      ],
    );
  }

  // ============================================================
  // ITEM CARD
  // ============================================================

  Widget _itemCard(
    dynamic raw,
  ) {
    if (raw is! Map) {
      return const SizedBox.shrink();
    }

    final item = Map<String, dynamic>.from(
      raw,
    );

    return Card(
      margin: const EdgeInsets.only(
        bottom: 8,
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(12),
        leading: const CircleAvatar(
          child: Icon(
            Icons.inventory_2_outlined,
          ),
        ),
        title: Text(
          '${item['itemName'] ?? '-'}',
          style: const TextStyle(
            fontWeight: FontWeight.w800,
          ),
        ),
        subtitle: Text(
          'SKU: ${item['sku'] ?? '-'}\n'
          'Package: ${item['packageQty'] ?? 0} • '
          'Karton: ${item['cartonQty'] ?? 0} • '
          'Karung: ${item['sackQty'] ?? 0} • '
          'Box: ${item['boxQty'] ?? 0}\n'
          'Berat: ${item['weightKg'] ?? 0} kg',
        ),
        isThreeLine: true,
        trailing: const Icon(
          Icons.chevron_right,
        ),
        onTap: () {
          _showItemDetail(
            item,
          );
        },
      ),
    );
  }

  // ============================================================
  // HISTORY
  // ============================================================

  Widget _historySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Riwayat Posisi',
                style: TextStyle(
                  fontSize: 20,
                  fontWeight: FontWeight.w900,
                ),
              ),
            ),
            Text(
              '${history.length} aktivitas',
              style: const TextStyle(
                color: Colors.grey,
              ),
            ),
          ],
        ),
        const SizedBox(
          height: 8,
        ),
        if (history.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Belum ada riwayat posisi.',
              ),
            ),
          ),
        ...history.map(
          (raw) => _historyCard(raw),
        ),
      ],
    );
  }

  // ============================================================
  // HISTORY CARD
  // ============================================================

  Widget _historyCard(
    dynamic raw,
  ) {
    final h = raw is Map ? raw : <String, dynamic>{};

    final destination = h['to'] ?? h['slotCode'] ?? 'Movement';

    final movedAt = h['movedAt'] ?? h['createdAt'] ?? '-';

    final username = h['username'] ?? '-';

    return Card(
      margin: const EdgeInsets.only(
        bottom: 8,
      ),
      child: ListTile(
        leading: const CircleAvatar(
          child: Icon(
            Icons.history,
          ),
        ),
        title: Text(
          '$destination',
          style: const TextStyle(
            fontWeight: FontWeight.w800,
          ),
        ),
        subtitle: Text(
          '$movedAt\n'
          'Operator: $username',
        ),
        isThreeLine: true,
      ),
    );
  }

  // ============================================================
  // INFO ROW
  // ============================================================

  Widget _infoRow(
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
            width: 85,
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
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

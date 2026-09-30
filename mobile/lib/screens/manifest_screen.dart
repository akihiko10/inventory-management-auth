import 'package:flutter/material.dart';
import '../services/api_service.dart';

class ManifestScreen extends StatefulWidget {
  final ApiService api;
  final String? submenu;

  const ManifestScreen({
    super.key,
    required this.api,
    this.submenu,
  });

  @override
  State<ManifestScreen> createState() => _ManifestScreenState();
}

class _ManifestScreenState extends State<ManifestScreen> {
  List<dynamic> manifests = [];

  bool loading = true;
  String query = '';

  @override
  void initState() {
    super.initState();
    load();
  }

  // ============================================================
  // LOAD MANIFEST
  // ============================================================

  Future<void> load() async {
    if (mounted) {
      setState(() => loading = true);
    }

    try {
      final data = await widget.api.get('/manifests');

      if (!mounted) return;

      setState(() {
        manifests = data is Map && data['manifests'] is List
            ? data['manifests'] as List
            : data is List
                ? data
                : [];
      });
    } catch (e) {
      _msg(e.toString());
    } finally {
      if (mounted) {
        setState(() => loading = false);
      }
    }
  }

  // ============================================================
  // MESSAGE
  // ============================================================

  void _msg(String message) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
      ),
    );
  }

  // ============================================================
  // BUILD
  // ============================================================

  @override
  Widget build(BuildContext context) {
    final mode = widget.submenu ?? 'Lihat Manifest';

    return RefreshIndicator(
      onRefresh: load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _header(mode),
          const SizedBox(height: 16),
          if (loading) const LinearProgressIndicator(),
          const SizedBox(height: 12),
          _buildMode(mode),
        ],
      ),
    );
  }

  // ============================================================
  // HEADER
  // ============================================================

  Widget _header(String mode) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          mode,
          style: const TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w900,
          ),
        ),
        const SizedBox(height: 5),
        Text(
          _description(mode),
          style: const TextStyle(
            color: Colors.grey,
          ),
        ),
      ],
    );
  }

  // ============================================================
  // MODE
  // ============================================================

  Widget _buildMode(String mode) {
    switch (mode) {
      case 'Lihat Manifest':
        return _buildManifestList();

      case 'Detail Manifest':
        return _buildDetailSelector();

      case 'Cek Barang':
        return _buildItemChecker();

      case 'Validasi Manifest':
        return _buildValidation();

      default:
        return _buildManifestList();
    }
  }

  // ============================================================
  // LIHAT MANIFEST
  // ============================================================

  Widget _buildManifestList() {
    final filtered = _filteredManifests();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        TextField(
          onChanged: (value) {
            setState(() {
              query = value;
            });
          },
          decoration: const InputDecoration(
            prefixIcon: Icon(Icons.search),
            labelText: 'Cari manifest / driver / nopol',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        _manifestSummary(),
        const SizedBox(height: 12),
        if (filtered.isEmpty && !loading)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Manifest tidak ditemukan.',
              ),
            ),
          ),
        ...filtered.map(
          (raw) => _manifestCard(
            raw,
            showAction: true,
          ),
        ),
      ],
    );
  }

  // ============================================================
  // DETAIL MANIFEST
  // ============================================================

  Widget _buildDetailSelector() {
    return Column(
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.description_outlined,
                  size: 42,
                ),
                const SizedBox(height: 12),
                const Text(
                  'Detail Manifest',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Pilih manifest untuk melihat informasi driver, kendaraan, pallet, dan data manifest.',
                  style: TextStyle(
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _showManifestSelector,
                    icon: const Icon(
                      Icons.description,
                    ),
                    label: const Text(
                      'Pilih Manifest',
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ============================================================
  // CEK BARANG
  // ============================================================

  Widget _buildItemChecker() {
    return Column(
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.inventory_2_outlined,
                  size: 42,
                ),
                const SizedBox(height: 12),
                const Text(
                  'Cek Barang Manifest',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Pilih manifest untuk memeriksa data pallet dan barang yang tercatat.',
                  style: TextStyle(
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _showManifestSelectorForItems,
                    icon: const Icon(
                      Icons.inventory_2,
                    ),
                    label: const Text(
                      'Cek Barang',
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  // ============================================================
  // VALIDASI MANIFEST
  // ============================================================

  Widget _buildValidation() {
    final filtered = _filteredManifests();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                const CircleAvatar(
                  child: Icon(
                    Icons.fact_check_outlined,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Validasi Manifest',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(
                        height: 4,
                      ),
                      Text(
                        '${filtered.length} manifest tersedia untuk diperiksa.',
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
        ),
        const SizedBox(height: 12),
        ...filtered.map(
          (raw) => _validationCard(raw),
        ),
      ],
    );
  }

  // ============================================================
  // VALIDATION CARD
  // ============================================================

  Widget _validationCard(dynamic raw) {
    final m = raw is Map ? raw : <String, dynamic>{};

    final id = m['_id'] ?? m['id'];

    final status = '${m['status'] ?? m['reconciliationStatus'] ?? '-'}';

    final normalized = status.toLowerCase();

    final alreadyReconciled =
        normalized == 'reconciled' || normalized == 'reconciled ';

    return Card(
      margin: const EdgeInsets.only(
        bottom: 10,
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const CircleAvatar(
                  child: Icon(
                    Icons.fact_check,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '${m['name'] ?? m['manifestCode'] ?? 'Manifest'}',
                        style: const TextStyle(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(
                        height: 3,
                      ),
                      Text(
                        'Driver: ${m['driverName'] ?? '-'}',
                        style: const TextStyle(
                          color: Colors.grey,
                        ),
                      ),
                    ],
                  ),
                ),
                _statusChip(status),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              'Nopol: ${m['nopol'] ?? '-'}',
            ),
            const SizedBox(height: 4),
            Text(
              'Pallet: ${_palletCount(m)} • '
              'Berat: ${m['totalWeight'] ?? 0} kg',
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: id == null || alreadyReconciled
                    ? null
                    : () {
                        _confirmReconcile(
                          '$id',
                        );
                      },
                icon: const Icon(
                  Icons.check_circle_outline,
                ),
                label: Text(
                  alreadyReconciled ? 'Sudah Valid' : 'Validasi Manifest',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // MANIFEST CARD
  // ============================================================

  Widget _manifestCard(
    dynamic raw, {
    bool showAction = false,
  }) {
    final m = raw is Map ? raw : <String, dynamic>{};

    final id = m['_id'] ?? m['id'];

    return Card(
      margin: const EdgeInsets.only(
        bottom: 10,
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(14),
        leading: const CircleAvatar(
          child: Icon(
            Icons.description_outlined,
          ),
        ),
        title: Text(
          '${m['name'] ?? m['manifestCode'] ?? 'Manifest'}',
          style: const TextStyle(
            fontWeight: FontWeight.w800,
          ),
        ),
        subtitle: Text(
          'Driver: ${m['driverName'] ?? '-'}\n'
          'Nopol: ${m['nopol'] ?? '-'}\n'
          'Pallet: ${_palletCount(m)} • '
          'Berat: ${m['totalWeight'] ?? 0} kg',
        ),
        isThreeLine: true,
        trailing: showAction
            ? const Icon(
                Icons.chevron_right,
              )
            : null,
        onTap: showAction && id != null
            ? () {
                _loadManifestDetail(
                  '$id',
                );
              }
            : null,
      ),
    );
  }

  // ============================================================
  // MANIFEST SUMMARY
  // ============================================================

  Widget _manifestSummary() {
    int total = manifests.length;

    int reconciled = 0;

    for (final raw in manifests) {
      if (raw is! Map) continue;

      final status =
          '${raw['status'] ?? raw['reconciliationStatus'] ?? ''}'.toLowerCase();

      if (status == 'reconciled') {
        reconciled++;
      }
    }

    final pending = total - reconciled;

    return Row(
      children: [
        _summaryMetric(
          'Total',
          '$total',
          Icons.description_outlined,
        ),
        _summaryMetric(
          'Valid',
          '$reconciled',
          Icons.check_circle_outline,
        ),
        _summaryMetric(
          'Pending',
          '$pending',
          Icons.pending_outlined,
        ),
      ],
    );
  }

  // ============================================================
  // SUMMARY METRIC
  // ============================================================

  Widget _summaryMetric(
    String label,
    String value,
    IconData icon,
  ) {
    return Expanded(
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(10),
          child: Column(
            children: [
              Icon(icon),
              const SizedBox(height: 5),
              Text(
                value,
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                ),
              ),
              Text(
                label,
                style: const TextStyle(
                  color: Colors.grey,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // ============================================================
  // STATUS CHIP
  // ============================================================

  Widget _statusChip(
    String status,
  ) {
    final normalized = status.toLowerCase();

    final valid = normalized == 'reconciled';

    return Chip(
      avatar: Icon(
        valid ? Icons.check : Icons.pending,
        size: 16,
      ),
      label: Text(
        valid
            ? 'Valid'
            : status == '-'
                ? 'Pending'
                : status,
      ),
    );
  }

  // ============================================================
  // SELECT MANIFEST
  // ============================================================

  Future<void> _showManifestSelector() async {
    final selected = await _selectManifest();

    if (selected == null) {
      return;
    }

    final id = selected['_id'] ?? selected['id'];

    if (id == null) {
      _msg(
        'ID manifest tidak ditemukan.',
      );
      return;
    }

    await _loadManifestDetail(
      '$id',
    );
  }

  // ============================================================
  // SELECT FOR ITEMS
  // ============================================================

  Future<void> _showManifestSelectorForItems() async {
    final selected = await _selectManifest();

    if (selected == null) {
      return;
    }

    final id = selected['_id'] ?? selected['id'];

    if (id == null) {
      _msg(
        'ID manifest tidak ditemukan.',
      );
      return;
    }

    await _loadManifestItems(
      '$id',
    );
  }

  // ============================================================
  // MANIFEST SELECTOR
  // ============================================================

  Future<Map<String, dynamic>?> _selectManifest() async {
    return showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (_) {
        return SafeArea(
          child: SizedBox(
            height: MediaQuery.of(context).size.height * .78,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Padding(
                  padding: EdgeInsets.fromLTRB(
                    16,
                    16,
                    16,
                    8,
                  ),
                  child: Text(
                    'Pilih Manifest',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
                const Padding(
                  padding: EdgeInsets.symmetric(
                    horizontal: 16,
                  ),
                  child: Text(
                    'Pilih manifest yang ingin diperiksa.',
                    style: TextStyle(
                      color: Colors.grey,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: manifests.isEmpty
                      ? const Center(
                          child: Text(
                            'Manifest tidak tersedia.',
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(
                            16,
                          ),
                          itemCount: manifests.length,
                          itemBuilder: (_, index) {
                            final raw = manifests[index];

                            final m = Map<String, dynamic>.from(
                              raw as Map,
                            );

                            return Card(
                              child: ListTile(
                                leading: const CircleAvatar(
                                  child: Icon(
                                    Icons.description_outlined,
                                  ),
                                ),
                                title: Text(
                                  '${m['name'] ?? m['manifestCode'] ?? 'Manifest'}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                subtitle: Text(
                                  'Driver: ${m['driverName'] ?? '-'}\n'
                                  'Nopol: ${m['nopol'] ?? '-'}',
                                ),
                                isThreeLine: true,
                                trailing: const Icon(
                                  Icons.chevron_right,
                                ),
                                onTap: () {
                                  Navigator.pop(
                                    context,
                                    m,
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
  }

  // ============================================================
  // LOAD MANIFEST DETAIL
  // ============================================================

  Future<void> _loadManifestDetail(
    String id,
  ) async {
    try {
      final data = await widget.api.get(
        '/manifests/$id',
      );

      if (!mounted) return;

      final manifest = data is Map && data['manifest'] is Map
          ? data['manifest'] as Map
          : data is Map
              ? data
              : <String, dynamic>{};

      _showDetailDialog(
        manifest,
      );
    } catch (e) {
      _msg(e.toString());
    }
  }

  // ============================================================
  // LOAD MANIFEST ITEMS
  // ============================================================

  Future<void> _loadManifestItems(
    String id,
  ) async {
    try {
      final data = await widget.api.get(
        '/manifests/$id',
      );

      if (!mounted) return;

      final manifest = data is Map && data['manifest'] is Map
          ? data['manifest'] as Map
          : data is Map
              ? data
              : <String, dynamic>{};

      _showItemsDialog(
        manifest,
      );
    } catch (e) {
      _msg(e.toString());
    }
  }

  // ============================================================
  // DETAIL DIALOG
  // ============================================================

  void _showDetailDialog(
    Map manifest,
  ) {
    showDialog(
      context: context,
      builder: (_) {
        return AlertDialog(
          title: Text(
            '${manifest['name'] ?? manifest['manifestCode'] ?? 'Manifest'}',
          ),
          content: SizedBox(
            width: double.maxFinite,
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _detailRow(
                    'Driver',
                    '${manifest['driverName'] ?? '-'}',
                  ),
                  _detailRow(
                    'Nopol',
                    '${manifest['nopol'] ?? '-'}',
                  ),
                  _detailRow(
                    'Status',
                    '${manifest['status'] ?? '-'}',
                  ),
                  _detailRow(
                    'Total Berat',
                    '${manifest['totalWeight'] ?? 0} kg',
                  ),
                  _detailRow(
                    'Jumlah Pallet',
                    '${_palletCount(manifest)}',
                  ),
                  const SizedBox(
                    height: 12,
                  ),
                  const Text(
                    'Data Manifest',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(
                    height: 8,
                  ),
                  _renderManifestData(
                    manifest,
                  ),
                ],
              ),
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Tutup'),
            ),
          ],
        );
      },
    );
  }

  // ============================================================
  // ITEMS DIALOG
  // ============================================================

  void _showItemsDialog(
    Map manifest,
  ) {
    final items = _extractItems(manifest);

    showDialog(
      context: context,
      builder: (_) {
        return AlertDialog(
          title: Text(
            'Barang Manifest',
          ),
          content: SizedBox(
            width: double.maxFinite,
            child: items.isEmpty
                ? const Text(
                    'Data barang tidak tersedia pada response manifest.',
                  )
                : ListView.separated(
                    shrinkWrap: true,
                    itemCount: items.length,
                    separatorBuilder: (_, __) => const Divider(),
                    itemBuilder: (_, index) {
                      final raw = items[index];

                      final item = raw is Map ? raw : <String, dynamic>{};

                      return ListTile(
                        leading: const Icon(
                          Icons.inventory_2_outlined,
                        ),
                        title: Text(
                          '${item['itemName'] ?? item['name'] ?? item['sku'] ?? 'Barang'}',
                        ),
                        subtitle: Text(
                          'SKU: ${item['sku'] ?? '-'}\n'
                          'Qty: ${item['quantity'] ?? item['qty'] ?? item['packageQty'] ?? 0}',
                        ),
                        isThreeLine: true,
                      );
                    },
                  ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Tutup'),
            ),
          ],
        );
      },
    );
  }

  // ============================================================
  // CONFIRM RECONCILE
  // ============================================================

  Future<void> _confirmReconcile(
    String id,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) {
        return AlertDialog(
          title: const Text(
            'Validasi Manifest',
          ),
          content: const Text(
            'Tandai manifest ini sebagai sudah direkonsiliasi?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(
                context,
                false,
              ),
              child: const Text('Batal'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(
                context,
                true,
              ),
              child: const Text('Validasi'),
            ),
          ],
        );
      },
    );

    if (confirmed != true) {
      return;
    }

    try {
      await widget.api.put(
        '/manifests/$id/reconcile',
        {
          'status': 'reconciled',
        },
      );

      _msg(
        'Manifest berhasil divalidasi.',
      );

      await load();
    } catch (e) {
      _msg(e.toString());
    }
  }

  // ============================================================
  // RENDER MANIFEST DATA
  // ============================================================

  Widget _renderManifestData(
    Map manifest,
  ) {
    final pallets = manifest['pallets'];

    if (pallets is! List || pallets.isEmpty) {
      return const Text(
        'Detail pallet tidak tersedia pada response.',
        style: TextStyle(
          color: Colors.grey,
        ),
      );
    }

    return Column(
      children: pallets.map<Widget>(
        (raw) {
          final pallet = raw is Map ? raw : <String, dynamic>{};

          return Card(
            child: ListTile(
              leading: const Icon(
                Icons.inventory_2,
              ),
              title: Text(
                '${pallet['palletId'] ?? pallet['id'] ?? pallet['name'] ?? '-'}',
              ),
              subtitle: Text(
                'Berat: ${pallet['weightKg'] ?? pallet['totalWeight'] ?? 0} kg',
              ),
            ),
          );
        },
      ).toList(),
    );
  }

  // ============================================================
  // EXTRACT ITEMS
  // ============================================================

  List<dynamic> _extractItems(
    Map manifest,
  ) {
    final direct = manifest['items'];

    if (direct is List) {
      return direct;
    }

    final pallets = manifest['pallets'];

    if (pallets is! List) {
      return [];
    }

    final result = <dynamic>[];

    for (final raw in pallets) {
      if (raw is! Map) continue;

      final items = raw['items'];

      if (items is List) {
        result.addAll(items);
      }
    }

    return result;
  }

  // ============================================================
  // PALLET COUNT
  // ============================================================

  int _palletCount(
    Map manifest,
  ) {
    final pallets = manifest['pallets'];

    if (pallets is List) {
      return pallets.length;
    }

    final count = manifest['palletCount'];

    return int.tryParse(
          '$count',
        ) ??
        0;
  }

  // ============================================================
  // DETAIL ROW
  // ============================================================

  Widget _detailRow(
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
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }

  // ============================================================
  // FILTER
  // ============================================================

  List<dynamic> _filteredManifests() {
    return manifests.where((raw) {
      final m = raw is Map ? raw : <String, dynamic>{};

      final text = [
        m['_id'],
        m['id'],
        m['name'],
        m['manifestCode'],
        m['driverName'],
        m['nopol'],
        m['status'],
      ].join(' ').toLowerCase();

      return text.contains(
        query.toLowerCase(),
      );
    }).toList();
  }

  // ============================================================
  // DESCRIPTION
  // ============================================================

  String _description(
    String mode,
  ) {
    switch (mode) {
      case 'Lihat Manifest':
        return 'Lihat manifest yang tersedia untuk kebutuhan operasional lapangan.';

      case 'Detail Manifest':
        return 'Periksa detail manifest, driver, kendaraan, pallet, dan berat.';

      case 'Cek Barang':
        return 'Periksa barang yang tercatat dalam manifest.';

      case 'Validasi Manifest':
        return 'Periksa dan validasi manifest melalui proses rekonsiliasi.';

      default:
        return 'Operasional manifest di lapangan.';
    }
  }
}

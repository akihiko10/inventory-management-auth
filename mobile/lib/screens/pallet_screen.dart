import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'barcode_scanner_screen.dart';
import 'pallet_detail_screen.dart';

class PalletScreen extends StatefulWidget {
  final ApiService api;
  final String? submenu;

  const PalletScreen({
    super.key,
    required this.api,
    this.submenu,
  });

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

  // ============================================================
  // LOAD PALLET
  // ============================================================

  Future<void> load() async {
    if (mounted) {
      setState(() => loading = true);
    }

    try {
      final data = await widget.api.get('/pallets');

      if (mounted) {
        setState(() {
          pallets = data is List ? data : [];
        });
      }
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

  void _msg(String text) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(text),
      ),
    );
  }

  // ============================================================
  // SCAN PALLET
  // ============================================================

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
        _msg('Barcode pallet tidak ditemukan.');
        return;
      }

      final first = matches.first;

      if (first is Map && first['palletId'] != null) {
        final palletId = '${first['palletId']}';

        _openDetail(
          palletId,
          title: 'Detail Pallet',
        );
      }
    } catch (e) {
      _msg(e.toString());
    }
  }

  // ============================================================
  // SCAN BARCODE / SKU
  // ============================================================

  Future<void> scanBarcode() async {
    final code = await Navigator.push<String>(
      context,
      MaterialPageRoute(
        builder: (_) => const BarcodeScannerScreen(
          title: 'Scan Barcode',
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

      if (!mounted) return;

      final matches = result is Map && result['matches'] is List
          ? result['matches'] as List
          : [];

      if (matches.isEmpty) {
        _showScanResult(
          code: code,
          matches: const [],
        );
        return;
      }

      _showScanResult(
        code: code,
        matches: matches,
      );
    } catch (e) {
      _msg(e.toString());
    }
  }

  // ============================================================
  // SCAN RESULT
  // ============================================================

  void _showScanResult({
    required String code,
    required List matches,
  }) {
    showDialog(
      context: context,
      builder: (_) {
        return AlertDialog(
          title: const Text('Hasil Scan'),
          content: matches.isEmpty
              ? Text(
                  'Barcode "$code" tidak ditemukan.',
                )
              : SizedBox(
                  width: double.maxFinite,
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: matches.length,
                    separatorBuilder: (_, __) => const Divider(),
                    itemBuilder: (_, index) {
                      final raw = matches[index];

                      final match = raw is Map ? raw : <String, dynamic>{};

                      final item = match['item'] is Map
                          ? match['item'] as Map
                          : <String, dynamic>{};

                      return ListTile(
                        leading: const CircleAvatar(
                          child: Icon(Icons.inventory_2_outlined),
                        ),
                        title: Text(
                          '${item['itemName'] ?? '-'}',
                        ),
                        subtitle: Text(
                          'SKU: ${item['sku'] ?? '-'}\n'
                          'Pallet: ${match['palletId'] ?? '-'}',
                        ),
                        isThreeLine: true,
                        trailing: const Icon(
                          Icons.chevron_right,
                        ),
                        onTap: () {
                          Navigator.pop(context);

                          final palletId = match['palletId'];

                          if (palletId != null) {
                            _openDetail(
                              '$palletId',
                              title: 'Detail Pallet',
                            );
                          }
                        },
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
  // OPEN DETAIL
  // ============================================================

  void _openDetail(
    String id, {
    String title = 'Detail Pallet',
  }) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => PalletDetailScreen(
          api: widget.api,
          palletId: id,
        ),
      ),
    ).then((_) {
      load();
    });
  }

  // ============================================================
  // SELECT PALLET
  // ============================================================

  void _selectPallet({
    required String title,
    required String description,
    required void Function(String palletId) onSelected,
  }) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) {
        String search = '';

        return StatefulBuilder(
          builder: (context, setModalState) {
            final filtered = pallets.where((raw) {
              final p = raw is Map ? raw : <String, dynamic>{};

              final text = [
                p['id'],
                p['name'],
                p['status'],
                p['state'],
                p['validationStatus'],
                p['locationStatus'],
                p['location'],
              ].join(' ').toLowerCase();

              return text.contains(
                search.toLowerCase(),
              );
            }).toList();

            return SafeArea(
              child: SizedBox(
                height: MediaQuery.of(context).size.height * 0.82,
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              title,
                              style: const TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                              ),
                            ),
                          ),
                          IconButton(
                            onPressed: () => Navigator.pop(context),
                            icon: const Icon(Icons.close),
                          ),
                        ],
                      ),
                      Text(
                        description,
                        style: const TextStyle(
                          color: Colors.grey,
                        ),
                      ),
                      const SizedBox(height: 14),
                      TextField(
                        onChanged: (value) {
                          setModalState(() {
                            search = value;
                          });
                        },
                        decoration: const InputDecoration(
                          prefixIcon: Icon(Icons.search),
                          labelText: 'Cari pallet',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Expanded(
                        child: filtered.isEmpty
                            ? const Center(
                                child: Text(
                                  'Pallet tidak ditemukan.',
                                ),
                              )
                            : ListView.separated(
                                itemCount: filtered.length,
                                separatorBuilder: (_, __) => const SizedBox(
                                  height: 8,
                                ),
                                itemBuilder: (_, index) {
                                  final raw = filtered[index];

                                  final p =
                                      raw is Map ? raw : <String, dynamic>{};

                                  final id = '${p['id'] ?? '-'}';

                                  final summary = p['summary'] is Map
                                      ? p['summary'] as Map
                                      : <String, dynamic>{};

                                  return Card(
                                    child: ListTile(
                                      leading: const CircleAvatar(
                                        child: Icon(
                                          Icons.inventory_2_outlined,
                                        ),
                                      ),
                                      title: Text(
                                        id,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                      subtitle: Text(
                                        '${p['name'] ?? '-'}\n'
                                        'SKU: ${summary['totalSku'] ?? 0} • '
                                        'Berat: ${summary['totalWeight'] ?? 0} kg',
                                      ),
                                      isThreeLine: true,
                                      trailing: const Icon(
                                        Icons.chevron_right,
                                      ),
                                      onTap: () {
                                        Navigator.pop(
                                          context,
                                        );

                                        onSelected(
                                          id,
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
              ),
            );
          },
        );
      },
    );
  }

  // ============================================================
  // BUILD
  // ============================================================

  @override
  Widget build(BuildContext context) {
    final mode = widget.submenu ?? 'Cari Pallet';

    return RefreshIndicator(
      onRefresh: load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _header(mode),
          const SizedBox(height: 16),
          _buildModeContent(mode),
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
  // MODE CONTENT
  // ============================================================

  Widget _buildModeContent(String mode) {
    switch (mode) {
      case 'Cari Pallet':
        return _buildCariPallet();

      case 'Scan Pallet / Barcode':
        return _buildScanPallet();

      case 'Detail Pallet':
        return _buildDetailPallet();

      case 'Barang Dalam Pallet':
        return _buildBarangDalamPallet();

      case 'Summary Fisik':
        return _buildSummaryFisik();

      case 'Riwayat Posisi':
        return _buildRiwayatPosisi();

      default:
        return _buildCariPallet();
    }
  }

  // ============================================================
  // CARI PALLET
  // ============================================================

  Widget _buildCariPallet() {
    final filtered = _filteredPallets();

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
            labelText: 'Cari pallet / SKU / barang',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        if (loading) const LinearProgressIndicator(),
        const SizedBox(height: 8),
        if (filtered.isEmpty && !loading)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Data pallet tidak ditemukan.',
              ),
            ),
          ),
        ...filtered.map(_card),
      ],
    );
  }

  // ============================================================
  // SCAN PALLET
  // ============================================================

  Widget _buildScanPallet() {
    return Column(
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                const CircleAvatar(
                  radius: 38,
                  child: Icon(
                    Icons.qr_code_scanner,
                    size: 40,
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Scan Pallet / Barcode',
                  style: TextStyle(
                    fontSize: 19,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Scan barcode pallet menggunakan kamera HP untuk menemukan pallet.',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: scanPallet,
                    icon: const Icon(
                      Icons.qr_code_scanner,
                    ),
                    label: const Text(
                      'Scan Pallet',
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: scanBarcode,
                    icon: const Icon(
                      Icons.qr_code_2,
                    ),
                    label: const Text(
                      'Scan Barcode / SKU',
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
  // DETAIL PALLET
  // ============================================================

  Widget _buildDetailPallet() {
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
                  'Pilih Pallet',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Pilih pallet untuk membuka detail lengkap, barang, lokasi, dan informasi operasional.',
                  style: TextStyle(
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () {
                      _selectPallet(
                        title: 'Pilih Pallet',
                        description: 'Pilih pallet yang ingin dilihat.',
                        onSelected: (id) {
                          _openDetail(
                            id,
                            title: 'Detail Pallet',
                          );
                        },
                      );
                    },
                    icon: const Icon(
                      Icons.inventory_2,
                    ),
                    label: const Text(
                      'Pilih Pallet',
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
  // BARANG DALAM PALLET
  // ============================================================

  Widget _buildBarangDalamPallet() {
    return Column(
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Icon(
                  Icons.list_alt,
                  size: 42,
                ),
                const SizedBox(height: 12),
                const Text(
                  'Barang Dalam Pallet',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Pilih pallet untuk melihat daftar barang, SKU, quantity, berat, dan kemasan.',
                  style: TextStyle(
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: () {
                      _selectPallet(
                        title: 'Pilih Pallet',
                        description:
                            'Pilih pallet untuk melihat barang di dalamnya.',
                        onSelected: (id) {
                          _openDetail(
                            id,
                            title: 'Barang Dalam Pallet',
                          );
                        },
                      );
                    },
                    icon: const Icon(
                      Icons.list_alt,
                    ),
                    label: const Text(
                      'Lihat Barang',
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
  // SUMMARY FISIK
  // ============================================================

  Widget _buildSummaryFisik() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _summaryOverview(),
        const SizedBox(height: 12),
        const Text(
          'Ringkasan Per Pallet',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 10),
        if (loading) const LinearProgressIndicator(),
        const SizedBox(height: 8),
        ...pallets.map(
          (raw) => _summaryCard(raw),
        ),
      ],
    );
  }

  // ============================================================
  // RIWAYAT POSISI
  // ============================================================

  Widget _buildRiwayatPosisi() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Icon(
              Icons.history,
              size: 42,
            ),
            const SizedBox(height: 12),
            const Text(
              'Riwayat Posisi Pallet',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w800,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Pilih pallet untuk melihat riwayat perpindahan posisinya.',
              style: TextStyle(
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                onPressed: () {
                  _selectPallet(
                    title: 'Pilih Pallet',
                    description: 'Pilih pallet untuk melihat riwayat posisi.',
                    onSelected: (id) {
                      _openDetail(
                        id,
                        title: 'Riwayat Posisi',
                      );
                    },
                  );
                },
                icon: const Icon(
                  Icons.history,
                ),
                label: const Text(
                  'Lihat Riwayat',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // FILTER
  // ============================================================

  List<dynamic> _filteredPallets() {
    return pallets.where((raw) {
      final p = raw is Map ? raw : <String, dynamic>{};

      final text = [
        p['id'],
        p['name'],
        p['status'],
        p['state'],
        p['validationStatus'],
        p['locationStatus'],
        p['location'],
      ].join(' ').toLowerCase();

      return text.contains(
        query.toLowerCase(),
      );
    }).toList();
  }

  // ============================================================
  // DESCRIPTION
  // ============================================================

  String _description(String mode) {
    switch (mode) {
      case 'Cari Pallet':
        return 'Cari dan pilih pallet yang tersedia di gudang.';

      case 'Scan Pallet / Barcode':
        return 'Gunakan kamera HP untuk menemukan pallet atau barang melalui barcode.';

      case 'Detail Pallet':
        return 'Lihat informasi lengkap pallet dan status operasionalnya.';

      case 'Barang Dalam Pallet':
        return 'Periksa barang, SKU, quantity, kemasan, dan berat dalam pallet.';

      case 'Summary Fisik':
        return 'Lihat ringkasan fisik pallet berdasarkan data inventory.';

      case 'Riwayat Posisi':
        return 'Periksa riwayat perpindahan posisi pallet.';

      default:
        return 'Operasional pallet.';
    }
  }

  // ============================================================
  // SUMMARY OVERVIEW
  // ============================================================

  Widget _summaryOverview() {
    num weight = 0;
    num cartons = 0;
    num sacks = 0;
    num boxes = 0;
    num packages = 0;

    int sku = 0;

    for (final raw in pallets) {
      if (raw is! Map) continue;

      final s =
          raw['summary'] is Map ? raw['summary'] as Map : <String, dynamic>{};

      weight += num.tryParse(
            '${s['totalWeight'] ?? 0}',
          ) ??
          0;

      cartons += num.tryParse(
            '${s['totalCartons'] ?? 0}',
          ) ??
          0;

      sacks += num.tryParse(
            '${s['totalSacks'] ?? 0}',
          ) ??
          0;

      boxes += num.tryParse(
            '${s['totalBoxes'] ?? 0}',
          ) ??
          0;

      packages += num.tryParse(
            '${s['totalPackages'] ?? 0}',
          ) ??
          0;

      sku += int.tryParse(
            '${s['totalSku'] ?? 0}',
          ) ??
          0;
    }

    return Column(
      children: [
        Row(
          children: [
            _metric(
              'SKU',
              '$sku',
            ),
            _metric(
              'Berat',
              '${weight.toStringAsFixed(1)} kg',
            ),
          ],
        ),
        Row(
          children: [
            _metric(
              'Karton',
              '$cartons',
            ),
            _metric(
              'Karung',
              '$sacks',
            ),
          ],
        ),
        Row(
          children: [
            _metric(
              'Box',
              '$boxes',
            ),
            _metric(
              'Kemasan',
              '$packages',
            ),
          ],
        ),
      ],
    );
  }

  // ============================================================
  // METRIC
  // ============================================================

  Widget _metric(
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
                  fontWeight: FontWeight.w900,
                  fontSize: 18,
                ),
              ),
              const SizedBox(height: 3),
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
  // PALLET CARD
  // ============================================================

  Widget _card(dynamic raw) {
    final p = raw is Map ? raw : <String, dynamic>{};

    final s = p['summary'] is Map ? p['summary'] as Map : <String, dynamic>{};

    return Card(
      margin: const EdgeInsets.only(
        bottom: 10,
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(14),
        leading: const CircleAvatar(
          child: Icon(
            Icons.inventory_2_outlined,
          ),
        ),
        title: Text(
          '${p['id'] ?? '-'}',
          style: const TextStyle(
            fontWeight: FontWeight.w800,
          ),
        ),
        subtitle: Text(
          '${p['name'] ?? '-'}\n'
          'Status: ${p['state'] ?? p['status'] ?? '-'} • '
          'Validasi: ${p['validationStatus'] ?? '-'}\n'
          'SKU: ${s['totalSku'] ?? 0} • '
          'Berat: ${s['totalWeight'] ?? 0} kg',
        ),
        isThreeLine: true,
        trailing: const Icon(
          Icons.chevron_right,
        ),
        onTap: () {
          _openDetail(
            '${p['id']}',
            title: 'Detail Pallet',
          );
        },
      ),
    );
  }

  // ============================================================
  // SUMMARY CARD
  // ============================================================

  Widget _summaryCard(dynamic raw) {
    final p = raw is Map ? raw : <String, dynamic>{};

    final s = p['summary'] is Map ? p['summary'] as Map : <String, dynamic>{};

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
                    Icons.inventory_2,
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
              ],
            ),
            const Divider(
              height: 24,
            ),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                _smallInfo(
                  'SKU',
                  '${s['totalSku'] ?? 0}',
                ),
                _smallInfo(
                  'Berat',
                  '${s['totalWeight'] ?? 0} kg',
                ),
                _smallInfo(
                  'Karton',
                  '${s['totalCartons'] ?? 0}',
                ),
                _smallInfo(
                  'Karung',
                  '${s['totalSacks'] ?? 0}',
                ),
                _smallInfo(
                  'Box',
                  '${s['totalBoxes'] ?? 0}',
                ),
                _smallInfo(
                  'Kemasan',
                  '${s['totalPackages'] ?? 0}',
                ),
              ],
            ),
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerRight,
              child: TextButton.icon(
                onPressed: () {
                  _openDetail(
                    '${p['id']}',
                    title: 'Detail Pallet',
                  );
                },
                icon: const Icon(
                  Icons.visibility_outlined,
                ),
                label: const Text(
                  'Detail',
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ============================================================
  // SMALL INFO
  // ============================================================

  Widget _smallInfo(
    String label,
    String value,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 10,
        vertical: 7,
      ),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: Colors.grey.shade300,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              color: Colors.grey,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(
              fontWeight: FontWeight.w700,
            ),
          ),
        ],
      ),
    );
  }
}

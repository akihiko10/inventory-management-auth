import 'package:flutter/material.dart';
import '../services/api_service.dart';

class WarehouseScreen extends StatefulWidget {
  final ApiService api;
  final String? submenu;

  const WarehouseScreen({
    super.key,
    required this.api,
    this.submenu,
  });

  @override
  State<WarehouseScreen> createState() => _WarehouseScreenState();
}

class _WarehouseScreenState extends State<WarehouseScreen> {
  List<dynamic> warehouses = [];
  List<dynamic> slots = [];

  bool loading = true;
  String query = '';

  @override
  void initState() {
    super.initState();
    load();
  }

  // ============================================================
  // LOAD DATA
  // ============================================================

  Future<void> load() async {
    if (mounted) {
      setState(() => loading = true);
    }

    try {
      final warehouseData = await widget.api.get('/warehouses');

      final slotData = await widget.api.get(
        '/warehouses/monitoring/slots',
      );

      if (!mounted) return;

      setState(() {
        warehouses = warehouseData is List ? warehouseData : [];

        slots = slotData is Map && slotData['slots'] is List
            ? slotData['slots'] as List
            : slotData is List
                ? slotData
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
    final mode = widget.submenu ?? 'Cek Posisi Pallet';

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
      case 'Cek Posisi Pallet':
        return _buildPosisiPallet();

      case 'Movement Pallet':
        return _buildMovement();

      case 'Cek Kapasitas':
        return _buildCapacity();

      case 'FIFO':
        return _buildFifo();

      default:
        return _buildPosisiPallet();
    }
  }

  // ============================================================
  // CEK POSISI PALLET
  // ============================================================

  Widget _buildPosisiPallet() {
    final filtered = _filteredSlots();

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
            labelText: 'Cari pallet / slot / warehouse',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        _locationSummary(),
        const SizedBox(height: 12),
        if (filtered.isEmpty && !loading)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Data posisi pallet tidak ditemukan.',
              ),
            ),
          ),
        ...filtered.map(
          (slot) => _slotCard(
            slot,
            mode: 'position',
          ),
        ),
      ],
    );
  }

  // ============================================================
  // MOVEMENT PALLET
  // ============================================================

  Widget _buildMovement() {
    final occupied = slots.where((raw) {
      if (raw is! Map) return false;

      return raw['palletId'] != null;
    }).toList();

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
                    Icons.open_with,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Movement Pallet',
                        style: TextStyle(
                          fontWeight: FontWeight.w800,
                          fontSize: 17,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        '${occupied.length} pallet berada di slot aktif.',
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
        const Text(
          'Pilih Pallet',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),
        if (occupied.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Tidak ada pallet yang dapat dipindahkan.',
              ),
            ),
          ),
        ...occupied.map(
          (raw) => _movementCard(raw),
        ),
      ],
    );
  }

  // ============================================================
  // MOVEMENT CARD
  // ============================================================

  Widget _movementCard(dynamic raw) {
    final x = raw is Map ? raw : <String, dynamic>{};

    final capacity =
        x['capacity'] is Map ? x['capacity'] as Map : <String, dynamic>{};

    return Card(
      margin: const EdgeInsets.only(
        bottom: 10,
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(14),
        leading: const CircleAvatar(
          child: Icon(
            Icons.inventory_2,
          ),
        ),
        title: Text(
          '${x['palletId'] ?? '-'}',
          style: const TextStyle(
            fontWeight: FontWeight.w800,
          ),
        ),
        subtitle: Text(
          'Posisi: ${x['warehouseCode'] ?? '-'} / '
          '${x['coldStorageCode'] ?? '-'} / '
          '${x['rackCode'] ?? '-'} / '
          '${x['levelCode'] ?? '-'} / '
          '${x['slotCode'] ?? '-'}\n'
          'Berat: ${capacity['usedWeightKg'] ?? 0} kg',
        ),
        isThreeLine: true,
        trailing: FilledButton(
          onPressed: () {
            _movePallet(x);
          },
          child: const Text(
            'Pindah',
          ),
        ),
      ),
    );
  }

  // ============================================================
  // MOVE PALLET
  // ============================================================

  Future<void> _movePallet(
    Map<dynamic, dynamic> pallet,
  ) async {
    final palletId = pallet['palletId'];

    if (palletId == null) {
      _msg(
        'Pallet tidak ditemukan.',
      );
      return;
    }

    final target = await _selectTargetSlot(
      '$palletId',
    );

    if (target == null) {
      return;
    }

    try {
      await widget.api.post(
        '/warehouses/movement',
        {
          'palletId': palletId,
          'to': {
            'warehouseId': target['warehouseId'],
            'coldStorageId': target['coldStorageId'],
            'rackId': target['rackId'],
            'levelCode': target['levelCode'],
            'slotCode': target['slotCode'],
          },
          'reason': 'Mobile movement',
        },
      );

      _msg(
        'Pallet berhasil dipindahkan.',
      );

      await load();
    } catch (e) {
      _msg(e.toString());
    }
  }

  // ============================================================
  // SELECT TARGET SLOT
  // ============================================================

  Future<Map<String, dynamic>?> _selectTargetSlot(
    String palletId,
  ) async {
    final candidates = slots.where((raw) {
      if (raw is! Map) {
        return false;
      }

      final status = '${raw['slotStatus'] ?? ''}';

      final occupiedBy = raw['palletId'];

      return status != 'inactive' &&
          (occupiedBy == null || '$occupiedBy' == palletId);
    }).toList();

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
                    'Pilih Slot Tujuan',
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
                    'Slot yang sudah digunakan pallet lain tidak ditampilkan.',
                    style: TextStyle(
                      color: Colors.grey,
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: candidates.isEmpty
                      ? const Center(
                          child: Text(
                            'Tidak ada slot tujuan yang tersedia.',
                          ),
                        )
                      : ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: candidates.length,
                          itemBuilder: (_, index) {
                            final raw = candidates[index];

                            final x = Map<String, dynamic>.from(
                              raw as Map,
                            );

                            return Card(
                              child: ListTile(
                                leading: const CircleAvatar(
                                  child: Icon(
                                    Icons.grid_view,
                                  ),
                                ),
                                title: Text(
                                  '${x['slotCode'] ?? '-'}',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                                subtitle: Text(
                                  '${x['warehouseCode'] ?? '-'} / '
                                  '${x['coldStorageCode'] ?? '-'} / '
                                  '${x['rackCode'] ?? '-'} / '
                                  '${x['levelCode'] ?? '-'}\n'
                                  'Status: ${x['slotStatus'] ?? '-'}',
                                ),
                                isThreeLine: true,
                                trailing: const Icon(
                                  Icons.chevron_right,
                                ),
                                onTap: () {
                                  Navigator.pop(
                                    context,
                                    x,
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
  // CEK KAPASITAS
  // ============================================================

  Widget _buildCapacity() {
    final data = _calculateCapacity();

    final used = data['used'] as num;

    final max = data['max'] as num;

    final percent = max <= 0 ? 0.0 : (used / max).clamp(0.0, 1.0);

    final percentText = (percent * 100).toStringAsFixed(0);

    return Column(
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Row(
                  children: [
                    CircleAvatar(
                      child: Icon(
                        Icons.speed,
                      ),
                    ),
                    SizedBox(width: 12),
                    Text(
                      'Kapasitas Gudang',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 20),
                Text(
                  '${used.toStringAsFixed(1)} / '
                  '${max.toStringAsFixed(1)} kg',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  'Utilisasi $percentText%',
                  style: const TextStyle(
                    color: Colors.grey,
                  ),
                ),
                const SizedBox(height: 14),
                LinearProgressIndicator(
                  value: percent,
                  minHeight: 10,
                ),
                const SizedBox(height: 20),
                Row(
                  children: [
                    _capacityMetric(
                      'Warehouse',
                      '${warehouses.length}',
                    ),
                    _capacityMetric(
                      'Slot',
                      '${slots.length}',
                    ),
                    _capacityMetric(
                      'Terisi',
                      '${_occupiedSlotCount()}',
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        _capacityByWarehouse(),
      ],
    );
  }

  // ============================================================
  // CAPACITY BY WAREHOUSE
  // ============================================================

  Widget _capacityByWarehouse() {
    final grouped = <String, Map<String, num>>{};

    for (final raw in slots) {
      if (raw is! Map) continue;

      final warehouse = '${raw['warehouseCode'] ?? 'Unknown'}';

      final capacity =
          raw['capacity'] is Map ? raw['capacity'] as Map : <String, dynamic>{};

      final used = num.tryParse(
            '${capacity['usedWeightKg'] ?? 0}',
          ) ??
          0;

      final max = num.tryParse(
            '${capacity['maxWeightKg'] ?? 0}',
          ) ??
          0;

      grouped.putIfAbsent(
        warehouse,
        () => {
          'used': 0,
          'max': 0,
        },
      );

      grouped[warehouse]!['used'] = grouped[warehouse]!['used']! + used;

      grouped[warehouse]!['max'] = grouped[warehouse]!['max']! + max;
    }

    if (grouped.isEmpty) {
      return const SizedBox.shrink();
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Kapasitas Per Warehouse',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 10),
        ...grouped.entries.map(
          (entry) {
            final used = entry.value['used'] ?? 0;

            final max = entry.value['max'] ?? 0;

            final percent = max <= 0 ? 0.0 : (used / max).clamp(0.0, 1.0);

            return Card(
              margin: const EdgeInsets.only(
                bottom: 10,
              ),
              child: Padding(
                padding: const EdgeInsets.all(
                  14,
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      entry.key,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(
                      height: 8,
                    ),
                    Text(
                      '${used.toStringAsFixed(1)} / '
                      '${max.toStringAsFixed(1)} kg',
                    ),
                    const SizedBox(
                      height: 8,
                    ),
                    LinearProgressIndicator(
                      value: percent,
                    ),
                  ],
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  // ============================================================
  // FIFO
  // ============================================================

  Widget _buildFifo() {
    final palletSlots = slots.where((raw) {
      if (raw is! Map) return false;

      return raw['palletId'] != null;
    }).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const CircleAvatar(
                  child: Icon(
                    Icons.low_priority,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Informasi FIFO',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(
                        height: 6,
                      ),
                      Text(
                        'Menampilkan pallet yang memiliki informasi posisi dan data inventory dari backend.',
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
        const SizedBox(height: 14),
        const Text(
          'Pallet Dalam Penyimpanan',
          style: TextStyle(
            fontSize: 18,
            fontWeight: FontWeight.w800,
          ),
        ),
        const SizedBox(height: 8),
        if (palletSlots.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text(
                'Belum ada pallet yang dapat ditampilkan.',
              ),
            ),
          ),
        ...palletSlots.map(
          (raw) => _fifoCard(raw),
        ),
      ],
    );
  }

  // ============================================================
  // FIFO CARD
  // ============================================================

  Widget _fifoCard(dynamic raw) {
    final x = raw is Map ? raw : <String, dynamic>{};

    return Card(
      margin: const EdgeInsets.only(
        bottom: 10,
      ),
      child: ListTile(
        leading: const CircleAvatar(
          child: Icon(
            Icons.inventory_2,
          ),
        ),
        title: Text(
          '${x['palletId'] ?? '-'}',
          style: const TextStyle(
            fontWeight: FontWeight.w800,
          ),
        ),
        subtitle: Text(
          'Posisi: ${x['warehouseCode'] ?? '-'} / '
          '${x['coldStorageCode'] ?? '-'} / '
          '${x['rackCode'] ?? '-'} / '
          '${x['levelCode'] ?? '-'} / '
          '${x['slotCode'] ?? '-'}',
        ),
        trailing: Chip(
          label: Text(
            '${x['slotStatus'] ?? 'occupied'}',
          ),
        ),
      ),
    );
  }

  // ============================================================
  // LOCATION SUMMARY
  // ============================================================

  Widget _locationSummary() {
    final occupied = _occupiedSlotCount();

    final available = slots.length - occupied;

    return Row(
      children: [
        _summaryMetric(
          'Total Slot',
          '${slots.length}',
          Icons.grid_view,
        ),
        _summaryMetric(
          'Terisi',
          '$occupied',
          Icons.inventory_2,
        ),
        _summaryMetric(
          'Kosong',
          '$available',
          Icons.check_circle_outline,
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
              const SizedBox(
                height: 5,
              ),
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
  // CAPACITY METRIC
  // ============================================================

  Widget _capacityMetric(
    String label,
    String value,
  ) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: const TextStyle(
              fontSize: 19,
              fontWeight: FontWeight.w900,
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
    );
  }

  // ============================================================
  // SLOT CARD
  // ============================================================

  Widget _slotCard(
    dynamic raw, {
    required String mode,
  }) {
    final x = raw is Map ? raw : <String, dynamic>{};

    final capacity =
        x['capacity'] is Map ? x['capacity'] as Map : <String, dynamic>{};

    final occupied = x['palletId'] != null;

    return Card(
      margin: const EdgeInsets.only(
        bottom: 10,
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(14),
        leading: CircleAvatar(
          child: Icon(
            occupied ? Icons.inventory_2 : Icons.grid_view,
          ),
        ),
        title: Text(
          '${x['slotCode'] ?? '-'}',
          style: const TextStyle(
            fontWeight: FontWeight.w800,
          ),
        ),
        subtitle: Text(
          '${x['warehouseCode'] ?? '-'} / '
          '${x['coldStorageCode'] ?? '-'} / '
          '${x['rackCode'] ?? '-'} / '
          '${x['levelCode'] ?? '-'}\n'
          'Pallet: ${x['palletId'] ?? 'EMPTY'} • '
          'Berat: ${capacity['usedWeightKg'] ?? 0}/'
          '${capacity['maxWeightKg'] ?? 0} kg',
        ),
        isThreeLine: true,
        trailing: Chip(
          label: Text(
            '${x['slotStatus'] ?? 'empty'}',
          ),
        ),
      ),
    );
  }

  // ============================================================
  // FILTER SLOT
  // ============================================================

  List<dynamic> _filteredSlots() {
    return slots
        .where((raw) {
          final x = raw is Map ? raw : <String, dynamic>{};

          final text = [
            x['slotCode'],
            x['palletId'],
            x['warehouseCode'],
            x['coldStorageCode'],
            x['rackCode'],
            x['levelCode'],
            x['slotStatus'],
          ].join(' ').toLowerCase();

          return text.contains(
            query.toLowerCase(),
          );
        })
        .take(100)
        .toList();
  }

  // ============================================================
  // OCCUPIED SLOT
  // ============================================================

  int _occupiedSlotCount() {
    return slots.where((raw) {
      if (raw is! Map) {
        return false;
      }

      return raw['palletId'] != null;
    }).length;
  }

  // ============================================================
  // CAPACITY CALCULATION
  // ============================================================

  Map<String, num> _calculateCapacity() {
    num used = 0;
    num max = 0;

    for (final raw in slots) {
      if (raw is! Map) continue;

      final capacity =
          raw['capacity'] is Map ? raw['capacity'] as Map : <String, dynamic>{};

      used += num.tryParse(
            '${capacity['usedWeightKg'] ?? 0}',
          ) ??
          0;

      max += num.tryParse(
            '${capacity['maxWeightKg'] ?? 0}',
          ) ??
          0;
    }

    return {
      'used': used,
      'max': max,
    };
  }

  // ============================================================
  // DESCRIPTION
  // ============================================================

  String _description(String mode) {
    switch (mode) {
      case 'Cek Posisi Pallet':
        return 'Periksa posisi pallet berdasarkan warehouse, cold storage, rack, level, dan slot.';

      case 'Movement Pallet':
        return 'Pindahkan pallet ke slot tujuan yang tersedia.';

      case 'Cek Kapasitas':
        return 'Pantau penggunaan kapasitas penyimpanan berdasarkan data slot.';

      case 'FIFO':
        return 'Periksa informasi posisi pallet untuk mendukung proses FIFO.';

      default:
        return 'Operasional warehouse dan posisi pallet.';
    }
  }
}

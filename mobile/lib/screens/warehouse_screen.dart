
import 'package:flutter/material.dart';
import '../services/api_service.dart';

class WarehouseScreen extends StatefulWidget {
  final ApiService api;
  final String? submenu;
  const WarehouseScreen({super.key, required this.api, this.submenu});

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

  Future<void> load() async {
    setState(() => loading = true);
    try {
      final a = await widget.api.get('/warehouses');
      final b = await widget.api.get('/warehouses/monitoring/slots');
      warehouses = a is List ? a : [];
      slots = b is Map && b['slots'] is List ? b['slots'] as List : (b is List ? b : []);
    } catch (e) {
      _msg(e.toString());
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  void _msg(String s) {
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(s)));
  }

  Future<void> _move(dynamic raw) async {
    if (raw is! Map || raw['palletId'] == null) {
      _msg('Pilih slot yang memiliki pallet.');
      return;
    }
    final target = await _selectSlot(raw['palletId'].toString());
    if (target == null) return;
    try {
      await widget.api.post('/warehouses/movement', {
        'palletId': raw['palletId'],
        'to': {
          'warehouseId': target['warehouseId'],
          'coldStorageId': target['coldStorageId'],
          'rackId': target['rackId'],
          'levelCode': target['levelCode'],
          'slotCode': target['slotCode'],
        },
        'reason': 'Mobile movement',
      });
      _msg('Pallet berhasil dipindahkan.');
      load();
    } catch (e) {
      _msg(e.toString());
    }
  }

  Future<Map<String, dynamic>?> _selectSlot(String palletId) async {
    final candidates = slots.where((x) {
      if (x is! Map) return false;
      final status = '${x['slotStatus'] ?? ''}';
      final occupiedBy = x['palletId'];
      return status != 'inactive' && (occupiedBy == null || '$occupiedBy' == palletId);
    }).toList();

    return showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      builder: (_) => SafeArea(
        child: SizedBox(
          height: MediaQuery.of(context).size.height * .75,
          child: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              const Text('Pilih Slot Tujuan', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
              const SizedBox(height: 10),
              ...candidates.map((x) {
                final m = x as Map;
                final map = Map<String, dynamic>.from(m);
                return Card(
                  child: ListTile(
                    title: Text('${m['slotCode'] ?? '-'}'),
                    subtitle: Text('${m['warehouseCode'] ?? '-'} / ${m['coldStorageCode'] ?? '-'} / ${m['rackCode'] ?? '-'} / ${m['levelCode'] ?? '-'}\n${m['slotStatus'] ?? '-'}'),
                    onTap: () => Navigator.pop(context, map),
                  ),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final mode = widget.submenu ?? 'Monitoring Slot';
    final filtered = slots.where((x) => '$x'.toLowerCase().contains(query.toLowerCase())).take(100).toList();

    return RefreshIndicator(
      onRefresh: load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(mode, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
          const SizedBox(height: 5),
          Text(_desc(mode), style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 16),
          if (loading) const LinearProgressIndicator(),
          if (mode == 'Kapasitas') _capacity(),
          TextField(
            onChanged: (v) => setState(() => query = v),
            decoration: const InputDecoration(prefixIcon: Icon(Icons.search), labelText: 'Cari slot / pallet / SKU'),
          ),
          const SizedBox(height: 12),
          ...filtered.map((x) => _slotCard(x, mode)),
          if (filtered.isEmpty && !loading) const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('Slot tidak ditemukan.'))),
        ],
      ),
    );
  }

  String _desc(String mode) {
    switch (mode) {
      case 'Posisi Pallet': return 'Lihat posisi pallet yang berasal dari API backend.';
      case 'Movement Pallet': return 'Pilih pallet lalu pilih slot tujuan yang tersedia.';
      case 'Kapasitas': return 'Pantau kapasitas slot dan utilisasi.';
      case 'FIFO': return 'Lihat prioritas FIFO dan warning dari backend.';
      default: return 'Monitoring slot gudang dan posisi pallet.';
    }
  }

  Widget _slotCard(dynamic raw, String mode) {
    final x = raw is Map ? raw : <String, dynamic>{};
    final capacity = x['capacity'] is Map ? x['capacity'] as Map : {};
    return Card(
      child: ListTile(
        leading: Icon(
          x['slotStatus'] == 'occupied' ? Icons.inventory_2 : Icons.grid_view,
          color: x['slotStatus'] == 'occupied' ? Colors.orange : Colors.grey,
        ),
        title: Text('${x['slotCode'] ?? '-'}', style: const TextStyle(fontWeight: FontWeight.w800)),
        subtitle: Text(
          '${x['warehouseCode'] ?? '-'} / ${x['coldStorageCode'] ?? '-'} / ${x['rackCode'] ?? '-'} / ${x['levelCode'] ?? '-'}\n'
          'Pallet: ${x['palletId'] ?? 'EMPTY'} • Berat: ${capacity['usedWeightKg'] ?? 0}/${capacity['maxWeightKg'] ?? 0} kg',
        ),
        isThreeLine: true,
        trailing: mode == 'Movement Pallet' && x['palletId'] != null
            ? IconButton(icon: const Icon(Icons.open_with), onPressed: () => _move(x))
            : Chip(label: Text('${x['slotStatus'] ?? 'empty'}')),
      ),
    );
  }

  Widget _capacity() {
    final summarySlots = slots.whereType<Map>().toList();
    num used = 0, max = 0;
    for (final x in summarySlots) {
      final c = x['capacity'] is Map ? x['capacity'] as Map : {};
      used += num.tryParse('${c['usedWeightKg'] ?? 0}') ?? 0;
      max += num.tryParse('${c['maxWeightKg'] ?? 0}') ?? 0;
    }
    final percent = max <= 0 ? 0 : (used / max * 100);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Kapasitas Berat', style: TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Text('${used.toStringAsFixed(1)} / ${max.toStringAsFixed(1)} kg (${percent.toStringAsFixed(0)}%)'),
          const SizedBox(height: 8),
          LinearProgressIndicator(value: (percent / 100).clamp(0, 1)),
          const SizedBox(height: 8),
          Text('Gudang: ${warehouses.length} • Slot: ${slots.length}'),
        ]),
      ),
    );
  }
}

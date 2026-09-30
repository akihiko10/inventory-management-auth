
import 'package:flutter/material.dart';
import '../services/api_service.dart';

class DashboardScreen extends StatefulWidget {
  final ApiService api;
  final String username;
  const DashboardScreen({super.key, required this.api, required this.username});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  bool loading = true;
  String? error;
  List<dynamic> pallets = [];
  List<dynamic> transactions = [];

  @override
  void initState() {
    super.initState();
    load();
  }

  Future<void> load() async {
    setState(() => loading = true);
    try {
      final p = await widget.api.get('/pallets');
      final t = await widget.api.get('/transactions');
      pallets = p is List ? p : [];
      transactions = t is List ? t : [];
      error = null;
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  num _weight() {
    num total = 0;
    for (final raw in pallets) {
      if (raw is Map && raw['summary'] is Map) {
        total += num.tryParse('${raw['summary']['totalWeight'] ?? 0}') ?? 0;
      }
    }
    return total;
  }

  Widget _kpi(String value, String label) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, mainAxisAlignment: MainAxisAlignment.center, children: [
        Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900)),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(color: Colors.grey)),
      ]),
    ),
  );

  @override
  Widget build(BuildContext context) {
    final inbound = transactions.where((x) => x is Map && x['type'] == 'inbound').length;
    final outbound = transactions.where((x) => x is Map && x['type'] == 'outbound').length;

    return RefreshIndicator(
      onRefresh: load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Halo, ${widget.username}', style: const TextStyle(color: Colors.grey)),
          const SizedBox(height: 14),
          if (error != null)
            Card(child: ListTile(
              leading: const Icon(Icons.wifi_off),
              title: const Text('Backend tidak dapat diakses'),
              subtitle: Text(error!),
              onTap: load,
            )),
          if (loading) const LinearProgressIndicator(),
          const SizedBox(height: 8),
          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,
            childAspectRatio: 1.7,
            crossAxisSpacing: 10,
            mainAxisSpacing: 10,
            children: [
              _kpi('${pallets.length}', 'Total Pallet'),
              _kpi('${_weight().toStringAsFixed(1)} kg', 'Total Weight'),
              _kpi('$inbound', 'Inbound'),
              _kpi('$outbound', 'Outbound'),
            ],
          ),
          const SizedBox(height: 24),
          const Text('Aktivitas Terbaru', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900)),
          const SizedBox(height: 8),
          if (transactions.isEmpty)
            const Card(child: Padding(padding: EdgeInsets.all(16), child: Text('Belum ada aktivitas.'))),
          ...transactions.take(10).map((raw) {
            final x = raw is Map ? raw : <String, dynamic>{};
            final type = '${x['type'] ?? 'transaction'}';
            return Card(child: ListTile(
              leading: CircleAvatar(child: Icon(type == 'outbound' ? Icons.outbox : Icons.move_to_inbox)),
              title: Text('${x['id'] ?? '-'} • ${type.toUpperCase()}'),
              subtitle: Text('${x['palletName'] ?? x['palletId'] ?? '-'} • ${x['driverName'] ?? '-'} • ${x['nopol'] ?? '-'}'),
              trailing: Text('${x['status'] ?? '-'}'),
            ));
          }),
        ],
      ),
    );
  }
}

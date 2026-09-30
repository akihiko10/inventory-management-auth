import 'package:flutter/material.dart';

import '../services/api_service.dart';

class DashboardScreen extends StatefulWidget {
  final ApiService api;
  final String username;

  const DashboardScreen({
    super.key,
    required this.api,
    required this.username,
  });

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
    if (mounted) {
      setState(() {
        loading = true;
      });
    }

    try {
      final p = await widget.api.get('/pallets');

      final t = await widget.api.get('/transactions');

      pallets = p is List ? p : [];

      transactions = t is List ? t : [];

      error = null;
    } catch (e) {
      error = e.toString();
    } finally {
      if (mounted) {
        setState(() {
          loading = false;
        });
      }
    }
  }

  num _weight() {
    num total = 0;

    for (final raw in pallets) {
      if (raw is Map && raw['summary'] is Map) {
        total += num.tryParse(
              '${raw['summary']['totalWeight'] ?? 0}',
            ) ??
            0;
      }
    }

    return total;
  }

  Widget _kpi(
    String value,
    String label,
  ) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              value,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 19,
                fontWeight: FontWeight.w900,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(
                fontSize: 12,
                color: Colors.grey,
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(
    BuildContext context,
  ) {
    final inbound = transactions
        .where(
          (x) => x is Map && x['type'] == 'inbound',
        )
        .length;

    final outbound = transactions
        .where(
          (x) => x is Map && x['type'] == 'outbound',
        )
        .length;

    final pending = transactions
        .where(
          (x) =>
              x is Map && (x['status'] == 'pending' || x['status'] == 'draft'),
        )
        .length;

    final confirmed = transactions
        .where(
          (x) => x is Map && x['status'] == 'confirmed',
        )
        .length;

    return RefreshIndicator(
      onRefresh: load,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // ======================================================
          // HEADER
          // ======================================================

          Card(
            child: Padding(
              padding: const EdgeInsets.all(18),
              child: Row(
                children: [
                  const CircleAvatar(
                    radius: 28,
                    child: Icon(
                      Icons.person_outline,
                      size: 30,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Warehouse Operator',
                          style: TextStyle(
                            fontSize: 14,
                            color: Colors.grey,
                          ),
                        ),
                        const SizedBox(height: 3),
                        Text(
                          'Halo, ${widget.username}',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 22,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        const SizedBox(height: 4),
                        const Text(
                          'Pantau aktivitas gudang hari ini.',
                          style: TextStyle(
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

          const SizedBox(height: 20),

          // ======================================================
          // ERROR
          // ======================================================

          if (error != null)
            Card(
              child: ListTile(
                leading: const Icon(
                  Icons.wifi_off,
                ),
                title: const Text(
                  'Backend tidak dapat diakses',
                ),
                subtitle: Text(error!),
                onTap: load,
              ),
            ),

          if (loading) const LinearProgressIndicator(),

          const SizedBox(height: 12),

          // ======================================================
          // RINGKASAN GUDANG
          // ======================================================

          const Text(
            'Ringkasan Gudang',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),

          const SizedBox(height: 10),

          GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: 2,

            // Dibuat lebih tinggi agar tidak overflow.
            childAspectRatio: 1.9,

            crossAxisSpacing: 10,
            mainAxisSpacing: 10,

            children: [
              _kpi(
                '${pallets.length}',
                'Total Pallet',
              ),
              _kpi(
                '${_weight().toStringAsFixed(1)} kg',
                'Total Weight',
              ),
              _kpi(
                '$inbound',
                'Inbound',
              ),
              _kpi(
                '$outbound',
                'Outbound',
              ),
            ],
          ),

          const SizedBox(height: 22),

          // ======================================================
          // STATUS OPERASIONAL
          // ======================================================

          const Text(
            'Status Operasional',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.w900,
            ),
          ),

          const SizedBox(height: 10),

          Card(
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 16,
                vertical: 8,
              ),
              child: Column(
                children: [
                  _statusRow(
                    Icons.pending_actions,
                    'Pending / Draft',
                    '$pending',
                  ),
                  const Divider(
                    height: 1,
                  ),
                  _statusRow(
                    Icons.check_circle_outline,
                    'Transaksi Confirmed',
                    '$confirmed',
                  ),
                  const Divider(
                    height: 1,
                  ),
                  _statusRow(
                    Icons.swap_vert,
                    'Total Transaksi',
                    '${transactions.length}',
                  ),
                ],
              ),
            ),
          ),

          const SizedBox(height: 22),

          // ======================================================
          // AKTIVITAS TERBARU
          // ======================================================

          const Text(
            'Aktivitas Terbaru',
            style: TextStyle(
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
                  'Belum ada aktivitas.',
                ),
              ),
            ),

          ...transactions.take(10).map(
            (raw) {
              final x = raw is Map ? raw : <String, dynamic>{};

              final type = '${x['type'] ?? 'transaction'}';

              return Card(
                child: ListTile(
                  leading: CircleAvatar(
                    child: Icon(
                      type == 'outbound'
                          ? Icons.outbox_outlined
                          : Icons.move_to_inbox_outlined,
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
                    '${x['palletName'] ?? x['palletId'] ?? '-'} • '
                    '${x['driverName'] ?? '-'} • '
                    '${x['nopol'] ?? '-'}',
                  ),
                  trailing: Text(
                    '${x['status'] ?? '-'}',
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _statusRow(
    IconData icon,
    String label,
    String value,
  ) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        vertical: 12,
      ),
      child: Row(
        children: [
          CircleAvatar(
            radius: 21,
            child: Icon(
              icon,
              size: 22,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              label,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.w700,
              ),
            ),
          ),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.w900,
            ),
          ),
        ],
      ),
    );
  }
}

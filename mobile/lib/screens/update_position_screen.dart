import 'package:flutter/material.dart';
import '../services/api_service.dart';

class UpdatePositionScreen extends StatefulWidget {
  final ApiService api;
  final String palletId;
  final Map<String, dynamic> pallet;

  const UpdatePositionScreen({
    super.key,
    required this.api,
    required this.palletId,
    required this.pallet,
  });

  @override
  State<UpdatePositionScreen> createState() => _UpdatePositionScreenState();
}

class _UpdatePositionScreenState extends State<UpdatePositionScreen> {
  List<dynamic> slots = [];

  String? warehouseId;
  String? coldStorageId;
  String? rackId;
  String? levelCode;
  String? slotCode;

  final reasonController = TextEditingController();

  bool loading = true;
  bool saving = false;

  @override
  void initState() {
    super.initState();
    _loadSlots();
  }

  Future<void> _loadSlots() async {
    try {
      final result = await widget.api.get('/warehouses/monitoring/slots');

      if (!mounted) return;

      setState(() {
        slots = result is List ? result : [];
        loading = false;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        loading = false;
      });

      _msg('Gagal memuat slot: $e');
    }
  }

  List<String> _uniqueValues(String key) {
    return slots
        .whereType<Map>()
        .map((item) => item[key]?.toString())
        .where((value) => value != null && value.isNotEmpty)
        .cast<String>()
        .toSet()
        .toList();
  }

  List<String> _coldStorageOptions() {
    return slots
        .whereType<Map>()
        .where(
          (item) =>
              warehouseId == null ||
              item['warehouseId']?.toString() == warehouseId,
        )
        .map((item) => item['coldStorageId']?.toString())
        .where((value) => value != null && value.isNotEmpty)
        .cast<String>()
        .toSet()
        .toList();
  }

  List<String> _rackOptions() {
    return slots
        .whereType<Map>()
        .where(
          (item) =>
              (warehouseId == null ||
                  item['warehouseId']?.toString() == warehouseId) &&
              (coldStorageId == null ||
                  item['coldStorageId']?.toString() == coldStorageId),
        )
        .map((item) => item['rackId']?.toString())
        .where((value) => value != null && value.isNotEmpty)
        .cast<String>()
        .toSet()
        .toList();
  }

  List<String> _levelOptions() {
    return slots
        .whereType<Map>()
        .where(
          (item) =>
              (warehouseId == null ||
                  item['warehouseId']?.toString() == warehouseId) &&
              (coldStorageId == null ||
                  item['coldStorageId']?.toString() == coldStorageId) &&
              (rackId == null ||
                  item['rackId']?.toString() == rackId),
        )
        .map((item) => item['levelCode']?.toString())
        .where((value) => value != null && value.isNotEmpty)
        .cast<String>()
        .toSet()
        .toList();
  }

  List<Map<String, dynamic>> _slotOptions() {
    return slots
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .where(
          (item) =>
              (warehouseId == null ||
                  item['warehouseId']?.toString() == warehouseId) &&
              (coldStorageId == null ||
                  item['coldStorageId']?.toString() == coldStorageId) &&
              (rackId == null ||
                  item['rackId']?.toString() == rackId) &&
              (levelCode == null ||
                  item['levelCode']?.toString() == levelCode),
        )
        .toList();
  }

  Future<void> _savePosition() async {
    if (warehouseId == null ||
        coldStorageId == null ||
        rackId == null ||
        levelCode == null ||
        slotCode == null) {
      _msg('Warehouse, Cold Storage, Rack, Level, dan Slot wajib dipilih.');
      return;
    }

    setState(() {
      saving = true;
    });

    try {
      await widget.api.post(
        '/warehouses/movement',
        {
          'palletId': widget.palletId,
          'to': {
            'warehouseId': warehouseId,
            'coldStorageId': coldStorageId,
            'rackId': rackId,
            'levelCode': levelCode,
            'slotCode': slotCode,
          },
          'reason': reasonController.text.trim(),
        },
      );

      if (!mounted) return;

      _msg('Posisi pallet berhasil diperbarui.');

      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;

      _msg('Gagal memperbarui posisi: $e');
    } finally {
      if (mounted) {
        setState(() {
          saving = false;
        });
      }
    }
  }

  void _msg(String message) {
    if (!mounted) return;

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
      ),
    );
  }

  String _currentLocation() {
    final location = widget.pallet['location'];

    if (location is Map) {
      final values = [
        location['warehouseCode'] ?? location['warehouseName'],
        location['coldStorageCode'] ?? location['coldStorageName'],
        location['rackCode'] ?? location['rackId'],
        location['levelCode'],
        location['slotCode'],
      ];

      return values
          .where((value) => value != null && '$value'.isNotEmpty)
          .join(' / ');
    }

    return 'Belum ditempatkan';
  }

  @override
  void dispose() {
    reasonController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final warehouseOptions = _uniqueValues('warehouseId');
    final coldStorageOptions = _coldStorageOptions();
    final rackOptions = _rackOptions();
    final levelOptions = _levelOptions();
    final slotOptions = _slotOptions();

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Update Posisi Pallet',
          style: TextStyle(fontWeight: FontWeight.w800),
        ),
      ),
      body: loading
          ? const Center(
              child: CircularProgressIndicator(),
            )
          : RefreshIndicator(
              onRefresh: _loadSlots,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Pallet ${widget.palletId}',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          const SizedBox(height: 8),
                          const Text(
                            'Posisi saat ini',
                            style: TextStyle(
                              color: Colors.grey,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _currentLocation(),
                            style: const TextStyle(
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),

                  const SizedBox(height: 16),

                  const Text(
                    'Posisi Baru',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                    ),
                  ),

                  const SizedBox(height: 12),

                  DropdownButtonFormField<String>(
                    initialValue: warehouseId,
                    decoration: const InputDecoration(
                      labelText: 'Warehouse',
                      border: OutlineInputBorder(),
                    ),
                    items: warehouseOptions
                        .map(
                          (value) => DropdownMenuItem<String>(
                            value: value,
                            child: Text(value),
                          ),
                        )
                        .toList(),
                    onChanged: (value) {
                      setState(() {
                        warehouseId = value;
                        coldStorageId = null;
                        rackId = null;
                        levelCode = null;
                        slotCode = null;
                      });
                    },
                  ),

                  const SizedBox(height: 12),

                  DropdownButtonFormField<String>(
                    initialValue: coldStorageId,
                    decoration: const InputDecoration(
                      labelText: 'Cold Storage',
                      border: OutlineInputBorder(),
                    ),
                    items: coldStorageOptions
                        .map(
                          (value) => DropdownMenuItem<String>(
                            value: value,
                            child: Text(value),
                          ),
                        )
                        .toList(),
                    onChanged: warehouseId == null
                        ? null
                        : (value) {
                            setState(() {
                              coldStorageId = value;
                              rackId = null;
                              levelCode = null;
                              slotCode = null;
                            });
                          },
                  ),

                  const SizedBox(height: 12),

                  DropdownButtonFormField<String>(
                    initialValue: rackId,
                    decoration: const InputDecoration(
                      labelText: 'Rack',
                      border: OutlineInputBorder(),
                    ),
                    items: rackOptions
                        .map(
                          (value) => DropdownMenuItem<String>(
                            value: value,
                            child: Text(value),
                          ),
                        )
                        .toList(),
                    onChanged: coldStorageId == null
                        ? null
                        : (value) {
                            setState(() {
                              rackId = value;
                              levelCode = null;
                              slotCode = null;
                            });
                          },
                  ),

                  const SizedBox(height: 12),

                  DropdownButtonFormField<String>(
                    initialValue: levelCode,
                    decoration: const InputDecoration(
                      labelText: 'Level',
                      border: OutlineInputBorder(),
                    ),
                    items: levelOptions
                        .map(
                          (value) => DropdownMenuItem<String>(
                            value: value,
                            child: Text(value),
                          ),
                        )
                        .toList(),
                    onChanged: rackId == null
                        ? null
                        : (value) {
                            setState(() {
                              levelCode = value;
                              slotCode = null;
                            });
                          },
                  ),

                  const SizedBox(height: 12),

                  DropdownButtonFormField<String>(
                    initialValue: slotCode,
                    decoration: const InputDecoration(
                      labelText: 'Slot',
                      border: OutlineInputBorder(),
                    ),
                    items: slotOptions
                        .map(
                          (slot) {
                            final code = slot['slotCode']?.toString() ?? '';

                            final status =
                                slot['slotStatus']?.toString() ?? '';

                            final pallet =
                                slot['palletName']?.toString() ?? '';

                            String label = code;

                            if (status.isNotEmpty) {
                              label += ' • $status';
                            }

                            if (pallet.isNotEmpty) {
                              label += ' • $pallet';
                            }

                            return DropdownMenuItem<String>(
                              value: code,
                              child: Text(
                                label,
                                overflow: TextOverflow.ellipsis,
                              ),
                            );
                          },
                        )
                        .where((item) => item.value != null)
                        .toList(),
                    onChanged: levelCode == null
                        ? null
                        : (value) {
                            setState(() {
                              slotCode = value;
                            });
                          },
                  ),

                  const SizedBox(height: 12),

                  TextField(
                    controller: reasonController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      labelText: 'Alasan Perpindahan',
                      hintText: 'Contoh: Pemindahan pallet ke rak baru',
                      border: OutlineInputBorder(),
                    ),
                  ),

                  const SizedBox(height: 20),

                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: saving ? null : _savePosition,
                      icon: saving
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                              ),
                            )
                          : const Icon(Icons.save),
                      label: Text(
                        saving
                            ? 'Menyimpan...'
                            : 'Simpan Posisi',
                      ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
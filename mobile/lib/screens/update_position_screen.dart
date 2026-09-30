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

  // ============================================================
  // LOAD SLOT
  // ============================================================

  Future<void> _loadSlots() async {
    if (mounted) {
      setState(() {
        loading = true;
      });
    }

    try {
      final result = await widget.api.get(
        '/warehouses/monitoring/slots',
      );

      List<dynamic> loadedSlots = [];

      // Backend bisa mengembalikan:
      //
      // {
      //   "slots": [...]
      // }
      //
      // atau langsung:
      //
      // [...]
      if (result is Map && result['slots'] is List) {
        loadedSlots = result['slots'] as List;
      } else if (result is List) {
        loadedSlots = result;
      }

      if (!mounted) return;

      setState(() {
        slots = loadedSlots;
        loading = false;
      });
    } catch (e) {
      if (!mounted) return;

      setState(() {
        loading = false;
      });

      _msg(
        'Gagal memuat slot: $e',
      );
    }
  }

  // ============================================================
  // NORMALIZE
  // ============================================================

  String _value(
    dynamic item,
    String key,
  ) {
    if (item is! Map) {
      return '';
    }

    final value = item[key];

    if (value == null) {
      return '';
    }

    return value.toString();
  }

  // ============================================================
  // WAREHOUSE
  // ============================================================

  List<String> _warehouseOptions() {
    final values = <String>{};

    for (final raw in slots) {
      if (raw is! Map) {
        continue;
      }

      final value = _value(
        raw,
        'warehouseId',
      );

      if (value.isNotEmpty) {
        values.add(value);
      }
    }

    return values.toList();
  }

  // ============================================================
  // COLD STORAGE
  // ============================================================

  List<String> _coldStorageOptions() {
    final values = <String>{};

    for (final raw in slots) {
      if (raw is! Map) {
        continue;
      }

      if (warehouseId != null &&
          _value(
                raw,
                'warehouseId',
              ) !=
              warehouseId) {
        continue;
      }

      final value = _value(
        raw,
        'coldStorageId',
      );

      if (value.isNotEmpty) {
        values.add(value);
      }
    }

    return values.toList();
  }

  // ============================================================
  // RACK
  // ============================================================

  List<String> _rackOptions() {
    final values = <String>{};

    for (final raw in slots) {
      if (raw is! Map) {
        continue;
      }

      if (warehouseId != null &&
          _value(
                raw,
                'warehouseId',
              ) !=
              warehouseId) {
        continue;
      }

      if (coldStorageId != null &&
          _value(
                raw,
                'coldStorageId',
              ) !=
              coldStorageId) {
        continue;
      }

      final value = _value(
        raw,
        'rackId',
      );

      if (value.isNotEmpty) {
        values.add(value);
      }
    }

    return values.toList();
  }

  // ============================================================
  // LEVEL
  // ============================================================

  List<String> _levelOptions() {
    final values = <String>{};

    for (final raw in slots) {
      if (raw is! Map) {
        continue;
      }

      if (warehouseId != null &&
          _value(
                raw,
                'warehouseId',
              ) !=
              warehouseId) {
        continue;
      }

      if (coldStorageId != null &&
          _value(
                raw,
                'coldStorageId',
              ) !=
              coldStorageId) {
        continue;
      }

      if (rackId != null &&
          _value(
                raw,
                'rackId',
              ) !=
              rackId) {
        continue;
      }

      final value = _value(
        raw,
        'levelCode',
      );

      if (value.isNotEmpty) {
        values.add(value);
      }
    }

    return values.toList();
  }

  // ============================================================
  // SLOT
  // ============================================================

  List<Map<String, dynamic>> _slotOptions() {
    final result = <Map<String, dynamic>>[];

    for (final raw in slots) {
      if (raw is! Map) {
        continue;
      }

      final item = Map<String, dynamic>.from(
        raw,
      );

      if (warehouseId != null &&
          _value(
                item,
                'warehouseId',
              ) !=
              warehouseId) {
        continue;
      }

      if (coldStorageId != null &&
          _value(
                item,
                'coldStorageId',
              ) !=
              coldStorageId) {
        continue;
      }

      if (rackId != null &&
          _value(
                item,
                'rackId',
              ) !=
              rackId) {
        continue;
      }

      if (levelCode != null &&
          _value(
                item,
                'levelCode',
              ) !=
              levelCode) {
        continue;
      }

      final slot = _value(
        item,
        'slotCode',
      );

      if (slot.isEmpty) {
        continue;
      }

      final status = _value(
        item,
        'slotStatus',
      ).toLowerCase();

      final occupiedPallet = item['palletId'];

      // Jangan tampilkan slot inactive.
      if (status == 'inactive') {
        continue;
      }

      // Jangan tampilkan slot yang sudah
      // ditempati pallet lain.
      //
      // Kalau palletId sama dengan pallet
      // yang sedang dipindahkan, slot tersebut
      // tetap boleh terlihat.
      if (occupiedPallet != null &&
          occupiedPallet.toString().isNotEmpty &&
          occupiedPallet.toString() != widget.palletId) {
        continue;
      }

      result.add(item);
    }

    return result;
  }

  // ============================================================
  // CURRENT LOCATION
  // ============================================================

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

      final result = values
          .where(
            (value) => value != null && '$value'.isNotEmpty,
          )
          .join(' / ');

      if (result.isNotEmpty) {
        return result;
      }
    }

    return 'Belum ditempatkan';
  }

  // ============================================================
  // SAVE MOVEMENT
  // ============================================================

  Future<void> _savePosition() async {
    if (warehouseId == null ||
        coldStorageId == null ||
        rackId == null ||
        levelCode == null ||
        slotCode == null) {
      _msg(
        'Warehouse, Cold Storage, Rack, Level, dan Slot wajib dipilih.',
      );
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

      if (!mounted) {
        return;
      }

      _msg(
        'Posisi pallet berhasil diperbarui.',
      );

      Navigator.pop(
        context,
        true,
      );
    } catch (e) {
      if (!mounted) {
        return;
      }

      _msg(
        'Gagal memperbarui posisi: $e',
      );
    } finally {
      if (mounted) {
        setState(() {
          saving = false;
        });
      }
    }
  }

  // ============================================================
  // MESSAGE
  // ============================================================

  void _msg(
    String message,
  ) {
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(
      context,
    ).showSnackBar(
      SnackBar(
        content: Text(message),
      ),
    );
  }

  // ============================================================
  // DISPOSE
  // ============================================================

  @override
  void dispose() {
    reasonController.dispose();

    super.dispose();
  }

  // ============================================================
  // BUILD
  // ============================================================

  @override
  Widget build(
    BuildContext context,
  ) {
    final warehouseOptions = _warehouseOptions();

    final coldStorageOptions = _coldStorageOptions();

    final rackOptions = _rackOptions();

    final levelOptions = _levelOptions();

    final slotOptions = _slotOptions();

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Movement Pallet',
          style: TextStyle(
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
      body: loading
          ? const Center(
              child: CircularProgressIndicator(),
            )
          : RefreshIndicator(
              onRefresh: _loadSlots,
              child: ListView(
                padding: const EdgeInsets.all(
                  16,
                ),
                children: [
                  // ==================================================
                  // PALLET
                  // ==================================================

                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(
                        18,
                      ),
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
                          const SizedBox(
                            height: 10,
                          ),
                          const Text(
                            'Posisi Saat Ini',
                            style: TextStyle(
                              color: Colors.grey,
                            ),
                          ),
                          const SizedBox(
                            height: 4,
                          ),
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

                  const SizedBox(
                    height: 20,
                  ),

                  // ==================================================
                  // TITLE
                  // ==================================================

                  const Text(
                    'Posisi Tujuan',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.w900,
                    ),
                  ),

                  const SizedBox(
                    height: 12,
                  ),

                  // ==================================================
                  // WAREHOUSE
                  // ==================================================

                  DropdownButtonFormField<String>(
                    value: warehouseId,
                    decoration: const InputDecoration(
                      labelText: 'Warehouse',
                      prefixIcon: Icon(
                        Icons.warehouse_outlined,
                      ),
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
                    onChanged: warehouseOptions.isEmpty
                        ? null
                        : (value) {
                            setState(() {
                              warehouseId = value;

                              coldStorageId = null;

                              rackId = null;

                              levelCode = null;

                              slotCode = null;
                            });
                          },
                  ),

                  if (warehouseOptions.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(
                        top: 6,
                      ),
                      child: Text(
                        'Warehouse belum tersedia dari data slot.',
                        style: TextStyle(
                          color: Colors.red,
                          fontSize: 12,
                        ),
                      ),
                    ),

                  const SizedBox(
                    height: 12,
                  ),

                  // ==================================================
                  // COLD STORAGE
                  // ==================================================

                  DropdownButtonFormField<String>(
                    value: coldStorageId,
                    decoration: const InputDecoration(
                      labelText: 'Cold Storage',
                      prefixIcon: Icon(
                        Icons.ac_unit,
                      ),
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

                  const SizedBox(
                    height: 12,
                  ),

                  // ==================================================
                  // RACK
                  // ==================================================

                  DropdownButtonFormField<String>(
                    value: rackId,
                    decoration: const InputDecoration(
                      labelText: 'Rack',
                      prefixIcon: Icon(
                        Icons.view_column,
                      ),
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

                  const SizedBox(
                    height: 12,
                  ),

                  // ==================================================
                  // LEVEL
                  // ==================================================

                  DropdownButtonFormField<String>(
                    value: levelCode,
                    decoration: const InputDecoration(
                      labelText: 'Level',
                      prefixIcon: Icon(
                        Icons.layers_outlined,
                      ),
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

                  const SizedBox(
                    height: 12,
                  ),

                  // ==================================================
                  // SLOT
                  // ==================================================

                  DropdownButtonFormField<String>(
                    value: slotCode,
                    decoration: InputDecoration(
                      labelText: 'Slot',
                      prefixIcon: const Icon(
                        Icons.grid_view,
                      ),
                      border: const OutlineInputBorder(),
                      helperText: '${slotOptions.length} slot tersedia',
                    ),
                    items: slotOptions.map(
                      (slot) {
                        final code = _value(
                          slot,
                          'slotCode',
                        );

                        final warehouse = _value(
                          slot,
                          'warehouseCode',
                        );

                        final coldStorage = _value(
                          slot,
                          'coldStorageCode',
                        );

                        final rack = _value(
                          slot,
                          'rackCode',
                        );

                        final level = _value(
                          slot,
                          'levelCode',
                        );

                        return DropdownMenuItem<String>(
                          value: code,
                          child: Text(
                            '$code  •  '
                            '$warehouse / '
                            '$coldStorage / '
                            '$rack / '
                            '$level',
                            overflow: TextOverflow.ellipsis,
                          ),
                        );
                      },
                    ).toList(),
                    onChanged: levelCode == null || slotOptions.isEmpty
                        ? null
                        : (value) {
                            setState(() {
                              slotCode = value;
                            });
                          },
                  ),

                  if (levelCode != null && slotOptions.isEmpty)
                    const Padding(
                      padding: EdgeInsets.only(
                        top: 6,
                      ),
                      child: Text(
                        'Tidak ada slot kosong pada posisi ini.',
                        style: TextStyle(
                          color: Colors.red,
                          fontSize: 12,
                        ),
                      ),
                    ),

                  const SizedBox(
                    height: 16,
                  ),

                  // ==================================================
                  // REASON
                  // ==================================================

                  const Text(
                    'Alasan Perpindahan',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.w800,
                    ),
                  ),

                  const SizedBox(
                    height: 8,
                  ),

                  TextField(
                    controller: reasonController,
                    maxLines: 3,
                    decoration: const InputDecoration(
                      hintText: 'Contoh: Pemindahan pallet ke rak baru',
                      border: OutlineInputBorder(),
                    ),
                  ),

                  const SizedBox(
                    height: 20,
                  ),

                  // ==================================================
                  // SAVE
                  // ==================================================

                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed:
                          saving || slotCode == null ? null : _savePosition,
                      icon: saving
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                              ),
                            )
                          : const Icon(
                              Icons.open_with,
                            ),
                      label: Text(
                        saving ? 'Memindahkan...' : 'Pindahkan Pallet',
                      ),
                    ),
                  ),

                  const SizedBox(
                    height: 10,
                  ),

                  // ==================================================
                  // DEBUG INFO
                  // ==================================================

                  if (slots.isEmpty)
                    const Card(
                      child: Padding(
                        padding: EdgeInsets.all(
                          14,
                        ),
                        child: Row(
                          children: [
                            Icon(
                              Icons.info_outline,
                            ),
                            SizedBox(
                              width: 10,
                            ),
                            Expanded(
                              child: Text(
                                'Data slot dari backend kosong. Tekan refresh untuk memuat ulang.',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                ],
              ),
            ),
    );
  }
}

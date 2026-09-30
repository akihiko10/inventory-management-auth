import 'package:flutter/material.dart';

import '../services/api_service.dart';
import 'dashboard_screen.dart';
import 'pallet_screen.dart';
import 'transaction_screen.dart';
import 'warehouse_screen.dart';
import 'manifest_screen.dart';
import 'barcode_scanner_screen.dart';

class AppShell extends StatefulWidget {
  final ApiService api;
  final String username;
  final VoidCallback onLogout;

  const AppShell({
    super.key,
    required this.api,
    required this.username,
    required this.onLogout,
  });

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  String page = 'dashboard';
  String? submenu;

  Widget _page() {
    switch (page) {
      case 'pallet':
        return PalletScreen(
          api: widget.api,
          submenu: submenu,
        );

      case 'warehouse':
        return WarehouseScreen(
          api: widget.api,
          submenu: submenu,
        );

      case 'transaction':
        return TransactionScreen(
          api: widget.api,
          submenu: submenu,
        );

      case 'manifest':
        return ManifestScreen(
          api: widget.api,
          submenu: submenu,
        );

      case 'dashboard':
      default:
        return DashboardScreen(
          api: widget.api,
          username: widget.username,
        );
    }
  }

  String _title() {
    if (submenu != null) {
      return submenu!;
    }

    switch (page) {
      case 'pallet':
        return 'Pallet';

      case 'warehouse':
        return 'Warehouse';

      case 'transaction':
        return 'Transaksi';

      case 'manifest':
        return 'Manifest';

      case 'dashboard':
      default:
        return 'Dashboard';
    }
  }

  void _select(String targetPage, [String? targetSubmenu]) {
    Navigator.of(context).pop();

    setState(() {
      page = targetPage;
      submenu = targetSubmenu;
    });
  }

  Future<void> _openScanner({
    required String title,
    required String type,
  }) async {
    Navigator.of(context).pop();

    final result = await Navigator.push<String>(
      context,
      MaterialPageRoute(
        builder: (_) => BarcodeScannerScreen(
          title: title,
        ),
      ),
    );

    if (!mounted || result == null || result.trim().isEmpty) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          '$type terbaca: $result',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(
          _title(),
          style: const TextStyle(
            fontWeight: FontWeight.w800,
          ),
        ),
        leading: Builder(
          builder: (context) {
            return IconButton(
              icon: const Icon(Icons.menu_rounded),
              onPressed: () {
                Scaffold.of(context).openDrawer();
              },
            );
          },
        ),
      ),
      drawer: _buildDrawer(),
      body: _page(),
    );
  }

  Drawer _buildDrawer() {
    return Drawer(
      child: SafeArea(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            _buildHeader(),

            const SizedBox(height: 8),

            // ============================================================
            // DASHBOARD
            // ============================================================

            _menuItem(
              icon: Icons.dashboard_outlined,
              title: 'Dashboard',
              selected: page == 'dashboard',
              onTap: () {
                _select('dashboard');
              },
            ),

            const Divider(height: 20),

            // ============================================================
            // PALLET
            // ============================================================

            _menuExpansion(
              icon: Icons.inventory_2_outlined,
              title: 'Pallet',
              expanded: page == 'pallet',
              children: [
                _submenuItem(
                  'Cari Pallet',
                  selected: page == 'pallet' &&
                      submenu == 'Cari Pallet',
                  onTap: () {
                    _select('pallet', 'Cari Pallet');
                  },
                ),
                _submenuItem(
                  'Scan Pallet / Barcode',
                  selected: page == 'pallet' &&
                      submenu == 'Scan Pallet / Barcode',
                  onTap: () {
                    _openScanner(
                      title: 'Scan Pallet',
                      type: 'Barcode pallet',
                    );
                  },
                ),
                _submenuItem(
                  'Detail Pallet',
                  selected: page == 'pallet' &&
                      submenu == 'Detail Pallet',
                  onTap: () {
                    _select('pallet', 'Detail Pallet');
                  },
                ),
                _submenuItem(
                  'Barang Dalam Pallet',
                  selected: page == 'pallet' &&
                      submenu == 'Barang Dalam Pallet',
                  onTap: () {
                    _select(
                      'pallet',
                      'Barang Dalam Pallet',
                    );
                  },
                ),
                _submenuItem(
                  'Summary Fisik',
                  selected: page == 'pallet' &&
                      submenu == 'Summary Fisik',
                  onTap: () {
                    _select(
                      'pallet',
                      'Summary Fisik',
                    );
                  },
                ),
                _submenuItem(
                  'Riwayat Posisi',
                  selected: page == 'pallet' &&
                      submenu == 'Riwayat Posisi',
                  onTap: () {
                    _select(
                      'pallet',
                      'Riwayat Posisi',
                    );
                  },
                ),
              ],
            ),

            // ============================================================
            // WAREHOUSE
            // ============================================================

            _menuExpansion(
              icon: Icons.warehouse_outlined,
              title: 'Warehouse',
              expanded: page == 'warehouse',
              children: [
                _submenuItem(
                  'Cek Posisi Pallet',
                  selected: page == 'warehouse' &&
                      submenu == 'Cek Posisi Pallet',
                  onTap: () {
                    _select(
                      'warehouse',
                      'Cek Posisi Pallet',
                    );
                  },
                ),
                _submenuItem(
                  'Movement Pallet',
                  selected: page == 'warehouse' &&
                      submenu == 'Movement Pallet',
                  onTap: () {
                    _select(
                      'warehouse',
                      'Movement Pallet',
                    );
                  },
                ),
                _submenuItem(
                  'Cek Kapasitas',
                  selected: page == 'warehouse' &&
                      submenu == 'Cek Kapasitas',
                  onTap: () {
                    _select(
                      'warehouse',
                      'Cek Kapasitas',
                    );
                  },
                ),
                _submenuItem(
                  'FIFO',
                  selected: page == 'warehouse' &&
                      submenu == 'FIFO',
                  onTap: () {
                    _select(
                      'warehouse',
                      'FIFO',
                    );
                  },
                ),
              ],
            ),

            // ============================================================
            // INBOUND
            // ============================================================

            _menuExpansion(
              icon: Icons.move_to_inbox_outlined,
              title: 'Inbound',
              expanded: page == 'transaction' &&
                  submenu != 'Outbound',
              children: [
                _submenuItem(
                  'Pilih / Scan Pallet',
                  selected: page == 'transaction' &&
                      submenu == 'Gateway Inbound',
                  onTap: () {
                    _select(
                      'transaction',
                      'Gateway Inbound',
                    );
                  },
                ),
                _submenuItem(
                  'Cek Barang',
                  selected: page == 'transaction' &&
                      submenu == 'Inbound - Cek Barang',
                  onTap: () {
                    _select(
                      'transaction',
                      'Inbound - Cek Barang',
                    );
                  },
                ),
                _submenuItem(
                  'Checklist Barang',
                  selected: page == 'transaction' &&
                      submenu == 'Inbound - Checklist',
                  onTap: () {
                    _select(
                      'transaction',
                      'Inbound - Checklist',
                    );
                  },
                ),
                _submenuItem(
                  'Driver & Nopol',
                  selected: page == 'transaction' &&
                      submenu == 'Inbound - Driver',
                  onTap: () {
                    _select(
                      'transaction',
                      'Inbound - Driver',
                    );
                  },
                ),
                _submenuItem(
                  'Konfirmasi Inbound',
                  selected: page == 'transaction' &&
                      submenu == 'Gateway Inbound',
                  onTap: () {
                    _select(
                      'transaction',
                      'Gateway Inbound',
                    );
                  },
                ),
              ],
            ),

            // ============================================================
            // OUTBOUND
            // ============================================================

            _menuExpansion(
              icon: Icons.outbox_outlined,
              title: 'Outbound',
              expanded: page == 'transaction' &&
                  submenu == 'Gateway Outbound',
              children: [
                _submenuItem(
                  'Pilih / Scan Pallet',
                  selected: page == 'transaction' &&
                      submenu == 'Outbound - Pilih Pallet',
                  onTap: () {
                    _select(
                      'transaction',
                      'Outbound - Pilih Pallet',
                    );
                  },
                ),
                _submenuItem(
                  'Pilih Barang Keluar',
                  selected: page == 'transaction' &&
                      submenu == 'Gateway Outbound',
                  onTap: () {
                    _select(
                      'transaction',
                      'Gateway Outbound',
                    );
                  },
                ),
                _submenuItem(
                  'Quantity Barang',
                  selected: page == 'transaction' &&
                      submenu == 'Outbound - Quantity',
                  onTap: () {
                    _select(
                      'transaction',
                      'Outbound - Quantity',
                    );
                  },
                ),
                _submenuItem(
                  'Driver & Nopol',
                  selected: page == 'transaction' &&
                      submenu == 'Outbound - Driver',
                  onTap: () {
                    _select(
                      'transaction',
                      'Outbound - Driver',
                    );
                  },
                ),
                _submenuItem(
                  'Konfirmasi Outbound',
                  selected: page == 'transaction' &&
                      submenu == 'Gateway Outbound',
                  onTap: () {
                    _select(
                      'transaction',
                      'Gateway Outbound',
                    );
                  },
                ),
              ],
            ),

            // ============================================================
            // TRANSAKSI
            // ============================================================

            _menuExpansion(
              icon: Icons.swap_horiz_rounded,
              title: 'Transaksi',
              expanded: page == 'transaction' &&
                  [
                    'Transaksi Draf',
                    'Pending Verification',
                    'Riwayat Transaksi',
                    'Log Aktivitas',
                  ].contains(submenu),
              children: [
                _submenuItem(
                  'Draft',
                  selected: page == 'transaction' &&
                      submenu == 'Transaksi Draf',
                  onTap: () {
                    _select(
                      'transaction',
                      'Transaksi Draf',
                    );
                  },
                ),
                _submenuItem(
                  'Pending Verification',
                  selected: page == 'transaction' &&
                      submenu == 'Pending Verification',
                  onTap: () {
                    _select(
                      'transaction',
                      'Pending Verification',
                    );
                  },
                ),
                _submenuItem(
                  'Riwayat Transaksi',
                  selected: page == 'transaction' &&
                      submenu == 'Riwayat Transaksi',
                  onTap: () {
                    _select(
                      'transaction',
                      'Riwayat Transaksi',
                    );
                  },
                ),
                _submenuItem(
                  'Log Aktivitas',
                  selected: page == 'transaction' &&
                      submenu == 'Log Aktivitas',
                  onTap: () {
                    _select(
                      'transaction',
                      'Log Aktivitas',
                    );
                  },
                ),
              ],
            ),

            // ============================================================
            // MANIFEST
            // ============================================================

            _menuExpansion(
              icon: Icons.receipt_long_outlined,
              title: 'Manifest',
              expanded: page == 'manifest',
              children: [
                _submenuItem(
                  'Lihat Manifest',
                  selected: page == 'manifest' &&
                      submenu == 'Lihat Manifest',
                  onTap: () {
                    _select(
                      'manifest',
                      'Lihat Manifest',
                    );
                  },
                ),
                _submenuItem(
                  'Detail Manifest',
                  selected: page == 'manifest' &&
                      submenu == 'Detail Manifest',
                  onTap: () {
                    _select(
                      'manifest',
                      'Detail Manifest',
                    );
                  },
                ),
                _submenuItem(
                  'Cek Barang',
                  selected: page == 'manifest' &&
                      submenu == 'Cek Barang',
                  onTap: () {
                    _select(
                      'manifest',
                      'Cek Barang',
                    );
                  },
                ),
                _submenuItem(
                  'Validasi Manifest',
                  selected: page == 'manifest' &&
                      submenu == 'Validasi Manifest',
                  onTap: () {
                    _select(
                      'manifest',
                      'Validasi Manifest',
                    );
                  },
                ),
              ],
            ),

            const Divider(height: 24),

            // ============================================================
            // LOGOUT
            // ============================================================

            ListTile(
              leading: const Icon(
                Icons.logout_rounded,
                color: Colors.red,
              ),
              title: const Text(
                'Logout',
                style: TextStyle(
                  color: Colors.red,
                  fontWeight: FontWeight.w600,
                ),
              ),
              onTap: () {
                Navigator.of(context).pop();
                widget.onLogout();
              },
            ),

            const SizedBox(height: 12),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return UserAccountsDrawerHeader(
      margin: EdgeInsets.zero,
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.primary,
      ),
      accountName: Text(
        widget.username,
        style: const TextStyle(
          fontWeight: FontWeight.w800,
        ),
      ),
      accountEmail: const Text(
        'Warehouse Mobile • Operasional Lapangan',
      ),
      currentAccountPicture: const CircleAvatar(
        child: Icon(
          Icons.warehouse_rounded,
          size: 28,
        ),
      ),
    );
  }

  Widget _menuItem({
    required IconData icon,
    required String title,
    required bool selected,
    required VoidCallback onTap,
  }) {
    return ListTile(
      leading: Icon(icon),
      title: Text(
        title,
        style: const TextStyle(
          fontWeight: FontWeight.w600,
        ),
      ),
      selected: selected,
      selectedTileColor:
          Theme.of(context).colorScheme.primary.withValues(
                alpha: 0.10,
              ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
      ),
      onTap: onTap,
    );
  }

  Widget _menuExpansion({
    required IconData icon,
    required String title,
    required bool expanded,
    required List<Widget> children,
  }) {
    return ExpansionTile(
      leading: Icon(icon),
      title: Text(
        title,
        style: const TextStyle(
          fontWeight: FontWeight.w600,
        ),
      ),
      initiallyExpanded: expanded,
      childrenPadding: const EdgeInsets.only(
        bottom: 6,
      ),
      children: children,
    );
  }

  Widget _submenuItem(
    String title, {
    required bool selected,
    required VoidCallback onTap,
  }) {
    return ListTile(
      contentPadding: const EdgeInsets.only(
        left: 72,
        right: 16,
      ),
      title: Text(
        title,
        style: TextStyle(
          fontSize: 14,
          fontWeight:
              selected ? FontWeight.w700 : FontWeight.w500,
        ),
      ),
      selected: selected,
      selectedTileColor:
          Theme.of(context).colorScheme.primary.withValues(
                alpha: 0.08,
              ),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
      ),
      onTap: onTap,
    );
  }
}
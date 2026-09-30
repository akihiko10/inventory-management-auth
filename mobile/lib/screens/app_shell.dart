
import 'package:flutter/material.dart';

import '../services/api_service.dart';
import 'dashboard_screen.dart';
import 'pallet_screen.dart';
import 'transaction_screen.dart';
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
        return PalletScreen(api: widget.api, submenu: submenu);
      case 'transaction':
        return TransactionScreen(api: widget.api, submenu: submenu);
      case 'manifest':
        return ManifestScreen(api: widget.api, submenu: submenu);
      default:
        return DashboardScreen(api: widget.api, username: widget.username);
    }
  }

  String _title() {
    if (submenu != null) return submenu!;
    switch (page) {
      case 'pallet': return 'Pallet';
      case 'transaction': return 'Transaksi';
      case 'manifest': return 'Manifest';
      default: return 'Dashboard';
    }
  }

  void _select(String p, [String? s]) {
    Navigator.of(context).pop();
    setState(() {
      page = p;
      submenu = s;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_title(), style: const TextStyle(fontWeight: FontWeight.w800)),
        leading: Builder(
          builder: (c) => IconButton(
            icon: const Icon(Icons.menu_rounded),
            onPressed: () => Scaffold.of(c).openDrawer(),
          ),
        ),
      ),
      drawer: _drawer(),
      body: _page(),
    );
  }

  Drawer _drawer() {
    return Drawer(
      child: SafeArea(
        child: ListView(
          padding: EdgeInsets.zero,
          children: [
            UserAccountsDrawerHeader(
              decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary),
              accountName: Text(widget.username),
              accountEmail: const Text('Warehouse Mobile • API Backend'),
              currentAccountPicture: const CircleAvatar(child: Icon(Icons.warehouse_rounded)),
            ),
            _item(Icons.dashboard_outlined, 'Dashboard', () => _select('dashboard')),
            _expansion(Icons.inventory_2_outlined, 'Pallet', [
              'Master Data Pallet',
              'Manajer Barang Dalam Palet',
              'Barcode & SKU',
              'Summary Fisik',
              'Riwayat Posisi',
            ], 'pallet'),
            ListTile(
              leading: const Icon(Icons.qr_code_scanner),
              title: const Text('Scan'),
              onTap: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const ScanMenuFromShell()),
                );
              },
            ),
            _item(Icons.move_to_inbox_outlined, 'Inbound', () => _select('transaction', 'Gateway Inbound')),
            _item(Icons.outbox_outlined, 'Outbound', () => _select('transaction', 'Gateway Outbound')),
            _expansion(Icons.local_shipping_outlined, 'Dispatch', [
              'Dispatch Driver & Nopol',
              'Transaksi Draf',
              'Log & Riwayat',
            ], 'transaction'),
            _expansion(Icons.receipt_long_outlined, 'Manifest', [
              'Grouping Armada',
              'Rekonsiliasi',
              'Master Summary & Weight',
              'Breakdown Kemasan',
              'Cetak & Export',
            ], 'manifest'),
            const Divider(),
            ListTile(
              leading: const Icon(Icons.logout, color: Colors.red),
              title: const Text('Logout', style: TextStyle(color: Colors.red)),
              onTap: () {
                Navigator.pop(context);
                widget.onLogout();
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _item(IconData icon, String label, VoidCallback onTap) {
    return ListTile(
      leading: Icon(icon),
      title: Text(label),
      selected: page == 'dashboard' && label == 'Dashboard',
      onTap: onTap,
    );
  }

  Widget _expansion(IconData icon, String label, List<String> children, String targetPage) {
    return ExpansionTile(
      leading: Icon(icon),
      title: Text(label),
      initiallyExpanded: page == targetPage,
      children: children.map((child) => ListTile(
        contentPadding: const EdgeInsets.only(left: 72, right: 16),
        title: Text(child),
        selected: page == targetPage && submenu == child,
        onTap: () => _select(targetPage, child),
      )).toList(),
    );
  }
}

class ScanMenuFromShell extends StatelessWidget {
  const ScanMenuFromShell({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan', style: TextStyle(fontWeight: FontWeight.w800))),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          _scan(context, 'Scan Pallet', 'Scan barcode pallet dengan kamera HP.'),
          _scan(context, 'Scan SKU', 'Scan barcode SKU dengan kamera HP.'),
        ],
      ),
    );
  }

  Widget _scan(BuildContext context, String title, String desc) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: const CircleAvatar(child: Icon(Icons.qr_code_scanner)),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
        subtitle: Padding(padding: const EdgeInsets.only(top: 4), child: Text(desc)),
        trailing: const Icon(Icons.chevron_right),
        onTap: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => BarcodeScannerScreen(title: title)),
        ),
      ),
    );
  }
}

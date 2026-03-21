import 'package:flutter/material.dart';
import 'ble_scanner_screen.dart';

class DeviceManagerScreen extends StatelessWidget {
  const DeviceManagerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xfff8f9fa),
      appBar: AppBar(
        title: const Text('Devices', style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.add, color: Colors.blue),
            onPressed: () {
              Navigator.push(
                context, 
                MaterialPageRoute(builder: (context) => const BleScannerScreen())
              );
            },
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          Container(
            color: Colors.white,
            child: const TabBar(
              labelColor: Colors.blue,
              unselectedLabelColor: Colors.grey,
              indicatorColor: Colors.blue,
              tabs: [
                Tab(text: 'Places'),
                Tab(text: 'Devices'),
              ],
              // Note: This would normally need a TabController, but we're keeping it simple for now as per the user's focus on Devices.
            ),
          ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.all(16.0),
              children: [
                _buildDeviceCard('Personal BLE Air Monitor', 'Bluetooth', true),
                _buildDeviceCard('Home API Sensor', 'Wi-Fi', false),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDeviceCard(String name, String type, bool isConnected) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          ListTile(
            contentPadding: const EdgeInsets.all(16),
            leading: CircleAvatar(
              backgroundColor: isConnected ? Colors.blue.shade50 : Colors.grey.shade100,
              child: Icon(
                type == 'Bluetooth' ? Icons.bluetooth : Icons.wifi,
                color: isConnected ? Colors.blue : Colors.grey,
              ),
            ),
            title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text(isConnected ? 'Connected & Logging' : 'Disconnected'),
            trailing: const Icon(Icons.chevron_right),
          ),
          if (isConnected) 
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50.withValues(alpha: 0.5),
                borderRadius: const BorderRadius.only(
                  bottomLeft: Radius.circular(16),
                  bottomRight: Radius.circular(16),
                ),
              ),
              child: const Row(
                children: [
                   Icon(Icons.battery_charging_full, size: 16, color: Colors.blue),
                   SizedBox(width: 8),
                   Text('85%', style: TextStyle(color: Colors.blue, fontWeight: FontWeight.bold)),
                   Spacer(),
                   Text('Last sync: 1 min ago', style: TextStyle(color: Colors.grey, fontSize: 12)),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

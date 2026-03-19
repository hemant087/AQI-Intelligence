import 'package:flutter/material.dart';

class DeviceManagerScreen extends StatelessWidget {
  const DeviceManagerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Connected Devices'),
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        physics: const BouncingScrollPhysics(),
        children: [
          const Text('Active Trackers', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          _buildDeviceCard('Personal BLE Air Monitor', 'Bluetooth', true),
          _buildDeviceCard('Home API Sensor', 'Wi-Fi', false),
          const SizedBox(height: 32),
          ElevatedButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.add),
            label: const Text('Pair New Device'),
            style: ElevatedButton.styleFrom(
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
          )
        ],
      ),
    );
  }

  Widget _buildDeviceCard(String name, String type, bool isConnected) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16), 
        side: BorderSide(color: Colors.grey.withOpacity(0.2))
      ),
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: (isConnected ? Colors.blue : Colors.grey).withOpacity(0.1),
            shape: BoxShape.circle,
          ),
          child: Icon(
            type == 'Bluetooth' ? Icons.bluetooth : Icons.wifi,
            color: isConnected ? Colors.blue : Colors.grey,
          ),
        ),
        title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(isConnected ? 'Connected & Logging' : 'Disconnected'),
        trailing: IconButton(
          icon: const Icon(Icons.settings),
          onPressed: () {},
        ),
      ),
    );
  }
}

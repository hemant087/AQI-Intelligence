import 'package:flutter/material.dart';
import 'screens/dashboard_screen.dart';
import 'screens/map_screen.dart';
import 'screens/device_manager_screen.dart';
import 'screens/contributions_screen.dart';

class MainNavigation extends StatefulWidget {
  const MainNavigation({super.key});

  @override
  State<MainNavigation> createState() => _MainNavigationState();
}

class _MainNavigationState extends State<MainNavigation> {
  int _currentIndex = 0;

  final List<Widget> _screens = [
    const DashboardScreen(),
    const MapScreen(),
    const DeviceManagerScreen(),
    const ContributionsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex,
        children: _screens,
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _currentIndex,
        onDestinationSelected: (index) => setState(() => _currentIndex = index),
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.dashboard_outlined), 
            selectedIcon: Icon(Icons.dashboard), 
            label: 'Home'
          ),
          NavigationDestination(
            icon: Icon(Icons.map_outlined), 
            selectedIcon: Icon(Icons.map), 
            label: 'Map'
          ),
          NavigationDestination(
            icon: Icon(Icons.bluetooth_connected_outlined), 
            selectedIcon: Icon(Icons.bluetooth_connected), 
            label: 'Devices'
          ),
          NavigationDestination(
            icon: Icon(Icons.stars_outlined), 
            selectedIcon: Icon(Icons.stars), 
            label: 'Contributions'
          ),
        ],
      ),
    );
  }
}

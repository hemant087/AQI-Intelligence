import 'package:flutter/material.dart';
import 'screens/dashboard_screen.dart';
import 'screens/map_screen.dart';
import 'screens/device_manager_screen.dart';
import 'screens/news_ranking_screen.dart';

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
    const NewsRankingScreen(),
    const Center(child: Text('Shop coming soon')),
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
            icon: Icon(Icons.cloud_outlined), 
            selectedIcon: Icon(Icons.cloud), 
            label: 'My Air'
          ),
          NavigationDestination(
            icon: Icon(Icons.map_outlined), 
            selectedIcon: Icon(Icons.map), 
            label: 'Map'
          ),
          NavigationDestination(
            icon: Icon(Icons.health_and_safety_outlined), 
            selectedIcon: Icon(Icons.health_and_safety), 
            label: 'Exposure'
          ),
          NavigationDestination(
            icon: Icon(Icons.article_outlined), 
            selectedIcon: Icon(Icons.article), 
            label: 'News & Rank'
          ),
          NavigationDestination(
            icon: Icon(Icons.shopping_cart_outlined), 
            selectedIcon: Icon(Icons.shopping_cart), 
            label: 'Shop'
          ),
        ],
      ),
    );
  }
}

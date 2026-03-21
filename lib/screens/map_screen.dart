import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/aqi_provider.dart';

class MapScreen extends ConsumerWidget {
  const MapScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final latestAsync = ref.watch(latestReadingProvider);
    
    LatLng initialCenter = const LatLng(28.6139, 77.2090);
    List<Marker> markers = [];
    
    // Simulate multiple air quality stations for a realistic map look
    final List<Map<String, dynamic>> mockStations = [
       {'pos': const LatLng(28.6139, 77.2090), 'aqi': 126, 'color': const Color(0xfff99049)},
       {'pos': const LatLng(28.6448, 77.2167), 'aqi': 153, 'color': const Color(0xfff65e5f)},
       {'pos': const LatLng(28.5355, 77.3910), 'aqi': 145, 'color': const Color(0xfff99049)},
       {'pos': const LatLng(28.4595, 77.0266), 'aqi': 112, 'color': const Color(0xfff99049)},
       {'pos': const LatLng(28.7041, 77.1025), 'aqi': 160, 'color': const Color(0xfff65e5f)},
    ];

    for (var station in mockStations) {
       markers.add(
         Marker(
           point: station['pos'],
           width: 45,
           height: 45,
           child: _buildMapMarker(station['aqi'], station['color']),
         )
       );
    }
    
    if (latestAsync is AsyncData && latestAsync.value != null) {
       final reading = latestAsync.value!;
       if (reading.latitude != null && reading.longitude != null) {
          final pos = LatLng(reading.latitude!, reading.longitude!);
          
          Color markerColor = const Color(0xffa8e05f);
          if (reading.pm25 > 35) markerColor = const Color(0xfffacd5c);
          if (reading.pm25 > 55) markerColor = const Color(0xfff99049);
          if (reading.pm25 > 150) markerColor = const Color(0xfff65e5f);

          markers.add(
            Marker(
              point: pos,
              width: 50,
              height: 50,
              child: _buildMapMarker(reading.pm25.toInt(), markerColor, isCurrent: true),
            )
          );
       }
    }

    return Scaffold(
      body: Stack(
        children: [
          FlutterMap(
            options: MapOptions(
              initialCenter: initialCenter,
              initialZoom: 12.0,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', // Lighter theme
                subdomains: const ['a', 'b', 'c', 'd'],
                userAgentPackageName: 'com.university.aqi',
              ),
              MarkerLayer(markers: markers),
            ],
          ),
          
          // Custom Top App Bar
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Row(
                children: [
                  Expanded(
                    child: Container(
                      height: 50,
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(25),
                        boxShadow: [
                          BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10, offset: const Offset(0, 4)),
                        ],
                      ),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      child: const Row(
                        children: [
                          Icon(Icons.search, color: Colors.grey),
                          SizedBox(width: 8),
                          Text('Search city or station', style: TextStyle(color: Colors.grey)),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  _buildFloatingButton(Icons.layers_outlined),
                ],
              ),
            ),
          ),
          
          // Legend/Controls
          Positioned(
             right: 16,
             bottom: 100,
             child: Column(
                children: [
                   _buildFloatingButton(Icons.my_location),
                   const SizedBox(height: 12),
                   _buildFloatingButton(Icons.info_outline),
                ],
             ),
          ),
        ],
      ),
    );
  }

  Widget _buildMapMarker(int value, Color color, {bool isCurrent = false}) {
     return Container(
        decoration: BoxDecoration(
           color: color,
           shape: BoxShape.circle,
           border: Border.all(color: Colors.white, width: isCurrent ? 3 : 2),
           boxShadow: [
              BoxShadow(color: color.withValues(alpha: 0.4), blurRadius: 6, spreadRadius: 2),
           ],
        ),
        child: Center(
           child: Text(
              '$value',
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
           ),
        ),
     );
  }

  Widget _buildFloatingButton(IconData icon) {
     return Container(
        width: 50,
        height: 50,
        decoration: BoxDecoration(
           color: Colors.white,
           shape: BoxShape.circle,
           boxShadow: [
              BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 10, offset: const Offset(0, 4)),
           ],
        ),
        child: IconButton(
           icon: Icon(icon, color: const Color(0xff1a73e8)),
           onPressed: () {},
        ),
     );
  }
}

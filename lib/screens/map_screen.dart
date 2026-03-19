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
    
    // Default to New Delhi Coordinates for Demo purposes
    LatLng initialCenter = const LatLng(28.6139, 77.2090);
    List<Marker> markers = [];
    
    if (latestAsync is AsyncData && latestAsync.value != null) {
       final reading = latestAsync.value!;
       if (reading.latitude != null && reading.longitude != null) {
          initialCenter = LatLng(reading.latitude!, reading.longitude!);
          
          Color markerColor = Colors.green;
          if (reading.pm25 > 50) markerColor = Colors.orange;
          if (reading.pm25 > 150) markerColor = Colors.red;

          markers.add(
            Marker(
              point: initialCenter,
              width: 50,
              height: 50,
              child: Icon(Icons.location_on, color: markerColor, size: 50),
            )
          );
       }
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Live Pollution Map'),
        elevation: 0,
        backgroundColor: Theme.of(context).colorScheme.surface,
      ),
      body: FlutterMap(
        options: MapOptions(
          initialCenter: initialCenter,
          initialZoom: 13.0,
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            userAgentPackageName: 'com.university.aqi',
          ),
          MarkerLayer(markers: markers),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../providers/aqi_provider.dart';

class DashboardScreen extends ConsumerWidget {
  const DashboardScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final aqiSummary = ref.watch(aqiSummaryProvider);
    final currentPm = aqiSummary['current_pm25'];
    final level = aqiSummary['level'] ?? 'Good';

    // IQAir Color Palette
    Color getLevelColor(String level) {
      if (level.contains('Moderate')) return const Color(0xfffacd5c);
      if (level.contains('Unhealthy (Sens.)')) return const Color(0xfff99049);
      if (level.contains('Unhealthy')) return const Color(0xfff65e5f);
      if (level.contains('Very Unhealthy')) return const Color(0xffa070b6);
      if (level == 'Hazardous') return const Color(0xffa06a7b);
      return const Color(0xffa8e05f); // Good
    }

    final levelColor = getLevelColor(level);

    return Scaffold(
      backgroundColor: const Color(0xfff8f9fa),
      body: CustomScrollView(
        physics: const BouncingScrollPhysics(),
        slivers: [
          _buildSliverAppBar(context),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   _buildMainAqiCard(context, currentPm, level, levelColor),
                   const SizedBox(height: 16),
                   _buildWeatherSection(context, aqiSummary),
                   const SizedBox(height: 24),
                   _buildHourlyForecast(context),
                   const SizedBox(height: 24),
                   _buildDailyForecast(context),
                   const SizedBox(height: 32),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSliverAppBar(BuildContext context) {
    return SliverAppBar(
      floating: true,
      pinned: true,
      elevation: 0,
      backgroundColor: Colors.white,
      expandedHeight: 100,
      flexibleSpace: FlexibleSpaceBar(
        titlePadding: const EdgeInsets.only(left: 16, bottom: 12),
        title: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                 const Icon(Icons.location_on, size: 14, color: Colors.blue),
                 const SizedBox(width: 4),
                 Text(
                  'New Delhi',
                  style: TextStyle(
                    fontSize: 18, 
                    fontWeight: FontWeight.bold, 
                    color: Colors.blue.shade900
                  ),
                ),
              ],
            ),
            const Text(
              'Delhi, India • 02:30 PM',
              style: TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.normal),
            ),
          ],
        ),
      ),
      actions: [
        IconButton(icon: const Icon(Icons.edit_outlined, color: Colors.grey), onPressed: () {}),
        IconButton(icon: const Icon(Icons.add, color: Colors.grey), onPressed: () {}),
        const SizedBox(width: 8),
      ],
    );
  }

  Widget _buildMainAqiCard(BuildContext context, String pmValue, String level, Color color) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: color.withValues(alpha: 0.3),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Stack(
        children: [
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.2),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        children: [
                          Text(
                            pmValue,
                            style: const TextStyle(
                              fontSize: 28, 
                              fontWeight: FontWeight.bold, 
                              color: Colors.white
                            ),
                          ),
                          const Text(
                            'US AQI*',
                            style: TextStyle(fontSize: 10, color: Colors.white70),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Text(
                        level,
                        style: const TextStyle(
                          fontSize: 22, 
                          fontWeight: FontWeight.bold, 
                          color: Colors.white
                        ),
                      ),
                    ),
                    const Icon(Icons.face_retouching_natural, size: 48, color: Colors.white),
                  ],
                ),
                const SizedBox(height: 16),
                const Divider(color: Colors.white24),
                const SizedBox(height: 12),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'Main pollutant: PM2.5',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.w500),
                    ),
                    Text(
                      '40.0 µg/m³',
                      style: TextStyle(color: Colors.white.withValues(alpha: 0.9)),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWeatherSection(BuildContext context, Map<String, dynamic> summary) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _buildWeatherItem(Icons.thermostat, summary['temperature'] ?? '--°', 'Temp'),
          _buildWeatherItem(Icons.water_drop, summary['humidity'] ?? '--%', 'Humidity'),
          Expanded(child: _buildWeatherItem(Icons.sensors, 'Source', summary['source_name'] ?? 'Connecting...')),
        ],
      ),
    );
  }

  Widget _buildWeatherItem(IconData icon, String value, String label) {
    return Column(
      children: [
        Icon(icon, color: Colors.blue.shade300, size: 28),
        const SizedBox(height: 8),
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16), textAlign: TextAlign.center, overflow: TextOverflow.ellipsis),
        Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12), textAlign: TextAlign.center, overflow: TextOverflow.ellipsis),
      ],
    );
  }

  Widget _buildHourlyForecast(BuildContext context) {
    final List<Map<String, dynamic>> hourly = [
      {'time': 'Now', 'aqi': 112, 'color': const Color(0xfff99049), 'temp': '25°'},
      {'time': '03:30', 'aqi': 116, 'color': const Color(0xfff99049), 'temp': '25°'},
      {'time': '04:30', 'aqi': 119, 'color': const Color(0xfff99049), 'temp': '25°'},
      {'time': '05:30', 'aqi': 122, 'color': const Color(0xfff65e5f), 'temp': '24°'},
      {'time': '06:30', 'aqi': 125, 'color': const Color(0xfff65e5f), 'temp': '23°'},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Hourly forecast', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        SizedBox(
          height: 140,
          child: ListView.builder(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            itemCount: hourly.length,
            itemBuilder: (context, index) {
              final item = hourly[index];
              return Container(
                width: 80,
                margin: const EdgeInsets.only(right: 12),
                padding: const EdgeInsets.symmetric(vertical: 12),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.grey.shade100),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(item['time'], style: const TextStyle(fontSize: 12, color: Colors.grey)),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: item['color'],
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '${item['aqi']}',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                      ),
                    ),
                    Icon(Icons.wb_cloudy_outlined, size: 20, color: Colors.blue.shade200),
                    Text(item['temp'], style: const TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildDailyForecast(BuildContext context) {
    final List<Map<String, dynamic>> daily = [
      {'day': 'Today', 'aqi': 139, 'color': const Color(0xfff99049), 'temp': '26°/16°'},
      {'day': 'Sun', 'aqi': 150, 'color': const Color(0xfff99049), 'temp': '27°/18°'},
      {'day': 'Mon', 'aqi': 153, 'color': const Color(0xfff65e5f), 'temp': '28°/19°'},
    ];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Daily forecast', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            Text('3d | 7d', style: TextStyle(color: Colors.blue, fontWeight: FontWeight.w500)),
          ],
        ),
        const SizedBox(height: 12),
        Container(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: Colors.grey.shade100),
          ),
          child: ListView.separated(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: daily.length,
            separatorBuilder: (context, index) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final item = daily[index];
              return Padding(
                padding: const EdgeInsets.all(16.0),
                child: Row(
                  children: [
                    SizedBox(width: 80, child: Text(item['day'], style: const TextStyle(fontWeight: FontWeight.bold))),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: item['color'],
                        borderRadius: BorderRadius.circular(4),
                      ),
                      child: Text(
                        '${item['aqi']}',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const Spacer(),
                    Icon(Icons.wb_cloudy_outlined, size: 24, color: Colors.blue.shade200),
                    const SizedBox(width: 16),
                    Text(item['temp'], style: const TextStyle(color: Colors.grey)),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

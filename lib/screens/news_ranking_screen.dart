import 'package:flutter/material.dart';

class NewsRankingScreen extends StatefulWidget {
  const NewsRankingScreen({super.key});

  @override
  State<NewsRankingScreen> createState() => _NewsRankingScreenState();
}

class _NewsRankingScreenState extends State<NewsRankingScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        titleSpacing: 16,
        backgroundColor: Colors.white,
        elevation: 0,
        title: const Text('IQAir Style ranking', style: TextStyle(color: Colors.blue, fontWeight: FontWeight.bold, fontSize: 18)),
        actions: [
          IconButton(icon: const Icon(Icons.search, color: Colors.grey), onPressed: () {}),
          IconButton(icon: const Icon(Icons.notifications_none, color: Colors.grey), onPressed: () {}),
          const CircleAvatar(backgroundColor: Color(0xffa68c7c), radius: 14, child: Text('T', style: TextStyle(color: Colors.white, fontSize: 12))),
          const SizedBox(width: 16),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.black,
          unselectedLabelColor: Colors.grey,
          indicatorColor: Colors.blue,
          indicatorSize: TabBarIndicatorSize.label,
          tabs: const [
            Tab(text: 'Ranking'),
            Tab(text: 'News'),
            Tab(text: 'Resources'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildRankingTab(),
          _buildNewsTab(),
          _buildResourcesTab(),
        ],
      ),
    );
  }

  Widget _buildRankingTab() {
    final List<Map<String, dynamic>> rankings = [
      {'name': 'Asansol, West Bengal', 'aqi': 153, 'color': const Color(0xfff65e5f)},
      {'name': 'Greater Noida, Uttar Pradesh', 'aqi': 152, 'color': const Color(0xfff65e5f)},
      {'name': 'Noida, Uttar Pradesh', 'aqi': 145, 'color': const Color(0xfff99049)},
      {'name': 'Delhi', 'aqi': 126, 'color': const Color(0xfff99049)},
      {'name': 'Durgapur, West Bengal', 'aqi': 122, 'color': const Color(0xfff99049)},
      {'name': 'New Delhi, Delhi', 'aqi': 119, 'color': const Color(0xfff99049)},
      {'name': 'Tirupati, Andhra Pradesh', 'aqi': 117, 'color': const Color(0xfff99049)},
      {'name': 'Ghaziabad, Uttar Pradesh', 'aqi': 117, 'color': const Color(0xfff99049)},
      {'name': 'Solapur, Maharashtra', 'aqi': 116, 'color': const Color(0xfff99049)},
    ];

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: () {},
                  style: OutlinedButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                  child: const Text('Worldwide', style: TextStyle(color: Colors.black)),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  onPressed: () {},
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.blue, 
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    elevation: 0,
                  ),
                  child: const Text('India', style: TextStyle(color: Colors.white)),
                ),
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView.separated(
            itemCount: rankings.length,
            separatorBuilder: (context, index) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final item = rankings[index];
              return ListTile(
                leading: Text('${index + 1}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                title: Text(item['name'], style: const TextStyle(fontWeight: FontWeight.bold)),
                trailing: Container(
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
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _buildNewsTab() {
    final List<Map<String, dynamic>> news = [
      {
        'title': 'Wildfire Map Spotlight: Morrill Fire, Nebraska',
        'time': '22 hours ago',
        'imageUrl': 'https://example.com/fire.jpg',
        'isLarge': true
      },
      {
        'title': 'March 20, 2026: Krakow among the most polluted cities in the world',
        'time': '22 hours ago',
        'imageUrl': 'https://example.com/krakow.jpg',
        'isLarge': false
      },
      {
        'title': 'China Air Quality Alert',
        'time': 'a day ago',
        'imageUrl': 'https://example.com/china.jpg',
        'isLarge': false
      },
    ];

    return ListView.builder(
      itemCount: news.length,
      itemBuilder: (context, index) {
        final item = news[index];
        if (item['isLarge']) {
          return Column(
             crossAxisAlignment: CrossAxisAlignment.start,
             children: [
                Container(
                  height: 200,
                  width: double.infinity,
                  color: Colors.grey.shade200, // Placeholder
                  child: const Icon(Icons.image, size: 64, color: Colors.grey),
                ),
                Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item['title'], style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Text(item['time'], style: const TextStyle(color: Colors.grey)),
                    ],
                  ),
                ),
                const Divider(),
             ],
          );
        }
        return Padding(
          padding: const EdgeInsets.all(16.0),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item['title'], style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Text(item['time'], style: const TextStyle(color: Colors.grey)),
                  ],
                ),
              ),
              const SizedBox(width: 16),
              Container(
                width: 100,
                height: 70,
                color: Colors.grey.shade200,
                child: const Icon(Icons.image, color: Colors.grey),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildResourcesTab() {
     final List<String> resources = [
        'Greenhouse Gases',
        'What is data availability rule?',
        'Using AirVisual Pro (IFTTT/no Applet)',
        'How to use IFTTT with my AirVisual Pro',
        'How can I reset my AirVisual Pro?',
     ];

     return ListView.separated(
        itemCount: resources.length,
        separatorBuilder: (context, index) => const Divider(height: 1),
        itemBuilder: (context, index) {
           return ListTile(
              contentPadding: const EdgeInsets.all(16),
              title: Text(resources[index], style: const TextStyle(fontSize: 16)),
              trailing: Container(
                 width: 80,
                 height: 60,
                 color: Colors.grey.shade200,
                 child: const Icon(Icons.image, color: Colors.grey, size: 24),
              ),
           );
        },
     );
  }
}

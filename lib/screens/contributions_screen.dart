import 'package:flutter/material.dart';

class ContributionsScreen extends StatelessWidget {
  const ContributionsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Contributions & Alerts'),
        backgroundColor: Theme.of(context).colorScheme.surface,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        physics: const BouncingScrollPhysics(),
        children: const [
          Text('Your Impact', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          SizedBox(height: 16),
          Row(
            children: [
              Expanded(child: _StatBox(label: 'Data Points', value: '1,240', color: Colors.green)),
              SizedBox(width: 16),
              Expanded(child: _StatBox(label: 'Area Mapped (km²)', value: '12.5', color: Colors.blue)),
            ],
          ),
          SizedBox(height: 32),
          Text('Community Rank', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 8),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: Icon(Icons.emoji_events, color: Colors.amber, size: 48),
            title: Text('Top 5% Contributor in Delhi NCR', style: TextStyle(fontWeight: FontWeight.bold)),
            subtitle: Text('Keep it up! Your data helps researchers predict pollution movements.'),
          ),
          Divider(height: 48),
          Text('Recent Alerts', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          SizedBox(height: 16),
          _AlertCard(
            title: 'Severe Smog Warning', 
            body: 'PM2.5 exceeding 300 in your vicinity. Avoid outdoor physical activities for the next 4 hours.', 
            color: Colors.red,
          ),
          SizedBox(height: 12),
          _AlertCard(
            title: 'Indoor Air Refresh', 
            body: 'Outdoor PM2.5 levels drop to moderate. Good time to ventilate your rooms.', 
            color: Colors.green,
          ),
        ],
      ),
    );
  }
}

class _StatBox extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatBox({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: const BorderRadius.all(Radius.circular(20)),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Column(
        children: [
          Text(value, style: TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: color)),
          const SizedBox(height: 8),
          Text(label, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500), textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

class _AlertCard extends StatelessWidget {
  final String title;
  final String body;
  final Color color;

  const _AlertCard({
    required this.title,
    required this.body,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      color: color.withValues(alpha: 0.05),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: const BorderRadius.all(Radius.circular(16)), 
        side: BorderSide(color: color.withValues(alpha: 0.2))
      ),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.warning_amber_rounded, color: color, size: 28),
                const SizedBox(width: 12),
                Expanded(child: Text(title, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 18))),
              ],
            ),
            const SizedBox(height: 12),
            Text(body, style: const TextStyle(fontSize: 15, height: 1.4)),
          ],
        ),
      ),
    );
  }
}

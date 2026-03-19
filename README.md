# Universal AQI Mobile App

A scalable, decoupled cross-platform Flutter application acting as a central hub for crowdsourced Air Quality monitoring, mapping, and personal exposure tracking.

## Core Capabilities
- **Device Agnostic Extensibility**: Seamlessly attaches to BLE Air Monitors, polls data from WiFi/Cloud devices, and supports manual entry mappings.
- **Offline-First Contextualization**: Integrates dynamic GPS coordinates and calculates indoor/outdoor contexts based on precision heuristics. Offline readings are durably stored in SQLite and batched to the cloud asynchronously.
- **Live Spatial Map**: Translates crowdsourced coordinates natively using OpenStreetMap (`flutter_map`) to provide a localized smog heatmap.
- **Gamified Contributions**: Rewards community participants for expanding the geographic coverage of standard CPCB datasets.

## Development Setup
1. Ensure the Flutter SDK is installed and configured in your environment path.
2. In this working directory, install packages: `flutter pub get`
3. Launch to emulator/device: `flutter run`

## Folder Topography
- `lib/adapters/`: Hardware device extraction classes implementing the shared DeviceAdapter abstraction.
- `lib/models/`: Unified JSON serialization logic for `AQIReading`.
- `lib/logic/`: The core `DataCollectionManager` driving validation, bounding filtering, and coordinate enrichment.
- `lib/services/`: SQLite (`sqflite`), background network Sync API integrations (`dio`), and GIS modules (`geolocator`).
- `lib/providers/`: Data flow streaming powered via `flutter_riverpod`.
- `lib/screens/`: Material3 stylized user interface routes.

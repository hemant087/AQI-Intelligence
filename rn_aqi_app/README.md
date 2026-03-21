# AQI Mobile App (React Native/Expo)

This is a premium, React Native version of the AQI Mobile App, featuring a high-fidelity UI inspired by **IQAir AirVisual** and real **Bluetooth Low Energy (BLE)** integration.

## Key Enhancements
- **Real BLE Scanning**: Unlike the Flutter version which used mocked data, this app uses `react-native-ble-plx` to scan and connect to real GATT-compatible AQI monitors.
- **IQAir UI/UX**: Professional dashboard with dynamic color-coding, health recommendations, and detailed pollutant breakdowns.
- **Offline-First**: Uses `expo-sqlite` for persistent local storage of readings.
- **Geotagging**: Automatic enrichment of readings with GPS coordinates via `expo-location`.

## Getting Started

### 1. Installation
```bash
cd rn_aqi_app
npm install
```

### 2. Running the App
- **Web Preview (Layout only)**:
  ```bash
  npx expo start --web
  ```
- **Native Development (Recommended for BLE)**:
  To test BLE and Location features, use the Expo Go app or a Development Build:
  ```bash
  npx expo start
  ```

## Project Structure
- `src/logic/BleAdapter.ts`: Real hardware integration.
- `src/logic/DataCollectionManager.ts`: Central data hub.
- `src/hooks/useAqiData.ts`: Reactive state for the UI.
- `app/(tabs)/`: Main navigation screens (Dashboard, Map, Devices).

## Troubleshooting BLE
BLE requires native permissions. Ensure you have enabled Bluetooth and Location on your mobile device. For Android 12+, ensure "Nearby Devices" permissions are granted.

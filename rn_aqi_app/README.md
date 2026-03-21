# 🌍 OpenAQI Mobile App (React Native/Expo)

Welcome to **OpenAQI**, a premium, open-source React Native application designed to be the *universal* companion app for any Air Quality Index (AQI) monitor.

Featuring a high-fidelity UI inspired by professional air quality dashboards (like IQAir), this app is built to connect to hardware sensors, map the data, and store it locally—regardless of who manufactured the sensor.

## 🏗️ Architecture: The Universal Adapter Pattern

We are building OpenAQI to support *any* device. To achieve this, the app uses an **Adapter Pattern architecture**. Instead of hardcoding a specific connection method, the app relies on a universal `IAqiAdapter` interface. 

Currently, our core implementation includes:
- 🔵 **Bluetooth Low Energy (BLE)** via `BleAdapter.ts` (using `react-native-ble-plx`) to scan and connect directly to GATT-compatible monitors.

**Planned Adapters (We need your help!):**
- ☁️ **CloudApiAdapter**: To fetch data from public/private REST APIs or MQTT brokers (PurpleAir, OpenAQ).
- 📶 **WifiDirectAdapter**: To connect to sensors broadcasting their own local IP hotpots.
- 🔌 **SerialAdapter**: USB-OTG connection for hardware hackers.
- 📱 **NfcAdapter**: Tap-to-read functionality.

## ✨ Key Features
- **Universal Hardware Support**: Designed to swap connection adapters on the fly.
- **Premium UI/UX**: Dynamic color-coding, health recommendations, and detailed pollutant breakdowns.
- **Offline-First**: Uses `expo-sqlite` for persistent local storage of readings when off-grid.
- **Geotagging**: Automatically tags air readings with GPS coordinates via `expo-location`.

---

## 🚀 Getting Started

### 1. Installation
Clone the repository and install dependencies:
```bash
cd rn_aqi_app
npm install
```

### 2. Running the App
Since this app relies heavily on native hardware APIs (Bluetooth, SQLite, Location), **you must run it via a Native Development Build**. Standard web previews or the public Expo Go app will not support the custom native code for BLE on newer SDKs.

**Option A: Cloud Build (EAS)**
If you don't have Android Studio installed, let Expo build it for you in the cloud:
```bash
npm install -g eas-cli
eas login
eas build --profile development --platform android
```

**Option B: Local Build**
If you have Android Studio/SDKs set up locally:
```bash
npx expo run:android
```

Then, whenever you want to start the Metro server, just run:
```bash
npm start
```

---

## 🤝 Contributing (We Want You!)

This project is completely **open-source**, and we are actively looking for contributors! 

Whether you are a React Native expert or a hardware enthusiast, your contributions are welcome. We are especially looking for help building out the remaining hardware connection adapters:

1. **Check the Issues:** Look for tags like `help-wanted` or `adapter-request`.
2. **Build an Adapter:** Duplicate the structure of `src/logic/BleAdapter.ts` to create `CloudApiAdapter.ts` or `WifiAdapter.ts`.
3. **Submit a PR:** Make sure your code is clean and tested!

### Development Structure
- `src/logic/`: Where the hardware adapters live. 
- `src/logic/DataCollectionManager.ts`: The central data hub that consumes the adapters.
- `src/hooks/useAqiData.ts`: Exposes the reactive state to the UI components.
- `app/(tabs)/`: Main navigation screens (Dashboard, Map, Devices).

---

## 📱 Screenshots

| **Dashboard** | **Official Monitors** | **Map View** |
| :---: | :---: | :---: |
| <img src="assets/screenshots/dashboard.png" width="260"> | <img src="assets/screenshots/monitors.png" width="260"> | <img src="assets/screenshots/map.png" width="260"> |

---

*Let's build the ultimate open-source tool for tracking the air we breathe!* 💨

# SSLG Voting System - Expo Go Mobile App

This is the official mobile application for the **Supreme Student Learners Government (SSLG) Voting System**, built with React Native and fully compatible with **Expo Go** on iOS and Android.

---

## 📱 Features

- **Expo Go Native Compatibility**: 100% JavaScript/TypeScript managed app. Uses zero native C++/Swift/Java code, requiring no custom native builds or `expo prebuild`.
- **Student & Faculty Authentication**: Supports LRN-based student login and admin credential validation against Supabase.
- **Official Mobile Ballot**: Clean, position-by-position voting interface with single candidate selection and vote confirmation modal.
- **Real-Time Election Tabulation**: Live voter turnout percentage, unique ballots cast, candidate progress bars, and leading indicators.
- **Admin Voters Registry**: Real-time voter search by LRN, name, or grade section with live voting status badges (`VOTED` vs `PENDING`).

---

## 🚀 Setup & Run Instructions

### 1. Prerequisite
Ensure you have Node.js (v18+) and npm installed on your computer, as well as the **Expo Go** app on your iOS or Android device.

### 2. Navigate to Mobile Directory
```bash
cd mobile
```

### 3. Install Dependencies
Install all Expo Go-compatible modules:
```bash
npx expo install
```

*Note: All dependencies use standard Expo-managed packages:*
- `expo`
- `react-native`
- `@supabase/supabase-js`
- `@react-native-async-storage/async-storage`
- `react-native-url-polyfill`
- `expo-status-bar`

### 4. Start the Expo Development Server
Start the development server:
```bash
npx expo start
```

*If you experience any caching issues, clear the cache with:*
```bash
npx expo start --clear
```

---

## 📲 Testing on Device with Expo Go

1. **Download Expo Go**:
   - iOS: [App Store - Expo Go](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play - Expo Go](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Connect to Same Network**: Ensure your mobile device and laptop/desktop are connected to the same Wi-Fi network.

3. **Scan QR Code**:
   - **Android**: Open the Expo Go app and scan the QR code displayed in your terminal window.
   - **iOS**: Open the native Camera app, scan the QR code, and tap the notification banner to launch Expo Go.

---

## 🌐 Supabase Database Integration

The mobile app connects to the same Supabase database (`https://kltpvuabtekkcopnfiei.supabase.co`) as the Web application:
- Storage Persistence: Managed via `@react-native-async-storage/async-storage`
- Fetch Timeout: Configured with 15-second `AbortController` signal timeout to ensure smooth mobile connection resilience on 3G/4G networks.

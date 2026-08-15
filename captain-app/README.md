# ScanMenu Captain & Floor Service Mobile App

Dedicated mobile application built in Flutter for restaurant captains and floor staff.

---

## 🎯 Scoped Features

- 🔐 **Staff Authentication**: Secure JWT login with auto-refresh and active restaurant outlet context.
- 🪑 **Floor Map & Tables**: Live visual table occupancy (`Available`, `Occupied`, `Bill Requested`, `Reserved`), zone filtering, and table-wise order breakdown.
- 📝 **Fast Order Taking**: Dynamic category chips, fuzzy item search, add-ons customization sheet, kitchen notes, and table order dispatch.
- ⚡ **Live Orders Board**: Real-time status progression (`PENDING` → `ACCEPTED` → `PREPARING` → `READY` → `SERVED`), order search, and 1-tap status advancement.
- 🔔 **Waiter Call Alerts**: Live customer assistance queue (`Call Waiter`, `Bill Request`, `Water`, `Tissues`) with audio chimes and haptic vibrations.
- 👤 **Shift Profile**: Staff info, sound/vibration toggles, and shift logout.

---

## 🏗 Architecture & Tech Stack

- **Framework**: Flutter (Dart 3)
- **State Management**: `flutter_riverpod` (v2.5+)
- **Networking**: `Dio` with custom JWT Interceptor and token rotation queue
- **Real-Time WebSockets**: `socket_io_client` connected to backend `SocketService` (`restaurant:<restaurantId>` room)
- **Secure Persistence**: `flutter_secure_storage` for credentials and JWTs
- **Alerts & Feedback**: `audioplayers` and `HapticFeedback`
- **Typography & Theme**: `GoogleFonts.inter` & `GoogleFonts.outfit`

---

## 📂 Project Structure

```
captain-app/
├── lib/
│   ├── core/
│   │   ├── constants/ (api_constants.dart, app_colors.dart, app_theme.dart)
│   │   ├── network/ (api_client.dart, api_exceptions.dart)
│   │   ├── sockets/ (socket_service.dart)
│   │   ├── storage/ (secure_storage_service.dart)
│   │   ├── audio/ (alert_service.dart)
│   │   └── utils/ (formatters.dart)
│   ├── features/
│   │   ├── auth/ (models, providers, login_screen, splash_screen)
│   │   ├── tables/ (models, providers, tables_screen, table_card, table_orders_bottom_sheet)
│   │   ├── order_creation/ (models, providers, take_order_screen, cart_review_screen, addon_selection_sheet)
│   │   ├── active_orders/ (models, providers, active_orders_screen, order_detail_screen, order_card)
│   │   ├── waiter_calls/ (models, providers, waiter_calls_screen, waiter_call_card)
│   │   ├── profile/ (profile_screen)
│   │   └── screens/ (main_shell_screen.dart)
│   ├── app.dart
│   └── main.dart
└── pubspec.yaml
```

---

## 🚀 Running the App

### 1. Configure Backend API URL
On the login screen, tap the ⚙️ icon in the top right to configure your backend URL:
- **Android Emulator**: `http://10.0.2.2:5000`
- **iOS Simulator / Desktop**: `http://localhost:5000`
- **Physical Device**: `http://<YOUR_LOCAL_IP>:5000`

### 2. Install Dependencies & Run
```bash
cd captain-app
flutter pub get
flutter run
```

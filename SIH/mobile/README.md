# NER-SANCHAAR Field Reporter Mobile App

## Overview
Flutter mobile application for field reporting of terrain hazards on NH-313 Dibang Valley corridor. This is the citizen/field interface complementing the React dashboard operations center.

## Features

### ✅ Field Reporting
- Simple hazard type selection (Landslide, Rockfall, Flash Flood, Road Damage, Bridge Damage, Debris Obstruction)
- Severity levels (Severe, Moderate, Minor) with descriptions
- GPS location capture with proper permissions
- Camera integration for hazard photos
- Field notes with validation

### ✅ Offline-First Operation
- Reports saved locally when offline
- Automatic synchronization when connectivity returns
- Persistent local storage using SQLite
- No data loss during network outages

### ✅ Real-time Synchronization
- Automatic background sync every 30 seconds
- Manual sync retry for failed reports
- Connection status indication
- Sync status tracking (Pending, Synced, Failed)

### ✅ Report Management
- Complete report history with filtering
- Status-based tabs (All, Pending, Synced, Failed)
- Photo preview in history
- Detailed report information

### ✅ Configuration
- Configurable backend API URL
- Network simulation for testing offline behavior
- Reporter ID customization
- Connection testing

## Configuration

### Backend URL Setup

#### Android Emulator
Default URL: `http://10.0.2.2:8000`
- Use `10.0.2.2` to access host machine from emulator
- Port 8000 matches the FastAPI backend

#### Physical Android Device
Change URL to your computer's IP address: `http://192.168.1.xxx:8000`
1. Find your computer's IP: `ipconfig` (Windows) or `ifconfig` (Linux/Mac)
2. Go to Settings → API Configuration
3. Update Base URL to `http://YOUR_IP:8000`
4. Tap "Test Connection" to verify

#### Backend Setup Required
Ensure the FastAPI backend is running:
```bash
cd SIH/backend
python main.py
```

## Permissions

The app requests these Android permissions:
- **INTERNET**: API communication
- **ACCESS_NETWORK_STATE**: Network connectivity detection
- **ACCESS_FINE_LOCATION**: GPS coordinates for reports
- **ACCESS_COARSE_LOCATION**: Fallback location
- **CAMERA**: Taking hazard photos
- **READ_EXTERNAL_STORAGE**: Selecting photos from gallery
- **WRITE_EXTERNAL_STORAGE**: Saving photos locally

## Architecture

### Offline-First Design
```
User Creates Report
       ↓
Save to Local SQLite
       ↓
Check Network Connectivity
       ↓
[Online] → Submit to API → Mark as Synced
       ↓
[Offline] → Keep as Pending → Retry Later
```

### Data Flow
1. **Field Report Creation**: User fills form with hazard details
2. **GPS Location**: Optional GPS coordinates with accuracy validation
3. **Photo Capture**: Camera or gallery selection with local storage
4. **Local Persistence**: Immediate save to SQLite database
5. **Background Sync**: Automatic retry with exponential backoff
6. **Status Updates**: Real-time sync status in UI

### Synchronization Strategy
- **Immediate Attempt**: Try sync on report creation if online
- **Background Timer**: Auto-sync every 30 seconds
- **Manual Retry**: User-initiated sync for failed reports
- **Connection Detection**: Real connectivity validation (not just network state)
- **Failure Handling**: Graceful error messages and retry logic

## API Integration

### Endpoints Used
- `POST /api/reports` - Submit field reports
- `GET /api/corridor` - Connection testing

### Request Format
```json
{
  "segment_id": "SEG-MOBILE",
  "hazard_type": "Landslide",
  "severity": "Severe", 
  "reporter_id": "FIELD-MOBILE-001",
  "notes": "Field observation details",
  "latitude": 28.1234567,
  "longitude": 95.1234567,
  "photo_path": "/local/path/to/photo.jpg",
  "timestamp": "2026-09-07T22:45:00.000Z"
}
```

## Testing Offline Behavior

### Network Simulation
1. Go to Settings → Demo & Testing
2. Enable "Simulate Offline Mode"
3. Create reports - they will be saved as "Pending"
4. Disable simulation - reports will auto-sync

### Real Network Testing
1. Turn off Wi-Fi and mobile data
2. Create field reports
3. Verify reports show "Pending Sync"
4. Turn network back on
5. Verify automatic synchronization occurs

## Development

### Build Commands
```bash
# Get dependencies
flutter pub get

# Generate JSON serialization
flutter packages pub run build_runner build

# Run in debug mode
flutter run

# Build APK
flutter build apk
```

### Project Structure
```
lib/
├── main.dart                 # App entry point
├── config/
│   └── app_config.dart      # Configuration constants
├── models/
│   ├── field_report.dart    # Data model
│   └── field_report.g.dart  # Generated JSON serialization
├── services/
│   ├── database_service.dart # SQLite persistence
│   ├── location_service.dart # GPS functionality
│   ├── camera_service.dart   # Photo capture
│   └── sync_service.dart     # API communication
└── screens/
    ├── home_screen.dart      # Dashboard and navigation
    ├── new_report_screen.dart # Field report form
    ├── report_history_screen.dart # Report management
    └── settings_screen.dart   # Configuration
```

## Verification Checklist

### ✅ Online Operation
- [x] Create report → backend receives → appears on React dashboard
- [x] GPS coordinates captured accurately
- [x] Photos stored and uploaded correctly
- [x] All hazard types and severities work
- [x] Field notes validation
- [x] Real-time sync status updates

### ✅ Offline Operation
- [x] Network disabled → create report → remains pending
- [x] App closed/reopened → report still pending
- [x] Network restored → automatic sync occurs
- [x] Exactly one report received by backend (no duplicates)
- [x] Local status updated to "Synced"

### ✅ Error Handling
- [x] GPS timeout/unavailable → clear error message
- [x] Camera permission denied → graceful fallback
- [x] Network errors → appropriate retry logic
- [x] Backend unavailable → reports queued for later
- [x] Invalid API responses → error logging

### ✅ UI/UX
- [x] Simple, fast field reporting workflow
- [x] Clear status indicators for sync state
- [x] Photo preview and management
- [x] Report history with filtering
- [x] Configuration options accessible

The mobile app is now complete and ready for field use, providing reliable offline-first hazard reporting with seamless backend integration.
# Mobile Documentation

## Overview
Mobile application implementation details for the Real Estate Management System.

## Technology Stack
- Framework: Flutter SDK ^3.8.1
- Language: Dart
- Platform: Cross-platform (iOS, Android, Windows, macOS, Linux, Web)
- State Management: GetX (Get) for state management, navigation, and dependency injection
- Navigation: GetX routing system
- UI Components: Material Design and Cupertino components
- Storage: flutter_secure_storage for secure token storage, shared_preferences for simple data
- HTTP Client: http package for API calls
- Network: connectivity_plus for network status monitoring
- File Handling: image_picker, file_picker, path_provider
- PDF Viewing: flutter_pdfview for PDF documents
- Image Viewing: photo_view for enhanced image viewing
- Permissions: permission_handler for device permissions
- URL Handling: url_launcher for opening external links
- Country Selection: country_picker for location-based features

## Project Structure
```
mobile/                       # Flutter app root directory
├── lib/                      # Main Dart source code
│   ├── main.dart            # App entry point
│   ├── core/                # Core application layer
│   │   ├── bindings/        # Dependency injection bindings
│   │   ├── config/          # App configuration
│   │   ├── constants/       # App constants
│   │   ├── controllers/     # GetX controllers
│   │   ├── models/          # Data models
│   │   ├── routes/          # App routing configuration
│   │   ├── services/        # Core services
│   │   ├── theme/           # App theming
│   │   ├── utils/           # Utility functions
│   │   └── widgets/         # Shared widgets
│   └── features/            # Feature-based modules
│       ├── auth/            # Authentication features
│       ├── owner/           # Owner dashboard features
│       ├── profile/         # User profile features
│       └── tenant/          # Tenant management features
├── assets/                   # Static assets
│   └── icons/               # App icons and images
├── android/                  # Android-specific configuration
├── ios/                      # iOS-specific configuration
├── web/                      # Web platform configuration
├── windows/                  # Windows platform configuration
├── macos/                    # macOS platform configuration
├── linux/                    # Linux platform configuration
├── test/                     # Test files
├── pubspec.yaml              # Flutter dependencies and configuration
├── pubspec.lock              # Dependency lock file
├── analysis_options.yaml     # Dart analysis configuration
└── .metadata                 # Flutter project metadata
```

## Key Features
- **Cross-Platform Support**: iOS, Android, Windows, macOS, Linux, and Web platforms
- **Authentication System**: JWT token-based authentication with automatic refresh
- **Role-Based Dashboards**: Owner, tenant, and profile-specific dashboards
- **Secure Storage**: flutter_secure_storage for sensitive data like tokens
- **Network Monitoring**: Real-time network connectivity status
- **File Management**: Image picking, file selection, and document handling
- **PDF Viewing**: Built-in PDF document viewer
- **Image Viewing**: Enhanced image viewing with zoom and pan
- **Permission Handling**: Comprehensive device permission management
- **URL Handling**: External link opening capabilities
- **Country Selection**: Location-based country picker with flags
- **State Management**: GetX for efficient state management and navigation
- **Dependency Injection**: GetX dependency injection system
- **Responsive Design**: Adaptive layouts for different screen sizes

## Platform-Specific Code
- **iOS Configuration**: iOS-specific settings in `ios/` directory
- **Android Configuration**: Android-specific settings in `android/` directory
- **Web Configuration**: Web platform settings in `web/` directory
- **Windows Configuration**: Windows platform settings in `windows/` directory
- **macOS Configuration**: macOS platform settings in `macos/` directory
- **Linux Configuration**: Linux platform settings in `linux/` directory
- **Platform Detection**: Automatic platform detection for conditional rendering
- **Native Integration**: Platform-specific native code integration
- **Responsive Design**: Platform-appropriate UI adaptations
- **Performance Optimization**: Platform-specific performance tuning

## Setup Instructions
1. **Prerequisites**
   ```bash
   # Install Flutter SDK (^3.8.1)
   # Install Dart SDK
   # Install Android Studio / Xcode for mobile development
   # Install VS Code with Flutter extension (recommended)
   ```

2. **Install Dependencies**
   ```bash
   cd mobile
   flutter pub get
   ```

3. **Environment Setup**
   Create environment configuration files as needed:
   - API endpoints
   - Authentication keys
   - Other configuration values

4. **Development Server**
   ```bash
   flutter run
   # or for specific platform
   flutter run -d chrome    # Web
   flutter run -d windows   # Windows
   flutter run -d macos     # macOS
   flutter run -d linux     # Linux
   ```

5. **Platform-Specific Development**
   ```bash
   # iOS Simulator
   flutter run -d ios
   
   # Android Emulator
   flutter run -d android
   
   # Web Browser
   flutter run -d chrome
   ```

6. **Build for Production**
   ```bash
   # iOS
   flutter build ios
   
   # Android
   flutter build apk
   flutter build appbundle
   
   # Web
   flutter build web
   
   # Windows
   flutter build windows
   
   # macOS
   flutter build macos
   
   # Linux
   flutter build linux
   ```

## Development Guidelines
1. **Code Organization**
   - Use feature-based architecture in `lib/features/`
   - Organize core functionality in `lib/core/`
   - Keep shared widgets in `lib/core/widgets/`
   - Use proper Dart naming conventions

2. **State Management**
   - Use GetX controllers for state management
   - Implement proper dependency injection with GetX bindings
   - Use reactive programming patterns
   - Implement proper error handling

3. **Component Patterns**
   - Create reusable, themed widgets
   - Implement proper Dart classes and interfaces
   - Follow Flutter best practices
   - Use Material Design and Cupertino components

4. **Navigation**
   - Use GetX routing system
   - Implement proper route protection
   - Handle deep linking appropriately
   - Maintain navigation state

5. **Performance**
   - Use const constructors where possible
   - Implement proper list virtualization with ListView.builder
   - Use Flutter's built-in animations
   - Optimize image loading and caching

6. **Platform Compatibility**
   - Test on all target platforms
   - Use platform-specific code when necessary
   - Implement responsive design patterns
   - Handle platform differences gracefully

7. **JWT Token Management**
   - Use the built-in JWT token validation system
   - Implement proper token refresh logic
   - Handle token expiration gracefully
   - Use secure storage for sensitive data

## Additional Resources
- **JWT Token System**: See `JWT_TOKEN_SYSTEM.md` for detailed JWT implementation
- **Flutter Documentation**: [flutter.dev](https://flutter.dev)
- **GetX Documentation**: [pub.dev/packages/get](https://pub.dev/packages/get)
- **Dart Documentation**: [dart.dev](https://dart.dev)

---
*Mobile documentation completed - Flutter project*

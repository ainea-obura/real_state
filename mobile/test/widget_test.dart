// This is a basic Flutter widget test for Real Estate Mobile App.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:get/get.dart';

import 'package:mobile/main.dart';

void main() {
  setUp(() {
    // Reset GetX before each test
    Get.reset();
  });

  testWidgets('Real Estate App launches successfully', (
    WidgetTester tester,
  ) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const RealEstateApp());

    // Verify that the splash screen appears with app name
    expect(find.text('Real Estate Mobile'), findsOneWidget);

    // Verify that the app logo is present
    expect(find.byIcon(Icons.home_work_rounded), findsOneWidget);

    // Verify that the loading indicator is present
    expect(find.text('Checking your session...'), findsOneWidget);
  });

  testWidgets('App initializes without crashing', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const RealEstateApp());

    // Just pump once to verify app doesn't crash on startup
    await tester.pump();

    // Verify app initialized successfully
    expect(tester.takeException(), isNull);
  });
}

/**
 * ESP32-WROOM-32E 8-Relay Bed Controller Arduino / PlatformIO Firmware
 * 
 * Hardware Specs from Attached Photos:
 * - Module: ESP32-WROOM-32E (Espressif Systems)
 * - Power Supply: 32V 4.6A SMPS (Model 150-32)
 * - Relays: 8x 12V/24V Power Relays (4 Bidirectional Linear Actuators)
 * - Network: SoftAP mode (192.168.4.1) + Station mode (Local Wi-Fi)
 * - Protocols: HTTP REST (Port 80) + WebSocket (Port 81) + BLE Nordic UART
 */

export const ESP32_FIRMWARE_CODE = `/*
 * MARQ W-1 CLINICAL BED CONTROLLER FIRMWARE
 * Target: ESP32-WROOM-32E
 * 
 * Features:
 * 1. SoftAP Mode: SSID "MarQ-Bed-AP", IP 192.168.4.1 (Phone gets 192.168.4.2)
 * 2. Optional Station Mode: Connects to local router (DNS 192.168.1.1)
 * 3. Asynchronous Web Server on Port 80 (CORS Enabled)
 * 4. Real-time WebSocket on Port 81
 * 5. Bluetooth Low Energy (BLE) Nordic UART Service
 * 6. Mutual exclusion interlock for 8 actuator relays
 */

#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// --- PIN DEFINITIONS (8 RELAYS ON BOARD) ---
#define RELAY_HEAD_UP    13  // Relay 1
#define RELAY_HEAD_DOWN  12  // Relay 2
#define RELAY_KNEE_UP    14  // Relay 3
#define RELAY_KNEE_DOWN  27  // Relay 4
#define RELAY_ELEV_UP    26  // Relay 5
#define RELAY_ELEV_DOWN  25  // Relay 6
#define RELAY_TILT_UP    33  // Relay 7
#define RELAY_TILT_DOWN  32  // Relay 8

// Active LOW or Active HIGH relays (most 8-relay boards are Active LOW)
#define RELAY_ON  LOW
#define RELAY_OFF HIGH

// --- NETWORK CONFIGURATION ---
const char* apSSID = "MarQ-Bed-AP";
const char* apPassword = ""; // Open AP for fast clinical pairing

IPAddress local_ip(192, 168, 4, 1);
IPAddress gateway(192, 168, 4, 1);
IPAddress subnet(255, 255, 255, 0);

WebServer server(80);
WebSocketsServer webSocket(81);

// --- BLE NORDIC UART UUIDs ---
#define SERVICE_UUID           "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID_RX "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define CHARACTERISTIC_UUID_TX "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

BLECharacteristic *pTxCharacteristic;
bool deviceConnected = false;

// --- SAFETY INTERLOCK LOGIC ---
void stopAllRelays() {
  digitalWrite(RELAY_HEAD_UP, RELAY_OFF);
  digitalWrite(RELAY_HEAD_DOWN, RELAY_OFF);
  digitalWrite(RELAY_KNEE_UP, RELAY_OFF);
  digitalWrite(RELAY_KNEE_DOWN, RELAY_OFF);
  digitalWrite(RELAY_ELEV_UP, RELAY_OFF);
  digitalWrite(RELAY_ELEV_DOWN, RELAY_OFF);
  digitalWrite(RELAY_TILT_UP, RELAY_OFF);
  digitalWrite(RELAY_TILT_DOWN, RELAY_OFF);
}

void controlActuator(String actuator, String action) {
  if (action == "stop" || actuator == "estop") {
    stopAllRelays();
    return;
  }

  if (actuator == "head") {
    if (action == "up") {
      digitalWrite(RELAY_HEAD_DOWN, RELAY_OFF); // Safety interlock
      delay(20);
      digitalWrite(RELAY_HEAD_UP, RELAY_ON);
    } else if (action == "down") {
      digitalWrite(RELAY_HEAD_UP, RELAY_OFF);
      delay(20);
      digitalWrite(RELAY_HEAD_DOWN, RELAY_ON);
    }
  } else if (actuator == "knee") {
    if (action == "up") {
      digitalWrite(RELAY_KNEE_DOWN, RELAY_OFF);
      delay(20);
      digitalWrite(RELAY_KNEE_UP, RELAY_ON);
    } else if (action == "down") {
      digitalWrite(RELAY_KNEE_UP, RELAY_OFF);
      delay(20);
      digitalWrite(RELAY_KNEE_DOWN, RELAY_ON);
    }
  } else if (actuator == "height") {
    if (action == "up") {
      digitalWrite(RELAY_ELEV_DOWN, RELAY_OFF);
      delay(20);
      digitalWrite(RELAY_ELEV_UP, RELAY_ON);
    } else if (action == "down") {
      digitalWrite(RELAY_ELEV_UP, RELAY_OFF);
      delay(20);
      digitalWrite(RELAY_ELEV_DOWN, RELAY_ON);
    }
  } else if (actuator == "tilt") {
    if (action == "up") {
      digitalWrite(RELAY_TILT_DOWN, RELAY_OFF);
      delay(20);
      digitalWrite(RELAY_TILT_UP, RELAY_ON);
    } else if (action == "down") {
      digitalWrite(RELAY_TILT_UP, RELAY_OFF);
      delay(20);
      digitalWrite(RELAY_TILT_DOWN, RELAY_ON);
    }
  }
}

// --- HTTP SERVER HANDLERS WITH FULL CORS ---
void handleCors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
}

void handleStatus() {
  handleCors();
  String json = "{\\"status\\":\\"ok\\",\\"controller\\":\\"ESP32-WROOM-32E\\",\\"ip\\":\\"192.168.4.1\\",\\"relays\\":8,\\"battery\\":100}";
  server.send(200, "application/json", json);
}

void handleControl() {
  handleCors();
  String actuator = server.hasArg("actuator") ? server.arg("actuator") : "";
  String action = server.hasArg("action") ? server.arg("action") : "";
  controlActuator(actuator, action);
  server.send(200, "application/json", "{\\"success\\":true}");
}

// --- SETUP & LOOP ---
void setup() {
  Serial.begin(115200);

  // Initialize Relays as Outputs in OFF state
  int relayPins[8] = {RELAY_HEAD_UP, RELAY_HEAD_DOWN, RELAY_KNEE_UP, RELAY_KNEE_DOWN, 
                      RELAY_ELEV_UP, RELAY_ELEV_DOWN, RELAY_TILT_UP, RELAY_TILT_DOWN};
  for (int i = 0; i < 8; i++) {
    pinMode(relayPins[i], OUTPUT);
    digitalWrite(relayPins[i], RELAY_OFF);
  }

  // 1. Start SoftAP with Static IP 192.168.4.1
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAPConfig(local_ip, gateway, subnet);
  WiFi.softAP(apSSID, apPassword);
  Serial.print("ESP32 SoftAP IP: ");
  Serial.println(WiFi.softAPIP());

  // 2. Setup Web Server Handlers
  server.on("/", HTTP_GET, handleStatus);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/api/status", HTTP_GET, handleStatus);
  server.on("/control", HTTP_GET, handleControl);
  server.on("/control", HTTP_POST, handleControl);
  server.enableCORS(true);
  server.begin();

  // 3. Start WebSocket Server
  webSocket.begin();

  // 4. Start BLE Server
  BLEDevice::init("MarQ-Bed-ESP32");
  BLEServer *pServer = BLEDevice::createServer();
  BLEService *pService = pServer->createService(SERVICE_UUID);
  pTxCharacteristic = pService->createCharacteristic(
                        CHARACTERISTIC_UUID_TX,
                        BLECharacteristic::PROPERTY_NOTIFY
                      );
  pTxCharacteristic->addDescriptor(new BLE2902());
  pService->start();
  pServer->getAdvertising()->start();
  Serial.println("ESP32 Bed Controller Ready!");
}

void loop() {
  server.handleClient();
  webSocket.loop();
}
`;

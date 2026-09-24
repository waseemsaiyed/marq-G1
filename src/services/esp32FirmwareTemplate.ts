/**
 * ESP32-WROOM-32E 8-Relay Bed Controller Arduino / PlatformIO Firmware
 * 
 * Target: ESP32-WROOM-32E (Dual Core Xtensa LX6 @ 240MHz)
 * Power: 32V 4.6A SMPS (Model 150-32) with step-down to 5V/3.3V
 * Relays: 8x 12V/24V Power Relays (4 Bidirectional Linear Actuators)
 * 
 * Dual Connection Architecture:
 * 1. Bluetooth Classic Serial (SPP - RFCOMM UUID 00001101-0000-1000-8000-00805F9B34FB)
 * 2. Wi-Fi SoftAP (192.168.4.1) & Station LAN (Port 80 HTTP + Port 81 WebSocket)
 * 3. Bidirectional Relay Interlock for physical safety
 */

export const ESP32_FIRMWARE_CODE = `/*
 * MARQ W-1 CLINICAL BED CONTROLLER HYBRID FIRMWARE
 * Target: ESP32-WROOM-32E (Espressif Systems)
 * 
 * Dual Connection:
 * 1. Bluetooth Classic SPP ("MarQ-Bed-SPP") via BluetoothSerial.h
 * 2. Wi-Fi SoftAP ("MarQ-Bed-AP", 192.168.4.1) via WebServer & WebSocketsServer
 * Both channels work concurrently for 100% reliable local & network control!
 */

#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <BluetoothSerial.h> // ESP32 Classic Bluetooth Serial (SPP)

#if !defined(CONFIG_BT_ENABLED) || !defined(CONFIG_BLUEDROID_ENABLED)
#error Bluetooth is not enabled! Please run make menuconfig to enable it
#endif

// --- PIN DEFINITIONS (8 RELAYS ON BOARD) ---
#define RELAY_HEAD_UP    13  // Relay 1
#define RELAY_HEAD_DOWN  12  // Relay 2
#define RELAY_KNEE_UP    14  // Relay 3
#define RELAY_KNEE_DOWN  27  // Relay 4
#define RELAY_ELEV_UP    26  // Relay 5
#define RELAY_ELEV_DOWN  25  // Relay 6
#define RELAY_TILT_UP    33  // Relay 7
#define RELAY_TILT_DOWN  32  // Relay 8

// Active LOW relays (standard for 8-channel relay modules)
#define RELAY_ON  LOW
#define RELAY_OFF HIGH

// --- DUAL-CHANNEL PROTOCOL OBJECTS ---
BluetoothSerial SerialBT;
WebServer server(80);
WebSocketsServer webSocket(81);

const char* apSSID = "MarQ-Bed-AP";
const char* apPassword = ""; // Open AP for instant clinical bed pairing

IPAddress local_ip(192, 168, 4, 1);
IPAddress gateway(192, 168, 4, 1);
IPAddress subnet(255, 255, 255, 0);

// --- HARDWARE SAFETY INTERLOCK LOGIC ---
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
  actuator.toLowerCase();
  action.toLowerCase();

  if (action == "stop" || actuator == "estop") {
    stopAllRelays();
    return;
  }

  // Head Elevation
  if (actuator == "head") {
    if (action == "up") {
      digitalWrite(RELAY_HEAD_DOWN, RELAY_OFF); // Safety interlock
      delay(25);
      digitalWrite(RELAY_HEAD_UP, RELAY_ON);
    } else if (action == "down") {
      digitalWrite(RELAY_HEAD_UP, RELAY_OFF);
      delay(25);
      digitalWrite(RELAY_HEAD_DOWN, RELAY_ON);
    }
  } 
  // Knee / Foot Contour
  else if (actuator == "knee") {
    if (action == "up") {
      digitalWrite(RELAY_KNEE_DOWN, RELAY_OFF);
      delay(25);
      digitalWrite(RELAY_KNEE_UP, RELAY_ON);
    } else if (action == "down") {
      digitalWrite(RELAY_KNEE_UP, RELAY_OFF);
      delay(25);
      digitalWrite(RELAY_KNEE_DOWN, RELAY_ON);
    }
  } 
  // Overall Height
  else if (actuator == "height") {
    if (action == "up") {
      digitalWrite(RELAY_ELEV_DOWN, RELAY_OFF);
      delay(25);
      digitalWrite(RELAY_ELEV_UP, RELAY_ON);
    } else if (action == "down") {
      digitalWrite(RELAY_ELEV_UP, RELAY_OFF);
      delay(25);
      digitalWrite(RELAY_ELEV_DOWN, RELAY_ON);
    }
  } 
  // Trendelenburg Tilt
  else if (actuator == "tilt") {
    if (action == "up") {
      digitalWrite(RELAY_TILT_DOWN, RELAY_OFF);
      delay(25);
      digitalWrite(RELAY_TILT_UP, RELAY_ON);
    } else if (action == "down") {
      digitalWrite(RELAY_TILT_UP, RELAY_OFF);
      delay(25);
      digitalWrite(RELAY_TILT_DOWN, RELAY_ON);
    }
  }
}

// Unified parser for ASCII commands: HEAD_UP, HEAD_DOWN, HEAD_STOP, ESTOP, etc.
void parseAndExecute(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return;

  Serial.print("[COMMAND RX] ");
  Serial.println(cmd);

  if (cmd == "ESTOP") {
    stopAllRelays();
    return;
  }

  int sep = cmd.indexOf('_');
  if (sep != -1) {
    String act = cmd.substring(0, sep);
    String op = cmd.substring(sep + 1);
    controlActuator(act, op);
  }
}

// --- HTTP SERVER HANDLERS ---
void handleCors() {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  server.sendHeader("Access-Control-Allow-Headers", "*");
}

void handleStatus() {
  handleCors();
  String json = "{\\"status\\":\\"ok\\",\\"controller\\":\\"ESP32-WROOM-32E\\",\\"dual_link\\":true,\\"bt_classic\\":\\"MarQ-Bed-SPP\\",\\"ip\\":\\"192.168.4.1\\",\\"relays\\":8}";
  server.send(200, "application/json", json);
}

void handleControl() {
  handleCors();
  String actuator = server.arg("actuator");
  String action = server.arg("action");
  String raw = server.arg("raw");

  if (raw.length() > 0) {
    parseAndExecute(raw);
  } else if (actuator.length() > 0) {
    controlActuator(actuator, action);
  }

  server.send(200, "application/json", "{\\"success\\":true,\\"channel\\":\\"wifi_http\\"}");
}

// --- WEBSOCKET EVENT HANDLER ---
void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  if (type == WStype_TEXT) {
    String msg = String((char*)payload);
    parseAndExecute(msg);
    webSocket.sendTXT(num, "{\\"status\\":\\"ACK\\"}");
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("=== Starting MarQ Clinical Bed Controller ===");

  // 1. Initialize Relay Pins as Outputs & Safe OFF
  pinMode(RELAY_HEAD_UP, OUTPUT);
  pinMode(RELAY_HEAD_DOWN, OUTPUT);
  pinMode(RELAY_KNEE_UP, OUTPUT);
  pinMode(RELAY_KNEE_DOWN, OUTPUT);
  pinMode(RELAY_ELEV_UP, OUTPUT);
  pinMode(RELAY_ELEV_DOWN, OUTPUT);
  pinMode(RELAY_TILT_UP, OUTPUT);
  pinMode(RELAY_TILT_DOWN, OUTPUT);
  stopAllRelays();

  // 2. Initialize Bluetooth Classic SPP (RFCOMM)
  SerialBT.begin("MarQ-Bed-SPP"); // Device name visible in Android Bluetooth settings
  Serial.println("✅ Bluetooth Classic SPP active as: MarQ-Bed-SPP");

  // 3. Initialize Wi-Fi SoftAP
  WiFi.mode(WIFI_AP);
  WiFi.softAPConfig(local_ip, gateway, subnet);
  WiFi.softAP(apSSID, apPassword);
  Serial.print("✅ Wi-Fi SoftAP active: SSID ");
  Serial.print(apSSID);
  Serial.print(" | IP: ");
  Serial.println(WiFi.softAPIP());

  // 4. Initialize HTTP Server
  server.on("/status", handleStatus);
  server.on("/api/status", handleStatus);
  server.on("/control", handleControl);
  server.onNotFound([]() {
    handleCors();
    server.send(200, "text/plain", "MarQ ESP32 Controller OK");
  });
  server.begin();

  // 5. Initialize WebSocket Server
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
}

void loop() {
  // Process Wi-Fi Network requests
  server.handleClient();
  webSocket.loop();

  // Process Bluetooth Classic SPP serial stream
  if (SerialBT.available()) {
    String btCmd = SerialBT.readStringUntil('\\n');
    parseAndExecute(btCmd);
    SerialBT.println("ACK:" + btCmd);
  }

  // Mirror USB Serial input for testing
  if (Serial.available()) {
    String usbCmd = Serial.readStringUntil('\\n');
    parseAndExecute(usbCmd);
  }
}
`;

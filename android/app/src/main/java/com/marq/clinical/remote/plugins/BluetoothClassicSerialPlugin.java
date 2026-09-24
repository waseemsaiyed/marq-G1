package com.marq.clinical.remote.plugins;

import android.Manifest;
import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.util.Log;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;

import org.json.JSONObject;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

/**
 * Capacitor Plugin for Bluetooth Classic Serial Port Profile (SPP / RFCOMM)
 * Supports standard SPP UUID: 00001101-0000-1000-8000-00805F9B34FB
 * Compatible with ESP32 BluetoothSerial.h, HC-05, HC-06, and medical telemetry serial bridges.
 */
@CapacitorPlugin(
    name = "BluetoothClassicSerial",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = {
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN
            }
        ),
        @Permission(
            alias = "bluetoothConnect",
            strings = {
                "android.permission.BLUETOOTH_CONNECT",
                "android.permission.BLUETOOTH_SCAN"
            }
        ),
        @Permission(
            alias = "location",
            strings = {
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            }
        )
    }
)
public class BluetoothClassicSerialPlugin extends Plugin {

    private static final String TAG = "BluetoothClassicSerial";
    private static final UUID DEFAULT_SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private BluetoothAdapter bluetoothAdapter;
    private BluetoothSocket socket;
    private InputStream inputStream;
    private OutputStream outputStream;
    private ConnectedThread connectedThread;

    private String connectedAddress = null;
    private String connectedName = null;
    private final StringBuilder incomingBuffer = new StringBuilder();

    private final BroadcastReceiver discoveryReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (BluetoothDevice.ACTION_FOUND.equals(action)) {
                BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                if (device != null) {
                    JSObject devObj = new JSObject();
                    try {
                        devObj.put("name", device.getName() != null ? device.getName() : "Unknown Device");
                        devObj.put("address", device.getAddress());
                        devObj.put("bonded", device.getBondState() == BluetoothDevice.BOND_BONDED);
                    } catch (Exception ignored) {}
                    notifyListeners("deviceDiscovered", devObj);
                }
            }
        }
    };

    @Override
    public void load() {
        super.load();
        bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
    }

    @PluginMethod
    public void isEnabled(PluginCall call) {
        boolean enabled = bluetoothAdapter != null && bluetoothAdapter.isEnabled();
        JSObject ret = new JSObject();
        ret.put("enabled", enabled);
        call.resolve(ret);
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void enable(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth adapter not available on this device");
            return;
        }
        if (!bluetoothAdapter.isEnabled()) {
            Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
            enableBtIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(enableBtIntent);
        }
        JSObject ret = new JSObject();
        ret.put("enabled", true);
        call.resolve(ret);
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void getPairedDevices(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth adapter unavailable");
            return;
        }

        JSArray devicesArray = new JSArray();
        try {
            Set<BluetoothDevice> pairedDevices = bluetoothAdapter.getBondedDevices();
            if (pairedDevices != null) {
                for (BluetoothDevice device : pairedDevices) {
                    JSObject dev = new JSObject();
                    dev.put("name", device.getName() != null ? device.getName() : "Unnamed Device");
                    dev.put("address", device.getAddress());
                    dev.put("id", device.getAddress());
                    dev.put("class", device.getBluetoothClass() != null ? device.getBluetoothClass().getDeviceClass() : 0);
                    dev.put("bonded", true);
                    devicesArray.put(dev);
                }
            }
        } catch (SecurityException se) {
            Log.e(TAG, "Bluetooth permission missing", se);
        }

        JSObject ret = new JSObject();
        ret.put("devices", devicesArray);
        call.resolve(ret);
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void discoverDevices(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth adapter unavailable");
            return;
        }

        try {
            if (bluetoothAdapter.isDiscovering()) {
                bluetoothAdapter.cancelDiscovery();
            }
            IntentFilter filter = new IntentFilter(BluetoothDevice.ACTION_FOUND);
            getContext().registerReceiver(discoveryReceiver, filter);
            bluetoothAdapter.startDiscovery();
            JSObject ret = new JSObject();
            ret.put("discovering", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Discovery failed: " + e.getMessage());
        }
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void cancelDiscovery(PluginCall call) {
        try {
            if (bluetoothAdapter != null && bluetoothAdapter.isDiscovering()) {
                bluetoothAdapter.cancelDiscovery();
            }
            try {
                getContext().unregisterReceiver(discoveryReceiver);
            } catch (Exception ignored) {}
            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error canceling discovery", e);
        }
    }

    @SuppressLint("MissingPermission")
    @PluginMethod
    public void connect(PluginCall call) {
        String address = call.getString("address");
        if (address == null || address.isEmpty()) {
            call.reject("Must provide device MAC address");
            return;
        }

        String uuidStr = call.getString("uuid");
        UUID targetUuid = uuidStr != null ? UUID.fromString(uuidStr) : DEFAULT_SPP_UUID;
        boolean secure = call.getBoolean("secure", true);

        disconnectInternal();

        new Thread(() -> {
            try {
                BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address);
                if (bluetoothAdapter.isDiscovering()) {
                    bluetoothAdapter.cancelDiscovery();
                }

                BluetoothSocket tmpSocket;
                if (secure) {
                    tmpSocket = device.createRfcommSocketToServiceRecord(targetUuid);
                } else {
                    tmpSocket = device.createInsecureRfcommSocketToServiceRecord(targetUuid);
                }

                tmpSocket.connect();
                socket = tmpSocket;
                inputStream = socket.getInputStream();
                outputStream = socket.getOutputStream();

                connectedAddress = address;
                connectedName = device.getName();

                connectedThread = new ConnectedThread(inputStream);
                connectedThread.start();

                JSObject state = new JSObject();
                state.put("connected", true);
                state.put("address", connectedAddress);
                state.put("name", connectedName);
                notifyListeners("connectionStateChange", state);

                JSObject ret = new JSObject();
                ret.put("connected", true);
                ret.put("address", connectedAddress);
                ret.put("name", connectedName);
                call.resolve(ret);

            } catch (Exception e) {
                Log.e(TAG, "Failed to connect to SPP device: " + address, e);
                disconnectInternal();

                JSObject state = new JSObject();
                state.put("connected", false);
                state.put("address", address);
                state.put("error", e.getMessage());
                notifyListeners("connectionStateChange", state);

                call.reject("Could not connect to " + address + ": " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        disconnectInternal();
        JSObject ret = new JSObject();
        ret.put("disconnected", true);
        call.resolve(ret);
    }

    private synchronized void disconnectInternal() {
        if (connectedThread != null) {
            connectedThread.cancel();
            connectedThread = null;
        }
        if (inputStream != null) {
            try { inputStream.close(); } catch (Exception ignored) {}
            inputStream = null;
        }
        if (outputStream != null) {
            try { outputStream.close(); } catch (Exception ignored) {}
            outputStream = null;
        }
        if (socket != null) {
            try { socket.close(); } catch (Exception ignored) {}
            socket = null;
        }

        String wasAddress = connectedAddress;
        connectedAddress = null;
        connectedName = null;

        if (wasAddress != null) {
            JSObject state = new JSObject();
            state.put("connected", false);
            state.put("address", wasAddress);
            notifyListeners("connectionStateChange", state);
        }
    }

    @PluginMethod
    public void isConnected(PluginCall call) {
        boolean isConn = socket != null && socket.isConnected() && connectedAddress != null;
        JSObject ret = new JSObject();
        ret.put("connected", isConn);
        if (isConn) {
            ret.put("address", connectedAddress);
            ret.put("name", connectedName);
        }
        call.resolve(ret);
    }

    @PluginMethod
    public void write(PluginCall call) {
        if (outputStream == null || socket == null || !socket.isConnected()) {
            call.reject("Device is not connected");
            return;
        }

        String data = call.getString("data");
        if (data == null) {
            call.reject("Data string is required");
            return;
        }

        try {
            byte[] bytes = data.getBytes(StandardCharsets.UTF_8);
            outputStream.write(bytes);
            outputStream.flush();

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("bytesWritten", bytes.length);
            call.resolve(ret);
        } catch (IOException e) {
            Log.e(TAG, "Write error", e);
            call.reject("Write failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void read(PluginCall call) {
        synchronized (incomingBuffer) {
            String data = incomingBuffer.toString();
            incomingBuffer.setLength(0);
            JSObject ret = new JSObject();
            ret.put("data", data);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void readUntil(PluginCall call) {
        String delimiter = call.getString("delimiter", "\n");
        synchronized (incomingBuffer) {
            String current = incomingBuffer.toString();
            int index = current.indexOf(delimiter);
            JSObject ret = new JSObject();
            if (index != -1) {
                String result = current.substring(0, index + delimiter.length());
                incomingBuffer.delete(0, index + delimiter.length());
                ret.put("data", result);
            } else {
                ret.put("data", "");
            }
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void clear(PluginCall call) {
        synchronized (incomingBuffer) {
            incomingBuffer.setLength(0);
        }
        call.resolve();
    }

    private class ConnectedThread extends Thread {
        private final InputStream mmInStream;
        private boolean mmRunning = true;

        public ConnectedThread(InputStream inStream) {
            mmInStream = inStream;
        }

        @Override
        public void run() {
            byte[] buffer = new byte[1024];
            int bytes;

            while (mmRunning) {
                try {
                    bytes = mmInStream.read(buffer);
                    if (bytes > 0) {
                        String incoming = new String(buffer, 0, bytes, StandardCharsets.UTF_8);
                        synchronized (incomingBuffer) {
                            incomingBuffer.append(incoming);
                        }

                        JSObject event = new JSObject();
                        event.put("data", incoming);
                        event.put("address", connectedAddress);
                        notifyListeners("dataReceived", event);
                    }
                } catch (IOException e) {
                    if (mmRunning) {
                        Log.w(TAG, "SPP connection lost", e);
                        disconnectInternal();
                    }
                    break;
                }
            }
        }

        public void cancel() {
            mmRunning = false;
        }
    }
}

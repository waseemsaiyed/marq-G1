package com.marq.clinical.remote;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import com.marq.clinical.remote.plugins.BluetoothClassicSerialPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BluetoothClassicSerialPlugin.class);
        super.onCreate(savedInstanceState);
    }
}

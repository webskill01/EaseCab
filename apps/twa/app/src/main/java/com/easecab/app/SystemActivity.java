package com.easecab.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;

/**
 * easecab://sound opens the Ride alerts channel's own screen (sound / importance).
 * easecab://settings from the web app (nativePush.js): opens EaseCab's App info screen,
 * where the driver sets Battery -> Unrestricted or re-allows a permission they blocked.
 * (Not the direct "ignore battery optimisations" dialog: Play only allows that for a
 * few app kinds.)
 */
public class SystemActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Uri data = getIntent().getData();
        if (data != null && "sound".equals(data.getHost()) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            DelegationService.ensureChannel(this); // the screen needs the channel to exist
            startActivity(new Intent(Settings.ACTION_CHANNEL_NOTIFICATION_SETTINGS)
                    .putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName())
                    .putExtra(Settings.EXTRA_CHANNEL_ID, DelegationService.CHANNEL_ID));
        } else {
            startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:" + getPackageName())));
        }
        finish();
    }
}

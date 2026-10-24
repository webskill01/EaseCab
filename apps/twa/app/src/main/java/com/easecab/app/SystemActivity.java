package com.easecab.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;

/**
 * easecab://settings from the web app (nativePush.js): opens EaseCab's App info screen,
 * where the driver sets Battery -> Unrestricted or re-allows a permission they blocked.
 * (Not the direct "ignore battery optimisations" dialog: Play only allows that for a
 * few app kinds.)
 */
public class SystemActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + getPackageName())));
        finish();
    }
}

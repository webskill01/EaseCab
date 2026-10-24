package com.easecab.app;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.Settings;

/**
 * Invisible switch for the floating button, opened from the web settings page via
 * easecab://bubble?on=1|0. Turning it on sends the user to Android's "Display over
 * other apps" screen first when that permission is missing.
 */
public class BubbleToggleActivity extends Activity {
    private boolean askedPermission;
    private boolean returned;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Uri data = getIntent().getData();
        boolean on = data != null && "1".equals(data.getQueryParameter("on"));
        if (!on || BubbleService.canDraw(this)) {
            BubbleService.setOn(this, on);
            finish();
            return;
        }
        askedPermission = true;
        startActivity(new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:" + getPackageName())));
    }

    @Override
    protected void onRestart() {
        super.onRestart();
        returned = askedPermission;
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (!returned) return;
        // Back from the system screen (and in the foreground, so the service may start):
        // turn on only if the user granted it.
        if (BubbleService.canDraw(this)) BubbleService.setOn(this, true);
        finish();
    }
}

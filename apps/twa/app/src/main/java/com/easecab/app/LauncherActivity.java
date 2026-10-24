/*
 * Copyright 2020 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package com.easecab.app;

import android.content.pm.ActivityInfo;
import android.content.pm.PackageManager;
import android.os.Handler;
import android.os.Looper;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import androidx.browser.customtabs.CustomTabsCallback;

import com.google.android.play.core.appupdate.AppUpdateManager;
import com.google.android.play.core.appupdate.AppUpdateManagerFactory;
import com.google.android.play.core.appupdate.AppUpdateOptions;
import com.google.android.play.core.install.model.AppUpdateType;
import com.google.android.play.core.install.model.InstallStatus;
import com.google.android.play.core.install.model.UpdateAvailability;
import com.google.androidbrowserhelper.trusted.QualityEnforcer;
import com.google.androidbrowserhelper.trusted.TwaLauncher;



public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    private static final String KEY_UPDATE_ASKED = "update_asked_at";
    private static final long UPDATE_EVERY_MS = 24 * 60 * 60 * 1000L;
    private static final String CHROME = "com.android.chrome";
    private static final long TOKEN_WAIT_MS = 3000;
    private boolean launched;
    

    

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Setting an orientation crashes the app due to the transparent background on Android 8.0
        // Oreo and below. We only set the orientation on Oreo and above. This only affects the
        // splash screen and Chrome will still respect the orientation.
        // See https://github.com/GoogleChromeLabs/bubblewrap/issues/496 for details.
        if (Build.VERSION.SDK_INT > Build.VERSION_CODES.O) {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT);
        } else {
            setRequestedOrientation(ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);
        }
        BubbleService.appVisible = true;
        BubbleService.startIfAllowed(this);
        if (!shouldLaunchImmediately()) {
            // First open: wait (briefly) for the FCM token so the site can register it now.
            Runnable go = () -> { if (!launched) { launched = true; launchTwa(); } };
            PushService.refreshToken(this, () -> runOnUiThread(go));
            new Handler(Looper.getMainLooper()).postDelayed(go, TOKEN_WAIT_MS);
        } else {
            PushService.refreshToken(this, null); // keep the saved token fresh for next time
        }
        checkForUpdate();
    }

    @Override
    protected boolean shouldLaunchImmediately() {
        return PushService.hasToken(this);
    }

    /**
     * Always open in Chrome when it's there, whatever the default browser. Only Chrome
     * hands notification + location permission requests to the app, so the prompts are
     * EaseCab's own Android ones (Brave shows its own site prompts and alerts "from Brave").
     */
    @Override
    protected TwaLauncher createTwaLauncher() {
        return chromeInstalled() ? new TwaLauncher(this, CHROME) : super.createTwaLauncher();
    }

    private boolean chromeInstalled() {
        try {
            return getPackageManager().getApplicationInfo(CHROME, 0).enabled;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    /**
     * Play in-app update, FLEXIBLE: a Play sheet offers the update (at most once a day),
     * it downloads while the driver keeps working, and installs on the next app open.
     */
    private void checkForUpdate() {
        AppUpdateManager updates = AppUpdateManagerFactory.create(this);
        updates.getAppUpdateInfo().addOnSuccessListener(info -> {
            if (info.installStatus() == InstallStatus.DOWNLOADED) {
                updates.completeUpdate(); // restarts into the new version
                return;
            }
            long last = PushService.prefs(this).getLong(KEY_UPDATE_ASKED, 0);
            if (info.updateAvailability() != UpdateAvailability.UPDATE_AVAILABLE
                    || !info.isUpdateTypeAllowed(AppUpdateType.FLEXIBLE)
                    || System.currentTimeMillis() - last < UPDATE_EVERY_MS) return;
            PushService.prefs(this).edit().putLong(KEY_UPDATE_ASKED, System.currentTimeMillis()).apply();
            try {
                updates.startUpdateFlowForResult(info, this,
                        AppUpdateOptions.newBuilder(AppUpdateType.FLEXIBLE).build(), 0);
            } catch (Exception e) { // activity gone / Play unavailable — try again tomorrow
                android.util.Log.w("EaseCab", "update prompt failed", e);
            }
        });
    }

    @Override
    protected CustomTabsCallback getCustomTabsCallback() {
        // Keep the library's quality checks; also tell the floating button when the
        // EaseCab tab goes to the background (show bubble) or comes back (hide it).
        return new QualityEnforcer() {
            @Override
            public void onNavigationEvent(int navigationEvent, Bundle extras) {
                if (navigationEvent == TAB_SHOWN) BubbleService.onAppVisible(true);
                else if (navigationEvent == TAB_HIDDEN) BubbleService.onAppVisible(false);
            }
        };
    }

    @Override
    protected Uri getLaunchingUrl() {
        // Get the original launch Url.
        Uri uri = super.getLaunchingUrl();
        // Tells the web app this build has the floating button (shows its toggle).
        uri = uri.buildUpon().appendQueryParameter("bubble", "1").build();
        // Native push: permission, battery state, FCM token, contacts made from alerts.
        uri = PushService.launchUri(this, uri);

        

        return uri;
    }
}

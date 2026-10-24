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
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

import androidx.browser.customtabs.CustomTabsCallback;

import com.google.androidbrowserhelper.trusted.QualityEnforcer;



public class LauncherActivity
        extends com.google.androidbrowserhelper.trusted.LauncherActivity {
    

    

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

        

        return uri;
    }
}

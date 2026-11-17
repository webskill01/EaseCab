package com.easecab.app;

import android.content.Context;
import android.content.SharedPreferences;
import android.net.Uri;
import android.util.Log;

import com.android.installreferrer.api.InstallReferrerClient;
import com.android.installreferrer.api.InstallReferrerStateListener;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Referral attribution that doesn't depend on the browser. The invite page
 * (easecab.com/r/<code>) sends Android users to Play with referrer=ref=<code>; Play hands
 * that back here once. We read it on first open and the launcher passes it to the site
 * as ?ref=<code> (apps/web features/referrals/lib/invite.js captureInviteFromUrl).
 * Needed because the invite page stores the code in whatever browser opened it — on a
 * Samsung Internet phone that storage is not the Chrome storage the app runs in.
 */
final class InstallRef {
    private static final String KEY_CHECKED = "install_ref_checked";
    private static final String KEY_REF = "install_ref";
    private static final Pattern REF = Pattern.compile("(?:^|&)ref=([0-9a-fA-F-]{36})(?:&|$)");

    private InstallRef() {}

    static boolean checked(Context c) {
        return PushService.prefs(c).getBoolean(KEY_CHECKED, false);
    }

    /** One-shot Play referrer read (marks checked whatever the outcome); `done` always runs. */
    static void read(Context c, Runnable done) {
        InstallReferrerClient client = InstallReferrerClient.newBuilder(c).build();
        try {
            client.startConnection(new InstallReferrerStateListener() {
                @Override
                public void onInstallReferrerSetupFinished(int code) {
                    String ref = null;
                    if (code == InstallReferrerClient.InstallReferrerResponse.OK) {
                        try {
                            ref = parse(client.getInstallReferrer().getInstallReferrer());
                        } catch (Exception e) {
                            Log.w("EaseCab", "install referrer read failed", e);
                        }
                    }
                    SharedPreferences.Editor e = PushService.prefs(c).edit().putBoolean(KEY_CHECKED, true);
                    if (ref != null) e.putString(KEY_REF, ref);
                    e.apply();
                    client.endConnection();
                    done.run();
                }

                @Override
                public void onInstallReferrerServiceDisconnected() { /* one-shot; nothing to retry */ }
            });
        } catch (Exception e) { // Play Store missing / service error — no attribution, app still opens
            Log.w("EaseCab", "install referrer unavailable", e);
            PushService.prefs(c).edit().putBoolean(KEY_CHECKED, true).apply();
            done.run();
        }
    }

    /** Adds ?ref=<code> once (then forgets it); the site keeps it until the claim settles. */
    static Uri appendOnce(Context c, Uri uri) {
        SharedPreferences p = PushService.prefs(c);
        String ref = p.getString(KEY_REF, null);
        if (ref == null) return uri;
        p.edit().remove(KEY_REF).apply();
        return uri.buildUpon().appendQueryParameter("ref", ref).build();
    }

    static String parse(String raw) {
        if (raw == null) return null;
        Matcher m = REF.matcher(Uri.decode(raw));
        return m.find() ? m.group(1) : null;
    }
}

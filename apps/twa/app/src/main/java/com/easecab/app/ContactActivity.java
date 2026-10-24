package com.easecab.app;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

/**
 * Invisible hop behind a notification's Call / WhatsApp button (Android 12+ forbids
 * opening the dialer from a receiver). Remembers the ride so the web app logs it in
 * the Contacted tab on the next launch (PushService.launchUri → #npc).
 */
public class ContactActivity extends Activity {
    static final String EXTRA_MODE = "mode";
    static final String EXTRA_PHONE = "phone";
    static final String EXTRA_RIDE = "ride";
    static final String EXTRA_NOTIF = "notif";
    static final String MODE_CALL = "call";
    static final String MODE_WHATSAPP = "wa";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Intent in = getIntent();
        String phone = in.getStringExtra(EXTRA_PHONE);
        String ride = in.getStringExtra(EXTRA_RIDE);
        PushService.cancel(this, in.getIntExtra(EXTRA_NOTIF, 0));
        if (ride != null) PushService.addPendingContact(this, ride);
        boolean call = MODE_CALL.equals(in.getStringExtra(EXTRA_MODE));
        Uri target = call ? Uri.parse("tel:" + phone)
                : Uri.parse("https://wa.me/" + phone.replaceAll("[^0-9]", ""));
        try {
            startActivity(new Intent(call ? Intent.ACTION_DIAL : Intent.ACTION_VIEW, target));
        } catch (ActivityNotFoundException e) {
            android.util.Log.w("EaseCab", "no app for contact action", e);
        }
        finish();
    }
}

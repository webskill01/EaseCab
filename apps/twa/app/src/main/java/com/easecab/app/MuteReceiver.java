package com.easecab.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** "Mute 1 hr" notification button: ride alerts are dropped on arrival until it ends. */
public class MuteReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent intent) {
        PushService.muteForAnHour(c);
        PushService.cancel(c, intent.getIntExtra(ContactActivity.EXTRA_NOTIF, 0));
    }
}

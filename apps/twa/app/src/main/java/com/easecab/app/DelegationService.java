package com.easecab.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ContentResolver;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;

/**
 * Chrome hands every web push to this service (notification delegation). We put them all
 * on ONE "Ride alerts" channel that rings with EaseCab's own sound (res/raw/notification.mp3,
 * a copy of apps/web/public/sounds/notification.mp3 — keep the two in sync).
 *
 * Android 8+: the sound belongs to the channel and is frozen once the channel exists on a
 * phone — to ship a NEW sound later, change CHANNEL_NAME/CHANNEL_ID (a new channel), since
 * an app can never re-sound an existing one.
 */
public class DelegationService extends
        com.google.androidbrowserhelper.trusted.DelegationService {
    static final String CHANNEL_NAME = "Ride alerts";
    // Must equal TrustedWebActivityService.channelNameToId(CHANNEL_NAME), so the library
    // reuses this pre-created channel instead of making a default-sound one.
    static final String CHANNEL_ID = "ride_alerts_channel_id";

    @Override
    public void onCreate() {
        super.onCreate();
    }

    @Override
    public boolean onNotifyNotificationWithChannel(String platformTag, int platformId,
            Notification notification, String channelName) {
        Uri sound = Uri.parse(ContentResolver.SCHEME_ANDROID_RESOURCE + "://"
                + getPackageName() + "/" + R.raw.notification);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm.getNotificationChannel(CHANNEL_ID) == null) {
                // HIGH = heads-up banner: a ride lead is time-critical.
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_HIGH);
                channel.setSound(sound, new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build());
                nm.createNotificationChannel(channel);
            }
        } else {
            notification.sound = sound; // Android 7.x: sound lives on the notification
            notification.defaults &= ~Notification.DEFAULT_SOUND;
        }
        return super.onNotifyNotificationWithChannel(platformTag, platformId, notification, CHANNEL_NAME);
    }
}

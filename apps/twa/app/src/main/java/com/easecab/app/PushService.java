package com.easecab.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.service.notification.StatusBarNotification;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Arrays;
import java.util.Map;

/**
 * Native ride alerts (v11). The API sends the same data-only FCM message it sends the
 * website; here the app draws it itself, so it reads "EaseCab" (not "Brave · easecab.com"),
 * arrives with the browser closed, rings on the Ride alerts channel, stacks per pickup
 * city and carries Call / WhatsApp (paid members only — the API adds `phone` just for
 * them) or View ride buttons.
 *
 * The web app learns the token through the launch URL fragment (launchUri) and
 * registers it as platform "android"; the API never needs to know this class exists.
 */
public class PushService extends FirebaseMessagingService {
    static final String PREFS = "push";
    private static final String KEY_TOKEN = "token";
    private static final String KEY_PENDING = "pending_contacts";
    private static final String TYPE_RIDE = "new_ride"; // = PUSH.TYPE (packages/shared)
    private static final int MAX_SHOWN = 40; // under Android's hard 50-per-app cap

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, MODE_PRIVATE);
    }

    @Override
    public void onNewToken(String token) {
        prefs(this).edit().putString(KEY_TOKEN, token).apply();
    }

    static boolean hasToken(Context c) {
        return prefs(c).getString(KEY_TOKEN, null) != null;
    }

    /** Refreshes the saved token (async); the next launch hands it to the web app. */
    static void refreshToken(Context c, Runnable then) {
        try {
            FirebaseMessaging.getInstance().getToken().addOnCompleteListener(t -> {
                if (t.isSuccessful() && t.getResult() != null) {
                    prefs(c).edit().putString(KEY_TOKEN, t.getResult()).apply();
                }
                if (then != null) then.run();
            });
        } catch (IllegalStateException e) { // built without google-services.json
            if (then != null) then.run();
        }
    }

    /** Launch URL + #nperm&nbat&nring&ntok&npc for the web app (features/notifications/services/nativePush.js). */
    static Uri launchUri(Context c, Uri base) {
        SharedPreferences p = prefs(c);
        StringBuilder f = new StringBuilder()
                .append("nperm=").append(NotificationManagerCompat.from(c).areNotificationsEnabled() ? 1 : 0)
                .append("&nbat=").append(batteryUnrestricted(c) ? 1 : 0)
                .append("&nring=").append(ringing(c) ? 1 : 0);
        String token = p.getString(KEY_TOKEN, null);
        if (token != null) f.append("&ntok=").append(Uri.encode(token));
        String pending = p.getString(KEY_PENDING, "");
        if (!pending.isEmpty()) {
            f.append("&npc=").append(pending);
            p.edit().remove(KEY_PENDING).apply(); // ponytail: handed over once; lost if that page load fails
        }
        return base.buildUpon().encodedFragment(f.toString()).build();
    }

    /** False when the driver muted the Ride alerts channel (importance or sound set to none). */
    static boolean ringing(Context c) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return true;
        NotificationChannel ch = c.getSystemService(NotificationManager.class)
                .getNotificationChannel(DelegationService.CHANNEL_ID);
        return ch == null || (ch.getImportance() >= NotificationManager.IMPORTANCE_DEFAULT && ch.getSound() != null);
    }

    static boolean batteryUnrestricted(Context c) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) return true;
        PowerManager pm = (PowerManager) c.getSystemService(Context.POWER_SERVICE);
        return pm.isIgnoringBatteryOptimizations(c.getPackageName());
    }

    static void addPendingContact(Context c, String rideId) {
        SharedPreferences p = prefs(c);
        String cur = p.getString(KEY_PENDING, "");
        p.edit().putString(KEY_PENDING, cur.isEmpty() ? rideId : cur + "," + rideId).apply();
    }

    @Override
    public void onMessageReceived(RemoteMessage message) {
        Map<String, String> d = message.getData();
        String type = d.get("type");
        boolean ride = TYPE_RIDE.equals(type);
        if (!NotificationManagerCompat.from(this).areNotificationsEnabled()) return;
        DelegationService.ensureChannel(this);

        String rideId = d.get("rideId");
        String from = d.get("pickup"); // not "from": FCM reserves that key
        String phone = d.get("phone");
        int id = (rideId != null ? rideId : String.valueOf(type)).hashCode();
        String group = ride && from != null ? "city:" + from : null;

        NotificationCompat.Builder b = base(d.get("title"))
                .setContentText(d.get("body"))
                .setStyle(new NotificationCompat.BigTextStyle().bigText(d.get("body")))
                .setContentIntent(open(d.get("url"), id))
                .setCategory(NotificationCompat.CATEGORY_MESSAGE);
        if (ride && phone != null && !phone.isEmpty()) {
            b.addAction(0, getString(R.string.pushCall), contact(ContactActivity.MODE_CALL, phone, rideId, id));
            b.addAction(0, getString(R.string.pushWhatsapp), contact(ContactActivity.MODE_WHATSAPP, phone, rideId, id));
        } else if (ride) {
            b.addAction(0, getString(R.string.pushView), open(d.get("url"), id));
        }
        if (group != null) b.setGroup(group);

        NotificationManagerCompat nm = NotificationManagerCompat.from(this);
        trimOldest((NotificationManager) getSystemService(NOTIFICATION_SERVICE));
        try {
            nm.notify(id, b.build());
            if (group != null) {
                // One collapsible stack per pickup city; the children do the ringing.
                nm.notify(group.hashCode(), base(from)
                        .setContentText(getString(R.string.pushGroup, from))
                        .setGroup(group).setGroupSummary(true)
                        .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_CHILDREN)
                        .setContentIntent(open(d.get("url"), group.hashCode()))
                        .build());
            }
        } catch (SecurityException e) { // POST_NOTIFICATIONS revoked between the check and here
            android.util.Log.w("EaseCab", "notify denied", e);
        }
    }

    /**
     * Android silently drops every new notification once an app has 50 showing
     * (NotificationManagerService MAX_PACKAGE_NOTIFICATIONS) — one per ride hit that.
     * Cancel the oldest rides so the newest always lands. ponytail: a city summary whose
     * rides were all trimmed stays until swiped; bounded by the driver's city count.
     */
    private static void trimOldest(NotificationManager nm) {
        StatusBarNotification[] all = nm.getActiveNotifications();
        int extra = all.length - MAX_SHOWN + 2; // room for this ride + its city summary
        if (extra <= 0) return;
        Arrays.sort(all, (a, b) -> Long.compare(a.getPostTime(), b.getPostTime()));
        for (StatusBarNotification s : all) {
            if (extra <= 0) break;
            if ((s.getNotification().flags & Notification.FLAG_GROUP_SUMMARY) != 0) continue;
            nm.cancel(s.getTag(), s.getId());
            extra--;
        }
    }

    private NotificationCompat.Builder base(String title) {
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, DelegationService.CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification_icon)
                .setColor(ContextCompat.getColor(this, R.color.colorPrimary))
                .setContentTitle(title)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setAutoCancel(true);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) b.setSound(DelegationService.soundUri(this));
        return b;
    }

    private PendingIntent open(String path, int requestCode) {
        Uri uri = Uri.parse("https://" + getString(R.string.hostName) + (path != null ? path : "/feed"));
        Intent i = new Intent(Intent.ACTION_VIEW, uri, this, LauncherActivity.class)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(this, requestCode, i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private PendingIntent contact(String mode, String phone, String rideId, int notifId) {
        Intent i = new Intent(this, ContactActivity.class)
                .putExtra(ContactActivity.EXTRA_MODE, mode)
                .putExtra(ContactActivity.EXTRA_PHONE, phone)
                .putExtra(ContactActivity.EXTRA_RIDE, rideId)
                .putExtra(ContactActivity.EXTRA_NOTIF, notifId)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(this, (mode + notifId).hashCode(), i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void cancel(Context c, int notifId) {
        ((NotificationManager) c.getSystemService(NOTIFICATION_SERVICE)).cancel(notifId);
    }
}

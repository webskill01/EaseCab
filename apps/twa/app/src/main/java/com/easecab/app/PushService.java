package com.easecab.app;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

/**
 * Native ride alerts (v11). The API sends the same data-only FCM message it sends the
 * website; here the app draws it itself, so it reads "EaseCab" (not "Brave · easecab.com"),
 * arrives with the browser closed, rings on the Ride alerts channel, stacks per pickup
 * city and carries Call / WhatsApp (paid members only — the API adds `phone` just for
 * them), View ride and Mute 1 hr buttons.
 *
 * The web app learns the token through the launch URL fragment (launchUri) and
 * registers it as platform "android"; the API never needs to know this class exists.
 */
public class PushService extends FirebaseMessagingService {
    static final String PREFS = "push";
    private static final String KEY_TOKEN = "token";
    private static final String KEY_MUTE_UNTIL = "mute_until";
    private static final String KEY_PENDING = "pending_contacts";
    private static final String TYPE_RIDE = "new_ride"; // = PUSH.TYPE (packages/shared)
    static final long MUTE_MS = 60 * 60 * 1000L;

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

    /** Launch URL + #nperm&nbat&ntok&npc for the web app (features/notifications/services/nativePush.js). */
    static Uri launchUri(Context c, Uri base) {
        SharedPreferences p = prefs(c);
        StringBuilder f = new StringBuilder()
                .append("nperm=").append(NotificationManagerCompat.from(c).areNotificationsEnabled() ? 1 : 0)
                .append("&nbat=").append(batteryUnrestricted(c) ? 1 : 0);
        String token = p.getString(KEY_TOKEN, null);
        if (token != null) f.append("&ntok=").append(Uri.encode(token));
        String pending = p.getString(KEY_PENDING, "");
        if (!pending.isEmpty()) {
            f.append("&npc=").append(pending);
            p.edit().remove(KEY_PENDING).apply(); // ponytail: handed over once; lost if that page load fails
        }
        return base.buildUpon().encodedFragment(f.toString()).build();
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

    static void muteForAnHour(Context c) {
        prefs(c).edit().putLong(KEY_MUTE_UNTIL, System.currentTimeMillis() + MUTE_MS).apply();
    }

    @Override
    public void onMessageReceived(RemoteMessage message) {
        Map<String, String> d = message.getData();
        String type = d.get("type");
        boolean ride = TYPE_RIDE.equals(type);
        if (ride && System.currentTimeMillis() < prefs(this).getLong(KEY_MUTE_UNTIL, 0)) return;
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
        if (ride) b.addAction(0, getString(R.string.pushMute), mute(id));
        if (group != null) b.setGroup(group);

        NotificationManagerCompat nm = NotificationManagerCompat.from(this);
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

    private PendingIntent mute(int notifId) {
        Intent i = new Intent(this, MuteReceiver.class).putExtra(ContactActivity.EXTRA_NOTIF, notifId);
        return PendingIntent.getBroadcast(this, ("mute" + notifId).hashCode(), i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static void cancel(Context c, int notifId) {
        ((NotificationManager) c.getSystemService(NOTIFICATION_SERVICE)).cancel(notifId);
    }
}

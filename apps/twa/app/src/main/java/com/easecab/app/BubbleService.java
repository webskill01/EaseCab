package com.easecab.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.graphics.Outline;
import android.graphics.PixelFormat;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.provider.Settings;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewConfiguration;
import android.view.ViewOutlineProvider;
import android.view.WindowManager;
import android.widget.ImageView;

/**
 * Floating EaseCab button drawn over other apps (like the Uber/Ola driver bubble).
 * Visible only while the EaseCab tab is hidden; LauncherActivity reports tab
 * shown/hidden. Tap reopens the app, drag moves it. Runs as a foreground service so
 * Android keeps it alive; the user turns it off from the app or the notification.
 */
public class BubbleService extends Service {
    static final String ACTION_STOP = "com.easecab.app.BUBBLE_STOP";
    private static final String PREFS = "bubble";
    private static final String KEY_ON = "on";
    private static final String CHANNEL_ID = "bubble_channel_id";
    private static final int NOTIFICATION_ID = 7001;
    private static final int SIZE_DP = 56;
    private static final int START_Y_SIZES = 4; // first shown ~4 bubbles below the top

    private static BubbleService instance;
    // ponytail: a fresh process (service restarted by Android) means EaseCab is not on screen.
    static boolean appVisible = false;

    private WindowManager wm;
    private ImageView bubble;
    private WindowManager.LayoutParams lp;

    static boolean isOn(Context c) {
        return c.getSharedPreferences(PREFS, MODE_PRIVATE).getBoolean(KEY_ON, false);
    }

    static boolean canDraw(Context c) {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.M || Settings.canDrawOverlays(c);
    }

    static void setOn(Context c, boolean on) {
        c.getSharedPreferences(PREFS, MODE_PRIVATE).edit().putBoolean(KEY_ON, on).apply();
        if (on) startIfAllowed(c);
        else c.stopService(new Intent(c, BubbleService.class));
    }

    /** Starts the bubble if the user turned it on and overlay permission is still granted. */
    static void startIfAllowed(Context c) {
        if (!isOn(c) || !canDraw(c)) return;
        Intent i = new Intent(c, BubbleService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) c.startForegroundService(i);
        else c.startService(i);
    }

    /** EaseCab tab shown/hidden. Called from a binder thread. */
    static void onAppVisible(boolean visible) {
        new Handler(Looper.getMainLooper()).post(() -> {
            appVisible = visible;
            if (instance != null) instance.refresh();
        });
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        startAsForeground();
        if (intent != null && ACTION_STOP.equals(intent.getAction())) {
            setOn(this, false);
            return START_NOT_STICKY;
        }
        if (!canDraw(this)) { // permission revoked in system settings
            stopSelf();
            return START_NOT_STICKY;
        }
        instance = this;
        if (bubble == null) addBubble();
        refresh();
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (bubble != null) wm.removeView(bubble);
        bubble = null;
        instance = null;
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void refresh() {
        if (bubble != null) bubble.setVisibility(appVisible ? View.GONE : View.VISIBLE);
    }

    private void startAsForeground() {
        NotificationManager nm = getSystemService(NotificationManager.class);
        Notification.Builder b;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            nm.createNotificationChannel(new NotificationChannel(
                    CHANNEL_ID, getString(R.string.bubbleChannel), NotificationManager.IMPORTANCE_MIN));
            b = new Notification.Builder(this, CHANNEL_ID);
        } else {
            b = new Notification.Builder(this).setPriority(Notification.PRIORITY_MIN);
        }
        int imm = PendingIntent.FLAG_IMMUTABLE;
        PendingIntent open = PendingIntent.getActivity(this, 0, launchIntent(), imm);
        PendingIntent stop = PendingIntent.getService(this, 1,
                new Intent(this, BubbleService.class).setAction(ACTION_STOP), imm);
        Notification n = b.setSmallIcon(R.drawable.ic_notification_icon)
                .setContentTitle(getString(R.string.bubbleOn))
                .setContentIntent(open)
                .addAction(new Notification.Action.Builder(null, getString(R.string.bubbleTurnOff), stop).build())
                .setOngoing(true)
                .build();
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE);
        } else {
            startForeground(NOTIFICATION_ID, n);
        }
    }

    private Intent launchIntent() {
        // Same intent as the home-screen icon: brings the running EaseCab task forward.
        Intent i = getPackageManager().getLaunchIntentForPackage(getPackageName());
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED);
        return i;
    }

    private void addBubble() {
        wm = getSystemService(WindowManager.class);
        float density = getResources().getDisplayMetrics().density;
        int size = Math.round(SIZE_DP * density);
        bubble = new ImageView(this);
        bubble.setImageResource(R.mipmap.ic_launcher);
        bubble.setScaleType(ImageView.ScaleType.CENTER_CROP);
        bubble.setContentDescription(getString(R.string.launcherName));
        bubble.setElevation(6 * density);
        bubble.setOutlineProvider(new ViewOutlineProvider() {
            @Override
            public void getOutline(View v, Outline o) {
                o.setOval(0, 0, v.getWidth(), v.getHeight());
            }
        });
        bubble.setClipToOutline(true);
        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;
        lp = new WindowManager.LayoutParams(size, size, type,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
                PixelFormat.TRANSLUCENT);
        lp.gravity = Gravity.TOP | Gravity.START;
        lp.y = size * START_Y_SIZES;
        bubble.setOnTouchListener(new Drag(ViewConfiguration.get(this).getScaledTouchSlop()));
        wm.addView(bubble, lp);
    }

    /** Drag to move; a touch that never passes the slop is a tap → open EaseCab. */
    private final class Drag implements View.OnTouchListener {
        private final int slop;
        private int startX, startY;
        private float downX, downY;
        private boolean moved;

        Drag(int slop) {
            this.slop = slop;
        }

        @Override
        public boolean onTouch(View v, MotionEvent e) {
            switch (e.getActionMasked()) {
                case MotionEvent.ACTION_DOWN:
                    startX = lp.x;
                    startY = lp.y;
                    downX = e.getRawX();
                    downY = e.getRawY();
                    moved = false;
                    return true;
                case MotionEvent.ACTION_MOVE:
                    int dx = Math.round(e.getRawX() - downX);
                    int dy = Math.round(e.getRawY() - downY);
                    if (Math.abs(dx) > slop || Math.abs(dy) > slop) moved = true;
                    if (moved) {
                        lp.x = startX + dx;
                        lp.y = startY + dy;
                        wm.updateViewLayout(v, lp);
                    }
                    return true;
                case MotionEvent.ACTION_UP:
                    if (!moved) {
                        startActivity(launchIntent());
                        onAppVisible(true); // hide now; TAB_SHOWN confirms
                    }
                    return true;
                default:
                    return false;
            }
        }
    }
}

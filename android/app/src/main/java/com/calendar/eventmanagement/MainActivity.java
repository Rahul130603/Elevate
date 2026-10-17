package com.calendar.eventmanagement;

import com.getcapacitor.BridgeActivity;
import com.getcapacitor.CapConfig;
import android.os.Bundle;
import android.app.AlertDialog;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.RadioGroup;
import android.widget.RadioButton;
import android.content.SharedPreferences;
import android.widget.TextView;
import android.widget.ImageView;
import android.widget.ScrollView;
import android.graphics.Color;
import android.graphics.BitmapFactory;
import android.view.WindowManager;
import java.net.HttpURLConnection;
import java.net.URL;

public class MainActivity extends BridgeActivity {
    private SharedPreferences settings() { return getSharedPreferences("elevate_server", MODE_PRIVATE); }

    @Override protected void load() {
        String url = settings().getString("selected_url", "");
        if (!url.isEmpty()) config = new CapConfig.Builder(this).setServerUrl(url).setAndroidScheme("http").setAllowMixedContent(false).create();
        super.load();
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        if (getIntent().getBooleanExtra("connected", false)) getIntent().removeExtra("connected");
        else if (state == null) showServerPicker();
    }

    private void showServerPicker() {
        android.view.ContextThemeWrapper pickerContext = new android.view.ContextThemeWrapper(this, android.app.AlertDialog.THEME_DEVICE_DEFAULT_LIGHT);
        int textColor = Color.rgb(15,23,42);
        int accentColor = Color.rgb(234,88,12);
        LinearLayout panel = new LinearLayout(pickerContext);
        panel.setOrientation(LinearLayout.VERTICAL);
        int padding = (int)(20 * getResources().getDisplayMetrics().density);
        panel.setPadding(padding, padding, padding, padding);
        panel.setBackgroundColor(Color.WHITE);
        if (android.os.Build.VERSION.SDK_INT >= 29) panel.setForceDarkAllowed(false);
        ImageView logo = new ImageView(this);
        try (java.io.InputStream image = getAssets().open("public/logo.png")) {
            logo.setImageBitmap(BitmapFactory.decodeStream(image));
        } catch (java.io.IOException error) {
            logo.setImageResource(com.calendar.eventmanagement.R.drawable.elevate_wordmark);
        }
        logo.setAdjustViewBounds(true);
        logo.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        logo.setContentDescription("Elevate");
        LinearLayout.LayoutParams logoSize = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, padding * 4);
        logoSize.gravity = android.view.Gravity.CENTER_HORIZONTAL;
        logoSize.bottomMargin = padding * 2;
        panel.addView(logo, logoSize);
        TextView heading = new TextView(this);
        heading.setText("Your workspace,\nwherever you are.");
        heading.setTextSize(28); heading.setTextColor(Color.rgb(15, 23, 42));
        heading.setTypeface(null, android.graphics.Typeface.BOLD);
        panel.addView(heading);
        TextView help = new TextView(this);
        help.setText("Connect to your Elevate server to manage meetings, bookings and industry news.");
        help.setTextSize(15); help.setTextColor(Color.rgb(100,116,139)); help.setPadding(0,padding,0,padding);
        panel.addView(help);
        RadioGroup modes = new RadioGroup(pickerContext);
        RadioButton local = new RadioButton(pickerContext); local.setId(1001); local.setText("Same Wi-Fi · Laptop server");
        RadioButton online = new RadioButton(pickerContext); online.setId(1002); online.setText("Public HTTPS server");
        for (RadioButton mode : new RadioButton[] {local, online}) {
            mode.setTextColor(textColor);
            mode.setButtonTintList(android.content.res.ColorStateList.valueOf(accentColor));
            mode.setTextSize(15);
        }
        modes.addView(local); modes.addView(online); panel.addView(modes);
        local.setPadding(0,padding/2,0,padding/2); online.setPadding(0,padding/2,0,padding/2);
        TextView addressLabel = new TextView(pickerContext);
        addressLabel.setText("Server IP address / URL"); addressLabel.setTextColor(textColor);
        addressLabel.setTextSize(14); addressLabel.setPadding(0,padding/2,0,padding/2);
        panel.addView(addressLabel);
        EditText address = new EditText(pickerContext); address.setSingleLine(true);
        address.setTextColor(textColor); address.setHintTextColor(Color.rgb(100,116,139));
        android.graphics.drawable.GradientDrawable inputBackground = new android.graphics.drawable.GradientDrawable();
        inputBackground.setColor(Color.rgb(248,250,252)); inputBackground.setCornerRadius(padding/2);
        inputBackground.setStroke(Math.max(1,padding/20), Color.rgb(203,213,225));
        address.setBackground(inputBackground);
        address.setContentDescription("Server IP address or URL");
        address.setTextSize(16); address.setPadding(padding/2,padding,padding/2,padding);
        address.setInputType(android.text.InputType.TYPE_CLASS_TEXT | android.text.InputType.TYPE_TEXT_VARIATION_URI);
        panel.addView(address);
        modes.setOnCheckedChangeListener((group, checked) -> {
            address.setHint(checked == 1001 ? "e.g. 192.168.0.27:3000" : "https://your-server.example");
            address.setText(settings().getString(checked == 1001 ? "local_url" : "public_url", ""));
        });
        modes.check(settings().getBoolean("online", false) ? 1002 : 1001);
        TextView tip = new TextView(this);
        tip.setText("Wi-Fi connection: keep your laptop and phone on the same network with the server running.\n\nOnline connection: use your deployed HTTPS address.");
        tip.setTextSize(13); tip.setTextColor(Color.rgb(100,116,139)); tip.setPadding(0,padding,0,padding);
        panel.addView(tip);
        ScrollView scroll = new ScrollView(pickerContext); scroll.setFillViewport(true); scroll.setBackgroundColor(Color.WHITE); scroll.addView(panel);
        AlertDialog dialog = new AlertDialog.Builder(pickerContext)
            .setView(scroll).setPositiveButton("Connect to workspace", null).setNegativeButton("Close", (d, w) -> { if (settings().getString("selected_url", "").isEmpty()) finish(); }).create();
        dialog.setCanceledOnTouchOutside(false);
        dialog.setOnShowListener(d -> dialog.getButton(AlertDialog.BUTTON_POSITIVE).setOnClickListener(v -> {
            boolean publicMode = modes.getCheckedRadioButtonId() == 1002;
            final String value;
            try { value = ServerAddress.normalize(address.getText().toString(), publicMode); }
            catch (IllegalArgumentException error) { address.setError(error.getMessage()); return; }
            address.setText(value);
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setEnabled(false);
            dialog.getButton(AlertDialog.BUTTON_POSITIVE).setText("Connecting…");
            new Thread(() -> {
                boolean connected = false;
                HttpURLConnection connection = null;
                try {
                    connection = (HttpURLConnection) new URL(value + "/api/health").openConnection();
                    connection.setConnectTimeout(6000); connection.setReadTimeout(6000);
                    java.util.Scanner reader = new java.util.Scanner(connection.getInputStream(), "UTF-8").useDelimiter("\\A");
                    String body = reader.hasNext() ? reader.next() : "";
                    reader.close();
                    connected = connection.getResponseCode() == 200 && "healthy".equals(new org.json.JSONObject(body).optString("status"));
                } catch (Exception ignored) {} finally { if (connection != null) connection.disconnect(); }
                final boolean ok = connected;
                runOnUiThread(() -> {
                    dialog.getButton(AlertDialog.BUTTON_POSITIVE).setEnabled(true);
                    dialog.getButton(AlertDialog.BUTTON_POSITIVE).setText("Connect to workspace");
                    if (!ok) { address.setError(publicMode ? "Server unreachable. Check the HTTPS URL and internet connection." : "Cannot reach " + value + ". Connect phone and laptop to the same Wi-Fi; check laptop server and firewall."); address.requestFocus(); return; }
                    settings().edit().putString(publicMode ? "public_url" : "local_url", value).putString("selected_url", value).putBoolean("online", publicMode).apply();
                    dialog.dismiss(); getIntent().putExtra("connected", true); recreate();
                });
            }).start();
        }));
        // A connection-triggered recreation opens the server immediately.
        dialog.show();
        dialog.getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(Color.WHITE));
        dialog.getWindow().setLayout(WindowManager.LayoutParams.MATCH_PARENT, (int)(getResources().getDisplayMetrics().heightPixels * 0.9));
        dialog.getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE | WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN);
        dialog.getButton(AlertDialog.BUTTON_POSITIVE).setTextColor(accentColor);
        dialog.getButton(AlertDialog.BUTTON_NEGATIVE).setTextColor(Color.rgb(71,85,105));
    }
}

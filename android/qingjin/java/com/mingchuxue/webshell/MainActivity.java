package com.mingchuxue.webshell;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.NetworkCapabilities;
import android.net.Network;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.util.Base64;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Iterator;
import java.util.concurrent.ConcurrentHashMap;
import org.json.JSONObject;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

public class MainActivity extends Activity {
    static final String LOCAL_HOST = "appassets.androidplatform.net";
    static final String LOCAL_ORIGIN = "https://" + LOCAL_HOST + "/";
    static final int REQ_FILE = 41, REQ_SAVE = 42, REQ_NOTIF = 43;
    static final String CHANNEL = "reminders";

    FrameLayout root;
    WebView web;
    View customView;
    WebChromeClient.CustomViewCallback customCallback;
    ValueCallback<Uri[]> fileCallback;
    Uri captureUri;
    boolean imageChooser;
    int fileGeneration;
    byte[] pendingSave;
    TextToSpeech tts;
    boolean ttsReady;
    long lastBack;
    volatile boolean forceOffline;
    String shellJs;
    final Handler ui = new Handler(Looper.getMainLooper());
    int barColor;
    boolean firstLoadDone;
    int notifSeq = 1;
    static long lastCrash;
    static int crashCount;

    String startUrl() { return BuildConfig.LIVE_PREFIX.isEmpty() ? LOCAL_ORIGIN + "index.html" : BuildConfig.LIVE_PREFIX; }

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        barColor = Color.parseColor(BuildConfig.THEME_COLOR);
        Window w = getWindow();
        w.setStatusBarColor(Color.TRANSPARENT);
        w.setNavigationBarColor(Color.TRANSPARENT);
        if (Build.VERSION.SDK_INT >= 30) {
            w.setDecorFitsSystemWindows(false);
        } else {
            w.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
        if (Build.VERSION.SDK_INT >= 28) {
            WindowManager.LayoutParams lp = w.getAttributes();
            lp.layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES;
            w.setAttributes(lp);
        }
        if (Build.VERSION.SDK_INT >= 29) { w.setStatusBarContrastEnforced(false); w.setNavigationBarContrastEnforced(false); }

        PhotoProvider.clear(this); // 清除上次异常结束的临时文件。
        root = new FrameLayout(this);
        root.setBackgroundColor(barColor);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int l, t, r, b;
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime() | WindowInsets.Type.displayCutout());
                l = i.left; t = i.top; r = i.right; b = i.bottom;
            } else {
                l = insets.getSystemWindowInsetLeft(); t = insets.getSystemWindowInsetTop();
                r = insets.getSystemWindowInsetRight(); b = insets.getSystemWindowInsetBottom();
            }
            if (customView != null) { v.setPadding(0, 0, 0, 0); } else { v.setPadding(l, t, r, b); }
            return insets;
        });

        try { shellJs = readAll(getAssets().open("shell.js")); } catch (IOException e) { shellJs = ""; }

        if (BuildConfig.DEBUG) WebView.setWebContentsDebuggingEnabled(true);
        web = new WebView(this);
        web.setBackgroundColor(barColor);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
        applyBarIcons();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(true); // 仅通过下面的拦截规则读取本App一次性缓存URI。
        s.setTextZoom(100);
        s.setSupportMultipleWindows(false);
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        CookieManager.getInstance().setAcceptCookie(true);
        web.addJavascriptInterface(new Bridge(), "__AppBridge");
        web.setOverScrollMode(View.OVER_SCROLL_IF_CONTENT_SCROLLS);

        if (Build.VERSION.SDK_INT >= 24) {
            try {
                ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() {
                    @Override public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) { return intercept(request); }
                });
            } catch (Throwable ignored) {}
        }

        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) { return intercept(request); }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return route(request.getUrl()); }
            @Override public void onPageFinished(WebView view, String url) {
                firstLoadDone = true;
                view.evaluateJavascript(shellJs, null);
            }
            @Override public boolean onRenderProcessGone(WebView view, android.webkit.RenderProcessGoneDetail detail) {
                long now = System.currentTimeMillis();
                if (now - lastCrash < 60000) crashCount++; else crashCount = 1;
                lastCrash = now;
                root.removeView(view);
                view.destroy();
                web = null;
                if (crashCount > 2) { finish(); return true; }
                ui.post(() -> { Intent i = getIntent(); finish(); overridePendingTransition(0, 0); startActivity(i); });
                return true;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest req, android.webkit.WebResourceError err) {
                if (req.isForMainFrame() && !BuildConfig.LIVE_PREFIX.isEmpty() && !forceOffline) {
                    forceOffline = true;
                    ui.post(() -> view.reload());
                }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onShowCustomView(View view, CustomViewCallback cb) {
                if (customView != null) { cb.onCustomViewHidden(); return; }
                customView = view; customCallback = cb;
                root.addView(view, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
                setFullBleed(true);
            }
            @Override public void onHideCustomView() { exitCustomView(); }
            @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (!trustedPage()) { cb.onReceiveValue(null); return true; }
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileGeneration++; clearCapture();
                fileCallback = cb; captureUri = null; imageChooser = false;
                for (String type : params.getAcceptTypes()) if (type != null && type.startsWith("image/")) imageChooser = true;
                try {
                    if (imageChooser && params.isCaptureEnabled()) {
                        Intent camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                        if (camera.resolveActivity(getPackageManager()) != null) {
                            File f = PhotoProvider.newFile(MainActivity.this, "jpg");
                            captureUri = PhotoProvider.uri(MainActivity.this, f);
                            camera.putExtra(MediaStore.EXTRA_OUTPUT, captureUri);
                            camera.setClipData(ClipData.newRawUri("题目照片", captureUri));
                            camera.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                            startActivityForResult(camera, REQ_FILE); return true;
                        }
                        Toast.makeText(MainActivity.this, "未找到相机，改为选择图片", Toast.LENGTH_SHORT).show();
                    }
                    Intent pick = new Intent(Intent.ACTION_OPEN_DOCUMENT);
                    pick.addCategory(Intent.CATEGORY_OPENABLE);
                    pick.setType(imageChooser ? "image/*" : "*/*");
                    if (imageChooser) pick.putExtra(Intent.EXTRA_MIME_TYPES, new String[]{"image/jpeg","image/png","image/webp"});
                    pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, false);
                    pick.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    startActivityForResult(Intent.createChooser(pick, imageChooser ? "选择题目图片" : "选择备份文件"), REQ_FILE);
                } catch (Exception e) { clearCapture(); finishFile(null); Toast.makeText(MainActivity.this, "无法打开相机或文件选择器", Toast.LENGTH_SHORT).show(); }
                return true;
            }
        });
        web.setDownloadListener((url, ua, cd, mime, len) -> {
            if (url.startsWith("http")) openExternal(Uri.parse(url));
        });

        if (!BuildConfig.LIVE_PREFIX.isEmpty()) {
            if (!networkUp()) forceOffline = true;
            try {
                ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
                cm.registerDefaultNetworkCallback(new ConnectivityManager.NetworkCallback() {
                    @Override public void onAvailable(Network n) { forceOffline = false; }
                });
            } catch (Throwable ignored) {}
            ui.postDelayed(() -> { if (!firstLoadDone && !forceOffline) { forceOffline = true; web.stopLoading(); web.loadUrl(startUrl()); } }, 20000);
        }

        if (state != null) web.restoreState(state);
        if (web.getUrl() == null) web.loadUrl(startUrl());
        if (Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, this::handleBack);
        }
    }

    @Override protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); try { if (web != null) web.saveState(out); } catch (Throwable ignored) {} }

    // ---------- networking / assets ----------
    boolean networkUp() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
            Network n = cm.getActiveNetwork();
            if (n == null) return false;
            NetworkCapabilities c = cm.getNetworkCapabilities(n);
            return c != null && c.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET);
        } catch (Throwable t) { return true; }
    }

    WebResourceResponse intercept(WebResourceRequest req) {
        Uri u = req.getUrl();
        if ("content".equals(u.getScheme()) && !(getPackageName()+".photos").equals(u.getAuthority())) return notFound();
        if ("file".equals(u.getScheme())) return notFound();
        String url = u.toString();
        String live = BuildConfig.LIVE_PREFIX;
        String rel = null;
        if (LOCAL_HOST.equals(u.getHost()) && "https".equals(u.getScheme())) {
            rel = u.getPath() == null ? "" : u.getPath().replaceFirst("^/", "");
        } else if (!live.isEmpty() && url.startsWith(live)) {
            String p = u.getPath() == null ? "" : u.getPath();
            String lp = Uri.parse(live).getPath();
            rel = p.length() >= lp.length() ? p.substring(lp.length()) : "";
        } else {
            return null;
        }
        if (!"GET".equalsIgnoreCase(req.getMethod())) return null;
        if (rel.isEmpty() || rel.endsWith("/")) rel = rel + "index.html";
        try { rel = java.net.URLDecoder.decode(rel, "UTF-8"); } catch (Exception ignored) {}
        if (rel.contains("..")) return notFound();
        if (rel.equals("sw.js")) return notFound();
        boolean isHtml = rel.endsWith(".html");

        if (!live.isEmpty() && url.startsWith(live)) {
            if (!forceOffline) {
                WebResourceResponse r = fetchLive(url, rel, isHtml);
                if (r != null) return r;
            }
            File cached = cacheFile(rel);
            if (cached.exists()) {
                try { return respond(readBytes(new FileInputStream(cached)), mimeFor(rel), isHtml); } catch (IOException ignored) {}
            }
        }
        try {
            return respond(readBytes(getAssets().open("site/" + rel)), mimeFor(rel), isHtml);
        } catch (IOException e) {
            return notFound();
        }
    }

    WebResourceResponse fetchLive(String url, String rel, boolean isHtml) {
        HttpURLConnection c = null;
        try {
            c = (HttpURLConnection) new URL(url).openConnection();
            c.setConnectTimeout(8000);
            c.setReadTimeout(15000);
            c.setUseCaches(false);
            c.setRequestProperty("Cache-Control", "no-cache");
            c.setInstanceFollowRedirects(true);
            int code = c.getResponseCode();
            if (code == 404) return null;
            if (code < 200 || code >= 300) return null;
            byte[] data = readBytes(c.getInputStream());
            String ct = c.getContentType();
            String mime = ct != null ? ct.split(";")[0].trim() : mimeFor(rel);
            try {
                File f = cacheFile(rel);
                f.getParentFile().mkdirs();
                File tmp = new File(f.getPath() + ".tmp");
                try (FileOutputStream o = new FileOutputStream(tmp)) { o.write(data); }
                tmp.renameTo(f);
            } catch (Exception ignored) {}
            return respond(data, mime, isHtml);
        } catch (Exception e) {
            return null;
        } finally { if (c != null) c.disconnect(); }
    }

    File cacheFile(String rel) { return new File(new File(getFilesDir(), "livecache"), rel.replace('\\', '_')); }

    WebResourceResponse respond(byte[] data, String mime, boolean isHtml) {
        if (isHtml) data = injectShell(data);
        Map<String, String> h = new HashMap<>();
        h.put("Cache-Control", "no-cache");
        h.put("Access-Control-Allow-Origin", "*");
        String enc = (mime.startsWith("text/") || mime.contains("javascript") || mime.contains("json") || mime.contains("svg") || mime.contains("xml")) ? "utf-8" : null;
        return new WebResourceResponse(mime, enc, 200, "OK", h, new ByteArrayInputStream(data));
    }

    WebResourceResponse notFound() {
        return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<>(), new ByteArrayInputStream(new byte[0]));
    }

    byte[] injectShell(byte[] html) {
        String s = new String(html, StandardCharsets.UTF_8);
        String tag = "<script>" + shellJs + "</script>";
        int i = indexOfIgnoreCase(s, "<head");
        if (i >= 0) {
            int j = s.indexOf('>', i);
            if (j > 0) s = s.substring(0, j + 1) + tag + s.substring(j + 1);
        } else {
            s = tag + s;
        }
        return s.getBytes(StandardCharsets.UTF_8);
    }

    static int indexOfIgnoreCase(String s, String needle) { return s.toLowerCase(Locale.ROOT).indexOf(needle); }

    static String mimeFor(String p) {
        String e = p.substring(p.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
        switch (e) {
            case "html": case "htm": return "text/html";
            case "js": case "mjs": return "text/javascript";
            case "css": return "text/css";
            case "json": return "application/json";
            case "webmanifest": return "application/manifest+json";
            case "svg": return "image/svg+xml";
            case "png": return "image/png";
            case "jpg": case "jpeg": return "image/jpeg";
            case "webp": return "image/webp";
            case "gif": return "image/gif";
            case "ico": return "image/x-icon";
            case "woff2": return "font/woff2";
            case "woff": return "font/woff";
            case "ttf": return "font/ttf";
            case "otf": return "font/otf";
            case "mp3": return "audio/mpeg";
            case "ogg": return "audio/ogg";
            case "wav": return "audio/wav";
            case "txt": return "text/plain";
            case "xml": return "application/xml";
            default: return "application/octet-stream";
        }
    }

    static byte[] readBytes(InputStream in) throws IOException {
        try (InputStream i = in) {
            ByteArrayOutputStream o = new ByteArrayOutputStream();
            byte[] b = new byte[16384];
            int n;
            while ((n = i.read(b)) > 0) o.write(b, 0, n);
            return o.toByteArray();
        }
    }

    static String readAll(InputStream in) throws IOException { return new String(readBytes(in), StandardCharsets.UTF_8); }

    static String jsString(String s) {
        StringBuilder b = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"': b.append("\\\""); break;
                case '\\': b.append("\\\\"); break;
                case '\n': b.append("\\n"); break;
                case '\r': b.append("\\r"); break;
                case '\u2028': b.append("\\u2028"); break;
                case '\u2029': b.append("\\u2029"); break;
                case '<': b.append("\\u003c"); break;
                default: b.append(c);
            }
        }
        return b.append('"').toString();
    }

    // ---------- navigation ----------
    boolean isInternal(Uri u) {
        String url = u.toString();
        if (LOCAL_HOST.equals(u.getHost())) return true;
        return !BuildConfig.LIVE_PREFIX.isEmpty() && url.startsWith(BuildConfig.LIVE_PREFIX);
    }

    boolean route(Uri u) {
        if (isInternal(u)) return false;
        String sch = u.getScheme() == null ? "" : u.getScheme();
        if (sch.equals("blob") || sch.equals("data") || sch.equals("javascript") || sch.equals("about")) return false;
        openExternal(u);
        return true;
    }

    void openExternal(Uri u) {
        try {
            Intent i;
            if ("intent".equals(u.getScheme())) {
                i = Intent.parseUri(u.toString(), Intent.URI_INTENT_SCHEME);
                i.addCategory(Intent.CATEGORY_BROWSABLE);
                i.setComponent(null);
                i.setSelector(null);
            } else {
                i = new Intent(Intent.ACTION_VIEW, u);
            }
            i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(i);
        } catch (Exception e) {
            Toast.makeText(this, "没有可以打开此链接的应用", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    public void onBackPressed() { handleBack(); }

    void handleBack() {
        if (customView != null) { exitCustomView(); return; }
        if (web == null) { finish(); return; }
        String js = BuildConfig.ESC_BACK ? "(window.__appBack?window.__appBack():'0')" : "'0'";
        web.evaluateJavascript(js, v -> {
            if (v != null && v.contains("1")) return;
            if (web == null) return;
            if (web.canGoBack()) { web.goBack(); return; }
            long now = System.currentTimeMillis();
            if (now - lastBack < 2000) { finish(); return; }
            lastBack = now;
            Toast.makeText(this, "再按一次退出", Toast.LENGTH_SHORT).show();
        });
    }

    void exitCustomView() {
        if (customView == null) return;
        root.removeView(customView);
        customView = null;
        if (customCallback != null) customCallback.onCustomViewHidden();
        customCallback = null;
        setFullBleed(false);
    }

    void setFullBleed(boolean on) {
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = w.getInsetsController();
            if (c != null) {
                if (on) { c.hide(WindowInsets.Type.systemBars()); c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE); }
                else c.show(WindowInsets.Type.systemBars());
            }
        } else {
            int base = View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION;
            if (on) base |= View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY;
            w.getDecorView().setSystemUiVisibility(base);
            applyBarIcons();
        }
        root.requestApplyInsets();
    }

    void applyBarIcons() {
        boolean light = luminance(barColor) > 0.55;
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= 30) {
            WindowInsetsController c = w.getInsetsController();
            if (c != null) {
                int mask = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                c.setSystemBarsAppearance(light ? mask : 0, mask);
            }
        } else {
            View d = w.getDecorView();
            int f = d.getSystemUiVisibility();
            f = light ? (f | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR) : (f & ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
            if (Build.VERSION.SDK_INT >= 26) f = light ? (f | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR) : (f & ~View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
            d.setSystemUiVisibility(f);
            if (Build.VERSION.SDK_INT < 26 && light) w.setNavigationBarColor(Color.BLACK);
            if (Build.VERSION.SDK_INT < 23 && light) w.setStatusBarColor(0x33000000);
        }
    }

    static double luminance(int c) {
        return (0.299 * Color.red(c) + 0.587 * Color.green(c) + 0.114 * Color.blue(c)) / 255.0;
    }

    boolean trustedPage() { return web != null && web.getUrl() != null && web.getUrl().startsWith(LOCAL_ORIGIN); }
    void clearCapture(){if(captureUri!=null){try{revokeUriPermission(captureUri,Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);PhotoProvider.file(this,captureUri).delete();}catch(Exception ignored){}captureUri=null;}}
    void finishFile(Uri[] uris) { ValueCallback<Uri[]> cb=fileCallback; fileCallback=null; if(cb!=null)cb.onReceiveValue(uris); }

    // ---------- results ----------
    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        super.onActivityResult(req, res, data);
        if (req == REQ_FILE) {
            Uri selected = res == RESULT_OK ? (captureUri != null ? captureUri : data != null ? data.getData() : null) : null;
            Uri camera = captureUri; final int generation=fileGeneration;
            if (selected == null || !"content".equals(selected.getScheme())) { clearCapture(); finishFile(null); return; }
            captureUri=null;
            final boolean imageOnly = imageChooser;
            new Thread(() -> {
                Uri safe = null; File output = null;
                try {
                    String mime = getContentResolver().getType(selected);
                    String ext = "image/jpeg".equals(mime)?"jpg":"image/png".equals(mime)?"png":"image/webp".equals(mime)?"webp":null;
                    if (imageOnly && ext == null) throw new IOException("unsupported image");
                    if (ext == null) ext = "json";
                    output = PhotoProvider.newFile(this, ext);
                    try (InputStream in=getContentResolver().openInputStream(selected); OutputStream out=new FileOutputStream(output)) {
                        if (in == null) throw new IOException("empty input");
                        byte[] b=new byte[16384]; int n,total=0; int max=imageOnly?12*1024*1024:20*1024*1024;
                        while((n=in.read(b))!=-1){total+=n;if(total>max)throw new IOException("too large");out.write(b,0,n);}
                        if(total==0)throw new IOException("empty input");
                    }
                    safe=PhotoProvider.uri(this,output);
                } catch(Exception e) { if(output!=null)output.delete(); }
                if(camera!=null){try{revokeUriPermission(camera,Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);PhotoProvider.file(this,camera).delete();}catch(Exception ignored){}}
                final Uri result=safe;
                ui.post(()->{if(generation!=fileGeneration){if(result!=null)try{PhotoProvider.file(this,result).delete();}catch(Exception ignored){}return;}if(result==null)Toast.makeText(this,"图片格式不支持、文件超过限制或无法读取",Toast.LENGTH_LONG).show();finishFile(result==null?null:new Uri[]{result});});
            }).start();
        } else if (req == REQ_SAVE) {
            if (res == RESULT_OK && data != null && data.getData() != null && pendingSave != null) {
                try (OutputStream o = getContentResolver().openOutputStream(data.getData())) {
                    o.write(pendingSave);
                    Toast.makeText(this, "已保存", Toast.LENGTH_SHORT).show();
                } catch (Exception e) { Toast.makeText(this, "保存失败", Toast.LENGTH_SHORT).show(); }
            }
            pendingSave = null;
        }
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] results) {
        if (req == REQ_NOTIF) {
            String p = notifPermission();
            if (web != null) web.evaluateJavascript("window.__appNotifResult&&window.__appNotifResult('" + p + "')", null);
        }
    }

    String notifPermission() {
        NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 24 && !nm.areNotificationsEnabled()) {
            if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                    && !getSharedPreferences("shell", MODE_PRIVATE).getBoolean("notifAsked", false)) return "default";
            return "denied";
        }
        return "granted";
    }

    @Override
    protected void onDestroy() {
        fileGeneration++;
        finishFile(null);
        if(captureUri!=null){try{revokeUriPermission(captureUri,Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);PhotoProvider.file(this,captureUri).delete();}catch(Exception ignored){}captureUri=null;}
        if (tts != null) { tts.stop(); tts.shutdown(); }
        if (web != null) { web.destroy(); }
        PhotoProvider.clear(this);
        super.onDestroy();
    }

    void js(String code) { ui.post(() -> { if (web != null) web.evaluateJavascript(code, null); }); }

    // ---------- bridge ----------
    class Bridge {
        @JavascriptInterface public String info() { return "{\"v\":\"" + BuildConfig.VERSION_NAME + "\"}"; }

        @JavascriptInterface public void copy(String text) {
            ui.post(() -> {
                ClipboardManager cm = (ClipboardManager) getSystemService(CLIPBOARD_SERVICE);
                cm.setPrimaryClip(ClipData.newPlainText("text", text));
            });
        }

        @JavascriptInterface public void share(String title, String text, String url) {
            ui.post(() -> {
                StringBuilder b = new StringBuilder();
                if (text != null && !text.isEmpty()) b.append(text);
                if (url != null && !url.isEmpty()) { if (b.length() > 0) b.append('\n'); b.append(url); }
                Intent i = new Intent(Intent.ACTION_SEND);
                i.setType("text/plain");
                if (title != null && !title.isEmpty()) i.putExtra(Intent.EXTRA_SUBJECT, title);
                i.putExtra(Intent.EXTRA_TEXT, b.length() > 0 ? b.toString() : (title == null ? "" : title));
                try { startActivity(Intent.createChooser(i, "分享到")); } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface public void openUrl(String url) { ui.post(() -> openExternal(Uri.parse(url))); }

        @JavascriptInterface public void print(String title) {
            ui.post(() -> {
                try {
                    PrintManager pm = (PrintManager) getSystemService(PRINT_SERVICE);
                    String name = (title == null || title.isEmpty()) ? getString(R.string.app_name) : title;
                    if (web == null) return;
                    PrintDocumentAdapter a = web.createPrintDocumentAdapter(name);
                    pm.print(name, a, new PrintAttributes.Builder().build());
                } catch (Exception e) { Toast.makeText(MainActivity.this, "无法打印", Toast.LENGTH_SHORT).show(); }
            });
        }

        @JavascriptInterface public void saveFile(String name, String mime, String b64) {
            byte[] data;
            try { data = Base64.decode(b64, Base64.DEFAULT); } catch (Exception e) { return; }
            final String fname = (name == null || name.isEmpty()) ? "download" : name.replaceAll("[\\\\/:*?\"<>|]", "_");
            final String m = (mime == null || mime.isEmpty()) ? "application/octet-stream" : mime;
            ui.post(() -> {
                if (Build.VERSION.SDK_INT >= 29) {
                    try {
                        ContentValues cv = new ContentValues();
                        cv.put(MediaStore.Downloads.DISPLAY_NAME, fname);
                        cv.put(MediaStore.Downloads.MIME_TYPE, m);
                        cv.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/" + getString(R.string.app_name));
                        ContentResolver cr = getContentResolver();
                        Uri uri = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv);
                        try (OutputStream o = cr.openOutputStream(uri)) { o.write(data); }
                        Toast.makeText(MainActivity.this, "已保存到「下载/" + getString(R.string.app_name) + "」：" + fname, Toast.LENGTH_LONG).show();
                        return;
                    } catch (Exception ignored) {}
                }
                pendingSave = data;
                Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT);
                i.addCategory(Intent.CATEGORY_OPENABLE);
                i.setType(m);
                i.putExtra(Intent.EXTRA_TITLE, fname);
                try { startActivityForResult(i, REQ_SAVE); } catch (ActivityNotFoundException e) { pendingSave = null; Toast.makeText(MainActivity.this, "无法保存文件", Toast.LENGTH_SHORT).show(); }
            });
        }

        @JavascriptInterface public void setBarColor(String css) {
            ui.post(() -> {
                Integer c = parseCss(css);
                if (c == null || Color.alpha(c) < 200) return;
                barColor = c | 0xFF000000;
                root.setBackgroundColor(barColor);
                applyBarIcons();
            });
        }

        @JavascriptInterface public String notifPerm() { return notifPermission(); }

        @JavascriptInterface public void notifRequest() {
            ui.post(() -> {
                if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    getSharedPreferences("shell", MODE_PRIVATE).edit().putBoolean("notifAsked", true).apply();
                    requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF);
                } else {
                    js("window.__appNotifResult&&window.__appNotifResult('" + notifPermission() + "')");
                }
            });
        }

        @JavascriptInterface public void notify(String title, String body, String tag) {
            ui.post(() -> {
                try {
                    NotificationManager nm = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
                    if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
                        NotificationChannel ch = new NotificationChannel(CHANNEL, "提醒", NotificationManager.IMPORTANCE_DEFAULT);
                        nm.createNotificationChannel(ch);
                    }
                    Intent open = new Intent(MainActivity.this, MainActivity.class);
                    open.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                    PendingIntent pi = PendingIntent.getActivity(MainActivity.this, 0, open, PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
                    android.app.Notification.Builder b = Build.VERSION.SDK_INT >= 26
                            ? new android.app.Notification.Builder(MainActivity.this, CHANNEL)
                            : new android.app.Notification.Builder(MainActivity.this);
                    b.setSmallIcon(R.drawable.ic_stat).setContentTitle(title).setContentText(body)
                            .setStyle(new android.app.Notification.BigTextStyle().bigText(body))
                            .setAutoCancel(true).setContentIntent(pi).setColor(Color.parseColor(BuildConfig.ICON_COLOR));
                    int id = (tag != null && !tag.isEmpty()) ? tag.hashCode() : notifSeq++;
                    nm.notify(id, b.build());
                } catch (Exception ignored) {}
            });
        }

        @JavascriptInterface public void ttsSpeak(String id, String text, String lang, float rate, float pitch, float volume, boolean flush) {
            ui.post(() -> {
                if (tts == null) {
                    tts = new TextToSpeech(MainActivity.this, st -> {
                        ttsReady = st == TextToSpeech.SUCCESS;
                        if (ttsReady) {
                            tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                                @Override public void onStart(String u) { js("window.__appTts&&__appTts('" + u + "','start')"); }
                                @Override public void onDone(String u) { js("window.__appTts&&__appTts('" + u + "','end')"); }
                                @Override public void onError(String u) { js("window.__appTts&&__appTts('" + u + "','error')"); }
                                @Override public void onStop(String u, boolean interrupted) { js("window.__appTts&&__appTts('" + u + "','end')"); }
                            });
                            speakNow(id, text, lang, rate, pitch, volume, flush);
                        } else js("window.__appTts&&__appTts('" + id + "','error')");
                    });
                } else if (ttsReady) speakNow(id, text, lang, rate, pitch, volume, flush);
                else js("window.__appTts&&__appTts('" + id + "','error')");
            });
        }

        @JavascriptInterface public void ttsStop() { ui.post(() -> { if (tts != null) tts.stop(); }); }

        /* 流式 HTTP：供页面调用用户自己填写的在线 AI 接口，不受 WebView 跨域限制。结果分块回调 window.__appHttp(id, type, data)。 */
        @JavascriptInterface public void httpStream(String id, String url, String method, String headersJson, String body) {
            if (id == null || url == null || !(url.startsWith("https://") || url.startsWith("http://"))) { httpEmit(id, "error", "bad url"); return; }
            Thread t = new Thread(() -> {
                HttpURLConnection c = null;
                try {
                    c = (HttpURLConnection) new URL(url).openConnection();
                    httpConns.put(id, c);
                    c.setRequestMethod(method == null || method.isEmpty() ? "POST" : method);
                    c.setConnectTimeout(20000);
                    c.setReadTimeout(120000);
                    c.setUseCaches(false);
                    if (headersJson != null && !headersJson.isEmpty()) {
                        JSONObject h = new JSONObject(headersJson);
                        Iterator<String> it = h.keys();
                        while (it.hasNext()) { String k = it.next(); c.setRequestProperty(k, h.optString(k)); }
                    }
                    if (body != null && !"GET".equals(c.getRequestMethod())) {
                        c.setDoOutput(true);
                        byte[] b = body.getBytes(StandardCharsets.UTF_8);
                        c.setFixedLengthStreamingMode(b.length);
                        try (OutputStream os = c.getOutputStream()) { os.write(b); }
                    }
                    int code = c.getResponseCode();
                    httpEmit(id, "status", String.valueOf(code));
                    InputStream in = code >= 400 ? c.getErrorStream() : c.getInputStream();
                    if (in != null) {
                        try (InputStreamReader r = new InputStreamReader(in, StandardCharsets.UTF_8)) {
                            char[] buf = new char[2048]; int n;
                            while ((n = r.read(buf)) > 0) {
                                if (!httpConns.containsKey(id)) return;
                                httpEmit(id, "data", new String(buf, 0, n));
                            }
                        }
                    }
                    if (httpConns.containsKey(id)) httpEmit(id, "end", "");
                } catch (Exception e) {
                    if (httpConns.containsKey(id)) httpEmit(id, "error", e.getClass().getSimpleName());
                } finally {
                    httpConns.remove(id);
                    if (c != null) c.disconnect();
                }
            });
            t.setDaemon(true);
            t.start();
        }

        @JavascriptInterface public void httpAbort(String id) {
            HttpURLConnection c = id == null ? null : httpConns.remove(id);
            if (c != null) new Thread(c::disconnect).start();
        }
    }

    final ConcurrentHashMap<String, HttpURLConnection> httpConns = new ConcurrentHashMap<>();

    void httpEmit(String id, String type, String data) {
        final String js = "window.__appHttp&&window.__appHttp(" + JSONObject.quote(id == null ? "" : id) + "," + JSONObject.quote(type) + "," + JSONObject.quote(data == null ? "" : data) + ")";
        ui.post(() -> { if (web != null) web.evaluateJavascript(js, null); });
    }

    void speakNow(String id, String text, String lang, float rate, float pitch, float volume, boolean flush) {
        try {
            if (lang != null && !lang.isEmpty()) {
                Locale loc = Locale.forLanguageTag(lang.replace('_', '-'));
                int r = tts.isLanguageAvailable(loc);
                if (r >= TextToSpeech.LANG_AVAILABLE) tts.setLanguage(loc);
            }
            tts.setSpeechRate(rate > 0 ? rate : 1f);
            tts.setPitch(pitch > 0 ? pitch : 1f);
            Bundle p = new Bundle();
            p.putFloat(TextToSpeech.Engine.KEY_PARAM_VOLUME, volume >= 0 && volume <= 1 ? volume : 1f);
            tts.speak(text, flush ? TextToSpeech.QUEUE_FLUSH : TextToSpeech.QUEUE_ADD, p, id);
        } catch (Exception e) { js("window.__appTts&&__appTts('" + id + "','error')"); }
    }

    static Integer parseCss(String css) {
        if (css == null) return null;
        css = css.trim();
        try {
            if (css.startsWith("#")) {
                String h = css.substring(1);
                if (h.length() == 3) h = "" + h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
                if (h.length() == 6) return 0xFF000000 | Integer.parseInt(h, 16);
                return null;
            }
            if (css.startsWith("rgb")) {
                String inner = css.substring(css.indexOf('(') + 1, css.indexOf(')'));
                String[] p = inner.split("[,\\s/]+");
                int r = Math.round(Float.parseFloat(p[0])), g = Math.round(Float.parseFloat(p[1])), b = Math.round(Float.parseFloat(p[2]));
                int a = 255;
                if (p.length > 3) { float af = Float.parseFloat(p[3].replace("%", "")); a = Math.round(p[3].endsWith("%") ? af * 2.55f : af * 255); }
                return Color.argb(a, r, g, b);
            }
        } catch (Exception ignored) {}
        return null;
    }
}

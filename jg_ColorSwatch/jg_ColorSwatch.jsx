// jg_ColorSwatch — color swatch panel for After Effects
//
// Changelog
//   0.91 Restored the small "vX.YZ" label in the toolbar (right of ⚙) so the
//        installed version is visible at a glance again. Settings menu now
//        has an explicit "Close" button (Esc still works too).
//   0.9  Pre-release versioning kicks in (the dev cycle so far counted as
//        4.0–4.3). Adds an update-check that compares SCRIPT_VERSION with
//        the manifest published in
//        github.com/javigildd/scripts_doc/jg_ColorSwatch/version.json:
//        a small banner appears in-panel when a newer version is out, and
//        Settings ▸ Check for updates forces the network check on demand.
//        File renamed jg_ColorSwatch_v4.jsx → jg_ColorSwatch.jsx in both
//        the aescripts archive and the public scripts_doc repo.
//   4.3  Settings menu groups Import / Export / Help / License under a single
//        ⚙ button on the right of the toolbar (text labels, no icons inside
//        the menu). Group-level ⚙ → ✎ (it edits the group, not app settings).
//        Cards view columns now adapt to panel width too.
//   4.2  Slimmer toolbar so the panel can be narrowed enough to actually see
//        the column wrap kick in: dropped "View:" label and version label
//        from the toolbar, "Min" → "▭", "Names" → "Aa", "Add Multiple
//        Colors" → "Add Multiple", and minimumSize=[0,0] on action controls
//        so they clip instead of forcing the panel wider.
//   4.1  Swatch grid wraps to more rows when the panel is narrowed (dynamic
//        columns) so swatches never get clipped off-screen.
//   4.0  Initial v4: setVisible() helper, persisted last group, Esc closes
//        detail / minimal mode, cleaner Add-Multiple closures, LemonSqueezy
//        license gate (7-day offline grace).
(function jg_ColorSwatch(thisObj) {

    // ============================================================
    // CONSTANTS & CONFIGURATION
    // ============================================================
    var SCRIPT_NAME      = "JG_ColorSwatch";   // unchanged → preserves v3 settings
    var SCRIPT_VERSION   = "0.91";
    var SAVE_KEY         = "UserColorGroups";
    var LAST_GROUP_KEY   = "LastGroup";
    var LICENSE_KEY_S    = "License";
    var VIEW_MODES       = ["Swatches", "Cards", "List"];
    var VIEW_ICONS       = { "Cards": "⬚", "Swatches": "⊞", "List": "≡" };
    var SWATCHES_PER_ROW = 6;
    var MAX_SWATCHES     = 36;
    var DBLCLICK_MS      = 250;
    var isMac            = $.os.indexOf("Mac") !== -1;

    // Licensing (LemonSqueezy)
    var LS_API              = "https://api.lemonsqueezy.com/v1/licenses";
    var EXPECTED_STORE_ID   = 356952;
    var EXPECTED_PRODUCT_ID = 1008227;
    var BUY_URL             = "https://javigildd.com";
    var GRACE_MS            = 7 * 24 * 3600 * 1000; // offline grace window
    var REVALIDATE_MS       = 24 * 3600 * 1000;     // skip online check if last was within 24h
    var CURL_TIMEOUT_S      = 6;                    // per-request timeout

    // Update check (public manifest in scripts_doc)
    var UPDATE_VERSION_URL    = "https://raw.githubusercontent.com/javigildd/scripts_doc/main/jg_ColorSwatch/version.json";
    var UPDATE_DOWNLOAD_URL   = "https://github.com/javigildd/scripts_doc/tree/main/jg_ColorSwatch";
    var UPDATE_CHECK_INTERVAL = 24 * 3600 * 1000;   // re-check at most once per day in background
    var UPDATE_LAST_CHECK_K   = "UpdateLastCheck";
    var UPDATE_REMOTE_VER_K   = "UpdateRemoteVersion";
    var UPDATE_DISMISSED_K    = "UpdateDismissedFor"; // last version the user dismissed

    // ============================================================
    // STATE
    // ============================================================
    var currentView         = "Swatches";
    var isReorderMode       = false;
    var showNames           = false;
    var minimalSmall        = false;
    var isDetailView        = false;
    var currentDetailSwatch = null;
    var isMinimalMode       = false;
    var groups              = loadGroups();
    var currentGroup;        // initialised in buildUI
    var swatchGroup, win, minimalGroupLabel, controlPanel, buttonGroup, minimalHeader, scrollPanel;
    var updateBanner, updateBannerText;

    // ============================================================
    // UTILITIES
    // ============================================================
    function getKeys(obj) {
        var keys = [];
        for (var key in obj) if (obj.hasOwnProperty(key)) keys.push(key);
        return keys;
    }

    function pad(n) { return n < 10 ? "0" + n : "" + n; }

    function hexToRGBArray(hex) {
        var r = parseInt(hex.substr(1, 2), 16) / 255;
        var g = parseInt(hex.substr(3, 2), 16) / 255;
        var b = parseInt(hex.substr(5, 2), 16) / 255;
        return [Number(r) || 0, Number(g) || 0, Number(b) || 0];
    }

    function rgbToHex(r, g, b) {
        function toHex(c) {
            c = Math.min(Math.max(0, Number(c)), 1);
            var h = Math.round(c * 255).toString(16).toUpperCase();
            return h.length === 1 ? "0" + h : h;
        }
        return "#" + toHex(r) + toHex(g) + toHex(b);
    }

    function formatDate(date) {
        var d = date || new Date();
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) +
               " " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    }

    // Show or fully collapse a UI element so it occupies zero space when hidden.
    function setVisible(el, visible) {
        if (!el) return;
        el.visible     = visible;
        el.size        = visible ? [-1, -1]      : [0, 0];
        el.maximumSize = visible ? [65535, 65535] : [0, 0];
    }

    // Returns how many swatch columns fit in the current panel width.
    // Caps at SWATCHES_PER_ROW; minimum 1 so swatches never disappear.
    //
    // Reads width from the most stable container available — docked Panels in
    // AE sometimes report odd values for `win.size`, so we try the swatch
    // viewport first, fall back to the window, and consult both `size` and
    // `bounds` (different ScriptUI builds expose different ones reliably).
    function readWidth(el) {
        if (!el) return 0;
        try {
            if (el.size) {
                var s0 = el.size[0];
                if (typeof s0 === "number" && s0 > 0) return s0;
                if (typeof el.size.width === "number" && el.size.width > 0) return el.size.width;
            }
        } catch (e) {}
        try {
            if (el.bounds) {
                if (typeof el.bounds.width === "number" && el.bounds.width > 0) return el.bounds.width;
                var b0 = el.bounds[0], b2 = el.bounds[2];
                if (typeof b0 === "number" && typeof b2 === "number" && (b2 - b0) > 0) return b2 - b0;
            }
        } catch (e) {}
        return 0;
    }

    function computeSwatchCols(sqSize, spacing) {
        var w = 0;
        // Prefer the swatch viewport — its width directly bounds the swatches.
        var sw = readWidth(scrollPanel);
        if (sw > 10) {
            w = sw - 8;                                    // panel internal padding
        } else {
            var ww = readWidth(win);
            if (ww > 10) {
                w = ww - (isMinimalMode ? 4 : (isMac ? 28 : 24));
            }
        }
        // If we genuinely can't measure (pre-show), fall back to the historic 6.
        // If the panel is measurable but tiny, force 1 col so swatches stack.
        if (w <= 0)        return SWATCHES_PER_ROW;
        if (w < sqSize)    return 1;
        var fit = Math.floor((w + spacing) / (sqSize + spacing));
        return Math.max(1, Math.min(SWATCHES_PER_ROW, fit));
    }

    // Same idea as computeSwatchCols, but for Cards view (different cell width
    // and a different default column cap).
    function computeColsForCardSize(cellSize, spacing, maxCols) {
        var w  = readWidth(scrollPanel);
        if (w > 10) w -= 8;
        else {
            w = readWidth(win);
            if (w > 10) w -= (isMinimalMode ? 4 : (isMac ? 28 : 24));
            else        return maxCols;  // can't measure → keep the default
        }
        if (w < cellSize) return 1;
        var fit = Math.floor((w + spacing) / (cellSize + spacing));
        return Math.max(1, Math.min(maxCols, fit));
    }

    // ============================================================
    // PERSISTENCE
    // ============================================================
    function loadGroups() {
        try {
            if (app.settings.haveSetting(SCRIPT_NAME, SAVE_KEY)) {
                return JSON.parse(app.settings.getSetting(SCRIPT_NAME, SAVE_KEY));
            }
        } catch (e) {}
        return getDefaultGroups();
    }

    function getDefaultGroups() {
        return {
            "Default": [
                { hex: "#1A73E8", name: "Google Blue" },
                { hex: "#FF5252", name: "Error Red"   },
                { hex: "#00C853", name: "Success Green" }
            ]
        };
    }

    function saveGroups(g) {
        try { app.settings.saveSetting(SCRIPT_NAME, SAVE_KEY, JSON.stringify(g)); }
        catch (e) { alert("Error saving settings: " + e.toString()); }
    }

    function loadLastGroup() {
        try {
            if (app.settings.haveSetting(SCRIPT_NAME, LAST_GROUP_KEY)) {
                return app.settings.getSetting(SCRIPT_NAME, LAST_GROUP_KEY);
            }
        } catch (e) {}
        return null;
    }

    function saveLastGroup(name) {
        try { app.settings.saveSetting(SCRIPT_NAME, LAST_GROUP_KEY, name); }
        catch (e) {}
    }

    // ============================================================
    // LICENSING  (LemonSqueezy)
    //
    // Flow:
    //   1. On boot, load cached license from app.settings.
    //   2. If no license → show activation dialog (blocking).
    //   3. If license is fresh (< 24h since last validation) → trust it.
    //   4. Otherwise call /v1/licenses/validate via curl.
    //      • Server says valid + matching product → update timestamps, proceed.
    //      • Server says invalid → re-prompt activation.
    //      • Network error → honor 7-day offline grace.
    //   5. License is locked to (store_id, product_id) so keys from any other
    //      LemonSqueezy product on the same store cannot activate this panel.
    // ============================================================
    var _license = null;

    function loadLicense() {
        try {
            if (app.settings.haveSetting(SCRIPT_NAME, LICENSE_KEY_S)) {
                var raw = app.settings.getSetting(SCRIPT_NAME, LICENSE_KEY_S);
                if (raw) _license = JSON.parse(raw);
            }
        } catch (e) { _license = null; }
        return _license;
    }

    function saveLicense(lic) {
        _license = lic;
        try {
            app.settings.saveSetting(SCRIPT_NAME, LICENSE_KEY_S, lic ? JSON.stringify(lic) : "");
        } catch (e) {}
    }

    function isLicenseForThisProduct(resp) {
        if (!resp || !resp.meta) return false;
        // Loose comparison — LS returns numbers, but be defensive.
        return resp.meta.store_id   == EXPECTED_STORE_ID
            && resp.meta.product_id == EXPECTED_PRODUCT_ID;
    }

    function getHostname() {
        try {
            var h = system.callSystem(isMac ? "/bin/hostname" : "hostname");
            if (h) {
                h = h.replace(/^\s+|\s+$/g, "");
                if (h) return h;
            }
        } catch (e) {}
        return "Unknown Host";
    }

    function lsFormBody(obj) {
        var parts = [];
        for (var k in obj) {
            if (obj.hasOwnProperty(k)) {
                parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(obj[k]));
            }
        }
        return parts.join("&");
    }

    // POST to LemonSqueezy via curl. Returns parsed JSON or null on any failure.
    // Body is written to a temp file to dodge shell-escaping issues entirely.
    function httpsPostLS(endpoint, body) {
        var bodyStr  = lsFormBody(body);
        var stamp    = new Date().getTime() + "_" + Math.floor(Math.random() * 1e6);
        var bodyFile = new File(Folder.temp.fsName + "/jg_cs_lic_" + stamp + ".txt");
        if (!bodyFile.open("w")) return null;
        bodyFile.encoding = "UTF-8";
        bodyFile.write(bodyStr);
        bodyFile.close();

        var url   = LS_API + "/" + endpoint;
        var quoUrl = JSON.stringify(url);          // produces "..." with safe escaping
        var quoBody = JSON.stringify("@" + bodyFile.fsName);
        var cmd;
        if (isMac) {
            cmd = "/usr/bin/curl -s --max-time " + CURL_TIMEOUT_S +
                  " -X POST " + quoUrl +
                  " -H 'Accept: application/json'" +
                  " -H 'Content-Type: application/x-www-form-urlencoded'" +
                  " --data " + quoBody;
        } else {
            cmd = 'curl.exe -s --max-time ' + CURL_TIMEOUT_S +
                  ' -X POST ' + quoUrl +
                  ' -H "Accept: application/json"' +
                  ' -H "Content-Type: application/x-www-form-urlencoded"' +
                  ' --data ' + quoBody;
        }

        var raw;
        try { raw = system.callSystem(cmd); }
        catch (e) { raw = null; }
        try { bodyFile.remove(); } catch (e) {}

        if (!raw) return null;
        try { return JSON.parse(raw); }
        catch (e) { return null; }
    }

    function lsActivate(key)              { return httpsPostLS("activate",   { license_key: key, instance_name: getHostname() }); }
    function lsValidate(key, instanceId)  { return httpsPostLS("validate",   { license_key: key, instance_id: instanceId }); }
    function lsDeactivate(key, instanceId){ return httpsPostLS("deactivate", { license_key: key, instance_id: instanceId }); }

    function maskKey(k) {
        if (!k) return "";
        var s = String(k);
        if (s.length < 12) return s;
        return s.substring(0, 4) + "-****-****-" + s.substring(s.length - 4);
    }

    // Resolves the current license. Does an online check only if the cached
    // result is stale; otherwise trusts the cache. Returns one of:
    //   { status: "missing" }
    //   { status: "valid",   license: lic }
    //   { status: "invalid", license: lic }   ← server said no, OR offline > grace
    function checkLicense() {
        var lic = loadLicense();
        if (!lic || !lic.key || !lic.instanceId) return { status: "missing" };

        var now       = new Date().getTime();
        var sinceLast = now - (lic.lastValidatedAt || 0);

        if (lic.lastValid && sinceLast < REVALIDATE_MS) {
            return { status: "valid", license: lic };
        }

        var resp = lsValidate(lic.key, lic.instanceId);

        if (resp && resp.valid && isLicenseForThisProduct(resp)) {
            lic.lastValidatedAt = now;
            lic.lastValid       = true;
            if (resp.license_key && resp.license_key.expires_at) {
                lic.expiresAt = new Date(resp.license_key.expires_at).getTime();
            }
            saveLicense(lic);
            return { status: "valid", license: lic };
        }

        // Server returned a definitive "no" → invalidate immediately.
        if (resp && (resp.valid === false || resp.error)) {
            lic.lastValid = false;
            saveLicense(lic);
            return { status: "invalid", license: lic };
        }

        // Network error → honor offline grace.
        if (lic.lastValid && sinceLast < GRACE_MS) {
            return { status: "valid", license: lic };
        }

        lic.lastValid = false;
        saveLicense(lic);
        return { status: "invalid", license: lic };
    }

    function openBuyURL() {
        try {
            if (isMac) system.callSystem("open " + JSON.stringify(BUY_URL));
            else       system.callSystem('cmd /c start "" ' + JSON.stringify(BUY_URL));
        } catch (e) {}
    }

    // Modal activation dialog. Returns true iff a valid license was activated.
    function showActivationDialog(reason) {
        var dlg = new Window("dialog", "jg_ColorSwatch — Activate");
        dlg.orientation   = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.spacing       = 10;
        dlg.margins       = 18;

        var heading = dlg.add("statictext", undefined,
            reason === "expired" ? "Your license is no longer valid"
                                 : "Welcome to jg_ColorSwatch");
        heading.graphics.font = ScriptUI.newFont("Arial", "BOLD", 14);

        var sub = dlg.add("statictext", undefined,
            reason === "expired"
                ? "Re-enter your license key to keep using the panel."
                : "Enter your license key to unlock the panel.",
            { multiline: true });
        sub.preferredSize.width = 360;

        var keyRow = dlg.add("group");
        keyRow.orientation   = "row";
        keyRow.alignChildren = ["fill", "center"];
        keyRow.spacing       = 6;
        keyRow.add("statictext", undefined, "Key:");
        var keyInput = keyRow.add("edittext", undefined, "");
        keyInput.characters = 36;
        keyInput.alignment  = ["fill", "center"];

        var errTxt = dlg.add("statictext", undefined, "", { multiline: true });
        errTxt.preferredSize.width = 360;
        errTxt.graphics.foregroundColor = errTxt.graphics.newPen(
            errTxt.graphics.PenType.SOLID_COLOR, [0.85, 0.30, 0.30], 1);
        errTxt.visible = false;

        var btnRow = dlg.add("group");
        btnRow.orientation   = "row";
        btnRow.alignChildren = ["fill", "center"];
        btnRow.spacing       = 8;
        var buyBtn      = btnRow.add("button", undefined, "Buy a license");
        var spacer      = btnRow.add("group");
        spacer.alignment = ["fill", "fill"];
        var cancelBtn   = btnRow.add("button", undefined, "Cancel", { name: "cancel" });
        var activateBtn = btnRow.add("button", undefined, "Activate", { name: "ok" });

        var success = false;

        function setError(msg) {
            if (!msg) { errTxt.visible = false; errTxt.text = ""; }
            else      { errTxt.visible = true;  errTxt.text = msg; }
            dlg.layout.layout(true);
        }

        function setBusy(busy) {
            activateBtn.enabled = !busy;
            cancelBtn.enabled   = !busy;
            buyBtn.enabled      = !busy;
            keyInput.enabled    = !busy;
            activateBtn.text    = busy ? "Activating…" : "Activate";
            dlg.update();
        }

        activateBtn.onClick = function() {
            var key = (keyInput.text || "").replace(/^\s+|\s+$/g, "");
            if (!key) { setError("Please enter a license key."); return; }
            setError("");
            setBusy(true);

            var resp = lsActivate(key);

            if (!resp) {
                setBusy(false);
                setError("Could not reach the license server. Check your connection and try again.");
                return;
            }
            if (!resp.activated || !resp.instance) {
                setBusy(false);
                setError(resp.error || "Invalid license key.");
                return;
            }
            // Verify product/store match — LS validates keys globally across the store.
            if (!isLicenseForThisProduct(resp)) {
                if (resp.instance && resp.instance.id) {
                    try { lsDeactivate(key, resp.instance.id); } catch (e) {}
                }
                setBusy(false);
                setError("This license key is not valid for jg_ColorSwatch.");
                return;
            }

            var lk  = resp.license_key || {};
            var now = new Date().getTime();
            var lic = {
                key:             key,
                instanceId:      resp.instance.id,
                instanceName:    resp.instance.name || getHostname(),
                activatedAt:     now,
                lastValidatedAt: now,
                lastValid:       true,
                expiresAt:       lk.expires_at ? new Date(lk.expires_at).getTime() : null,
                customerEmail:   (resp.meta && resp.meta.customer_email) || null,
                productName:     lk.product_name || (resp.meta && resp.meta.product_name) || null
            };
            saveLicense(lic);
            success = true;
            dlg.close();
        };

        cancelBtn.onClick = function() { dlg.close(); };
        buyBtn.onClick    = function() { openBuyURL(); };

        keyInput.addEventListener("keydown", function(k) {
            if (k.keyName === "Enter" || k.keyName === "Return") activateBtn.notify("onClick");
        });

        dlg.show();
        return success;
    }

    function showLicenseInfoDialog() {
        var lic = _license || loadLicense();
        var dlg = new Window("dialog", "License");
        dlg.orientation   = "column";
        dlg.alignChildren = ["fill", "top"];
        dlg.spacing       = 8;
        dlg.margins       = 18;

        if (!lic || !lic.key) {
            dlg.add("statictext", undefined, "No license activated.");
            var btnGrp = dlg.add("group");
            btnGrp.alignment   = ["fill", "top"];
            btnGrp.alignChildren = ["right", "center"];
            btnGrp.add("button", undefined, "Close", { name: "ok" });
            dlg.show();
            return;
        }

        var statusLine = dlg.add("statictext", undefined,
            "Status: " + (lic.lastValid ? "Active" : "Expired"));
        statusLine.graphics.font = ScriptUI.newFont("Arial", "BOLD", 11);

        dlg.add("statictext", undefined, "Key: " + maskKey(lic.key));
        if (lic.customerEmail) dlg.add("statictext", undefined, "Email: " + lic.customerEmail);
        if (lic.expiresAt)     dlg.add("statictext", undefined, "Expires: " + formatDate(new Date(lic.expiresAt)));
        if (lic.lastValidatedAt) dlg.add("statictext", undefined, "Last checked: " + formatDate(new Date(lic.lastValidatedAt)));
        dlg.add("statictext", undefined, "Device: " + (lic.instanceName || "Unknown"));

        var btnGrp = dlg.add("group");
        btnGrp.alignment     = ["fill", "top"];
        btnGrp.alignChildren = ["fill", "center"];
        btnGrp.spacing       = 8;
        var deactivateBtn = btnGrp.add("button", undefined, "Deactivate this device");
        var sp = btnGrp.add("group"); sp.alignment = ["fill", "fill"];
        btnGrp.add("button", undefined, "Close", { name: "ok" });

        deactivateBtn.onClick = function() {
            if (!confirm("Deactivate this device?\n\nThe panel will lock until you re-enter a license key.")) return;
            try { lsDeactivate(lic.key, lic.instanceId); } catch (e) {}
            saveLicense(null);
            dlg.close();
            alert("License deactivated.\nThe panel will lock now. Use the Activate dialog to enter a new key.");
            // Best effort: re-prompt immediately. Caller can decide what to do next.
            if (showActivationDialog("expired")) {
                // Re-activated — keep panel running.
            }
        };

        dlg.show();
    }

    // Boot gate. Returns true if licensed (UI should be built); false otherwise.
    function gateOnLicense() {
        var status = checkLicense().status;
        if (status === "valid") return true;
        if (showActivationDialog(status === "invalid" ? "expired" : "first")) return true;
        return false;
    }

    // ============================================================
    // UPDATE CHECK  (against version.json in scripts_doc)
    //
    // Compares SCRIPT_VERSION to the version published in the public
    // scripts_doc repo. On boot, runs at most once a day (cached in
    // app.settings). The Settings menu also exposes a manual "Check for
    // updates" that ignores the cache.
    //
    // version.json shape: { "version": "1.0", "released": "...",
    //                       "url": "...", "notes": "..." }
    // ============================================================
    function compareVersions(a, b) {
        var aP = String(a || "0").split(".");
        var bP = String(b || "0").split(".");
        var n  = Math.max(aP.length, bP.length);
        for (var i = 0; i < n; i++) {
            var x = parseInt(aP[i], 10) || 0;
            var y = parseInt(bP[i], 10) || 0;
            if (x > y) return 1;
            if (x < y) return -1;
        }
        return 0;
    }

    function fetchRemoteVersionJSON() {
        var quoUrl = JSON.stringify(UPDATE_VERSION_URL);
        var cmd;
        if (isMac) {
            cmd = "/usr/bin/curl -s --max-time " + CURL_TIMEOUT_S + " -L " + quoUrl;
        } else {
            cmd = 'curl.exe -s --max-time ' + CURL_TIMEOUT_S + ' -L ' + quoUrl;
        }
        var raw;
        try { raw = system.callSystem(cmd); }
        catch (e) { return null; }
        if (!raw) return null;
        try { return JSON.parse(raw); }
        catch (e) { return null; }
    }

    // Returns the remote version string when an update is available,
    // null when up-to-date or check failed.
    //   force = true → bypass cache and hit the network now.
    function checkForUpdates(force) {
        var now       = new Date().getTime();
        var lastCheck = 0;
        try {
            if (app.settings.haveSetting(SCRIPT_NAME, UPDATE_LAST_CHECK_K)) {
                lastCheck = parseInt(app.settings.getSetting(SCRIPT_NAME, UPDATE_LAST_CHECK_K), 10) || 0;
            }
        } catch (e) {}

        var remoteVersion = null;
        if (!force && (now - lastCheck) < UPDATE_CHECK_INTERVAL) {
            try {
                if (app.settings.haveSetting(SCRIPT_NAME, UPDATE_REMOTE_VER_K)) {
                    remoteVersion = app.settings.getSetting(SCRIPT_NAME, UPDATE_REMOTE_VER_K) || null;
                }
            } catch (e) {}
        } else {
            var data = fetchRemoteVersionJSON();
            if (data && data.version) {
                remoteVersion = String(data.version);
                try {
                    app.settings.saveSetting(SCRIPT_NAME, UPDATE_LAST_CHECK_K, String(now));
                    app.settings.saveSetting(SCRIPT_NAME, UPDATE_REMOTE_VER_K, remoteVersion);
                } catch (e) {}
            } else if (force) {
                return null;  // explicit failure (no cached fallback wanted)
            } else {
                // Network failed silently on background check: fall through to cached
                try {
                    if (app.settings.haveSetting(SCRIPT_NAME, UPDATE_REMOTE_VER_K)) {
                        remoteVersion = app.settings.getSetting(SCRIPT_NAME, UPDATE_REMOTE_VER_K) || null;
                    }
                } catch (e) {}
            }
        }

        if (!remoteVersion) return null;
        return compareVersions(remoteVersion, SCRIPT_VERSION) > 0 ? remoteVersion : null;
    }

    function getDismissedUpdateVersion() {
        try {
            if (app.settings.haveSetting(SCRIPT_NAME, UPDATE_DISMISSED_K)) {
                return app.settings.getSetting(SCRIPT_NAME, UPDATE_DISMISSED_K);
            }
        } catch (e) {}
        return null;
    }

    function setDismissedUpdateVersion(v) {
        try { app.settings.saveSetting(SCRIPT_NAME, UPDATE_DISMISSED_K, v || ""); }
        catch (e) {}
    }

    function openUpdateURL() {
        try {
            if (isMac) system.callSystem("open " + JSON.stringify(UPDATE_DOWNLOAD_URL));
            else       system.callSystem('cmd /c start "" ' + JSON.stringify(UPDATE_DOWNLOAD_URL));
        } catch (e) {}
    }

    // Make the in-panel banner visible with the right text. The banner UI
    // itself is built in buildUI; this just toggles + populates it.
    function showUpdateBanner(remoteVersion) {
        if (!updateBanner || !updateBannerText) return;
        updateBanner._advertisedVersion = remoteVersion;
        updateBannerText.text = "v" + remoteVersion + " is available · you have v" + SCRIPT_VERSION;
        setVisible(updateBanner, true);
        try { win.layout.layout(true); } catch (e) {}
    }

    // Background check on boot: silent unless there's a new version that the
    // user hasn't already dismissed.
    function maybeShowUpdateBanner() {
        var newer = checkForUpdates(false);
        if (!newer) return;
        if (getDismissedUpdateVersion() === newer) return;
        showUpdateBanner(newer);
    }

    // Manual "Check for updates" — always hits the network, shows a dialog.
    function manualCheckForUpdates() {
        var newer = checkForUpdates(true);
        if (newer === null) {
            // Either up-to-date or network failure.
            // Distinguish: if we got a cached/fresh remote that's <= current, "up to date".
            // checkForUpdates returns null in both cases when force=true (failure).
            // Re-fetch raw to give a precise message:
            var data = fetchRemoteVersionJSON();
            if (!data || !data.version) {
                alert("Couldn't reach the update server. Check your connection and try again.");
                return;
            }
            if (compareVersions(data.version, SCRIPT_VERSION) <= 0) {
                alert("You're on the latest version (v" + SCRIPT_VERSION + ").");
            } else {
                // Should not happen, but be safe.
                showUpdateBanner(String(data.version));
                alert("Update available: v" + data.version + ".");
            }
            return;
        }
        // newer is a version string > current
        setDismissedUpdateVersion("");  // re-allow banner for this version
        showUpdateBanner(newer);
        alert("Update available: v" + newer + " (you have v" + SCRIPT_VERSION + ").");
    }

    // ============================================================
    // COLOR PICKER  — single unified helper
    // ============================================================
    function openColorPicker(startColor) {
        var crntComp        = null;
        var tempSolid       = null;
        var tempCompCreated = false;
        try {
            crntComp = app.project.activeItem;
            if (!crntComp || !(crntComp instanceof CompItem)) {
                crntComp        = app.project.items.addComp("__ColorPicker", 100, 100, 1, 1, 24);
                tempCompCreated = true;
            }
            tempSolid  = crntComp.layers.addSolid([1, 1, 1], "Color Picker", 100, 100, 1);
            var effect = tempSolid.property("ADBE Effect Parade").addProperty("ADBE Color Control");
            var cprop  = effect.property("ADBE Color Control-0001");
            if (startColor && startColor.length >= 3) cprop.setValue(startColor);
            try { app.activeViewer.setActive(); } catch (e) {}
            tempSolid.selected = true;
            cprop.selected     = true;
            app.executeCommand(2240);
            var v      = cprop.value;
            var result = [Number(v[0]), Number(v[1]), Number(v[2])];
            tempSolid.remove();
            if (tempCompCreated) crntComp.remove();
            return isNaN(result[0]) ? null : result;
        } catch (e) {
            try { if (tempSolid) tempSolid.remove(); } catch (e2) {}
            try { if (tempCompCreated && crntComp) crntComp.remove(); } catch (e2) {}
            alert("Color picker error: " + e.toString());
            return null;
        }
    }

    // ============================================================
    // SHAPE LAYER OPERATIONS
    // ============================================================
    function applyColorToShapeContents(propGroup, rgb) {
        for (var i = 1; i <= propGroup.numProperties; i++) {
            try {
                var prop = propGroup.property(i);
                if (prop.matchName === "ADBE Vector Graphic - Fill") {
                    prop.property("ADBE Vector Fill Color").setValue([rgb[0], rgb[1], rgb[2], 1]);
                } else if (prop.matchName === "ADBE Vector Group") {
                    applyColorToShapeContents(prop.property("ADBE Vectors Group"), rgb);
                }
            } catch (e) {}
        }
    }

    function hasMatchingStroke(propGroup, rgb) {
        for (var i = 1; i <= propGroup.numProperties; i++) {
            try {
                var prop = propGroup.property(i);
                if (prop.matchName === "ADBE Vector Graphic - Stroke") {
                    if (prop.enabled) {
                        var c = prop.property("ADBE Vector Stroke Color").value;
                        if (Math.abs(c[0] - rgb[0]) < 0.01 &&
                            Math.abs(c[1] - rgb[1]) < 0.01 &&
                            Math.abs(c[2] - rgb[2]) < 0.01) return true;
                    }
                } else if (prop.matchName === "ADBE Vector Group") {
                    if (hasMatchingStroke(prop.property("ADBE Vectors Group"), rgb)) return true;
                }
            } catch (e) {}
        }
        return false;
    }

    function applyStrokeColorToShapeContents(propGroup, rgb, makeNone) {
        for (var i = 1; i <= propGroup.numProperties; i++) {
            try {
                var prop = propGroup.property(i);
                if (prop.matchName === "ADBE Vector Graphic - Stroke") {
                    if (makeNone) {
                        prop.enabled = false;
                    } else {
                        prop.enabled = true;
                        prop.property("ADBE Vector Stroke Color").setValue([rgb[0], rgb[1], rgb[2], 1]);
                    }
                } else if (prop.matchName === "ADBE Vector Group") {
                    applyStrokeColorToShapeContents(prop.property("ADBE Vectors Group"), rgb, makeNone);
                }
            } catch (e) {}
        }
    }

    function applyColorToSelectedShapeLayer(hex) {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) return;
            var sel = comp.selectedLayers;
            if (!sel || sel.length === 0) return;
            var rgb     = hexToRGBArray(hex);
            var applied = false;
            for (var i = 0; i < sel.length; i++) {
                if (sel[i] instanceof ShapeLayer) {
                    if (!applied) { app.beginUndoGroup("Apply Fill to Shape Layer"); applied = true; }
                    try { applyColorToShapeContents(sel[i].property("ADBE Root Vectors Group"), rgb); } catch (e) {}
                }
            }
            if (applied) app.endUndoGroup();
        } catch (e) {}
    }

    function applyStrokeColorToSelectedShapeLayer(hex) {
        try {
            var comp = app.project.activeItem;
            if (!comp || !(comp instanceof CompItem)) return false;
            var sel = comp.selectedLayers;
            if (!sel || sel.length === 0) return false;
            var rgb     = hexToRGBArray(hex);
            var applied = false;
            for (var i = 0; i < sel.length; i++) {
                if (sel[i] instanceof ShapeLayer) {
                    if (!applied) { app.beginUndoGroup("Toggle Stroke Color"); applied = true; }
                    try {
                        var contents = sel[i].property("ADBE Root Vectors Group");
                        applyStrokeColorToShapeContents(contents, rgb, hasMatchingStroke(contents, rgb));
                    } catch (e) {}
                }
            }
            if (applied) app.endUndoGroup();
            return applied;
        } catch (e) { return false; }
    }

    // ============================================================
    // SWATCH CLICK HANDLERS
    // ============================================================
    function addSwatchHandlers(element, hex, name, index) {
        var clickTime  = 0;
        var clickCount = 0;
        element.addEventListener("mousedown", function() {
            var now    = new Date().getTime();
            clickCount = (now - clickTime < DBLCLICK_MS) ? clickCount + 1 : 1;
            clickTime  = now;

            if (clickCount === 2) {
                showDetailedSwatch(hex, name, index);
                clickCount = 0;
                return;
            }

            var kb = ScriptUI.environment.keyboardState;
            if (kb.shiftKey) {
                if (!applyStrokeColorToSelectedShapeLayer(hex)) {
                    var comp = app.project.activeItem;
                    if (comp && comp instanceof CompItem) {
                        app.beginUndoGroup("Add Solid");
                        comp.layers.addSolid(hexToRGBArray(hex), name || hex, comp.width, comp.height, comp.pixelAspect);
                        app.endUndoGroup();
                    } else {
                        alert("Please open a composition.");
                    }
                }
            } else if (kb.ctrlKey) {
                editSwatch(index);
            } else if (kb.altKey) {
                deleteSwatch(index);
            } else {
                applyColorToSelectedShapeLayer(hex);
            }
        });
    }

    function deleteSwatch(index) {
        if (confirm("Delete swatch?")) {
            groups[currentGroup].splice(index, 1);
            saveGroups(groups);
            refreshSwatches();
        }
    }

    function moveSwatch(fromIdx, toIdx) {
        var sw = groups[currentGroup];
        if (toIdx < 0 || toIdx >= sw.length) return;
        var moved = sw.splice(fromIdx, 1)[0];
        sw.splice(toIdx, 0, moved);
        saveGroups(groups);
        refreshSwatches();
    }

    function showDetailedSwatch(hex, name, index) {
        isDetailView        = true;
        currentDetailSwatch = { hex: hex, name: name, index: index };
        refreshSwatches();
    }

    function exitDetailView() {
        isDetailView        = false;
        currentDetailSwatch = null;
        refreshSwatches();
    }

    // ============================================================
    // EDIT SWATCH DIALOG
    // ============================================================
    function editSwatch(index) {
        try {
            var sw       = groups[currentGroup][index];
            var curColor = hexToRGBArray(sw.hex);

            var dlg = new Window("dialog", "Edit Swatch");
            dlg.orientation   = "column";
            dlg.alignChildren = ["fill", "top"];
            dlg.spacing       = 10;
            dlg.margins       = 16;

            // Color row
            var colorRow = dlg.add("group");
            colorRow.orientation   = "row";
            colorRow.alignChildren = ["left", "center"];
            colorRow.spacing       = 10;

            var preview = colorRow.add("panel");
            preview.preferredSize = [50, 50];
            preview.graphics.backgroundColor = preview.graphics.newBrush(
                preview.graphics.BrushType.SOLID_COLOR, curColor);

            var hexInput = colorRow.add("edittext", undefined, sw.hex);
            hexInput.characters = 7;

            var changeBtn = colorRow.add("button", undefined, "Change Color");

            // Name row
            var nameRow = dlg.add("group");
            nameRow.orientation   = "row";
            nameRow.alignChildren = ["left", "center"];
            nameRow.spacing       = 5;
            nameRow.add("statictext", undefined, "Name:");
            var nameInput = nameRow.add("edittext", undefined, sw.name || "");
            nameInput.characters = 20;

            // Position row
            var posRow = dlg.add("group");
            posRow.orientation   = "row";
            posRow.alignChildren = ["left", "center"];
            posRow.spacing       = 5;
            posRow.add("statictext", undefined, "Position:");
            var posInput = posRow.add("edittext", undefined, String(index + 1));
            posInput.characters = 4;
            posRow.add("statictext", undefined, "of " + groups[currentGroup].length);

            // Buttons row
            var btnRow = dlg.add("group");
            btnRow.orientation   = "row";
            btnRow.alignChildren = ["center", "center"];
            btnRow.spacing       = 10;
            var deleteBtn = btnRow.add("button", undefined, "Delete");
            var saveBtn   = btnRow.add("button", undefined, "Save");
            var cancelBtn = btnRow.add("button", undefined, "Cancel");

            changeBtn.onClick = function() {
                var c = openColorPicker(curColor);
                if (c) {
                    curColor      = c;
                    hexInput.text = rgbToHex(c[0], c[1], c[2]);
                    preview.graphics.backgroundColor = preview.graphics.newBrush(
                        preview.graphics.BrushType.SOLID_COLOR, c);
                    dlg.layout.layout(true);
                }
            };

            hexInput.onChange = function() {
                var h = hexInput.text;
                if (h.charAt(0) !== '#') h = '#' + h;
                if (/^#[0-9A-Fa-f]{6}$/.test(h)) {
                    curColor      = hexToRGBArray(h);
                    hexInput.text = h.toUpperCase();
                    preview.graphics.backgroundColor = preview.graphics.newBrush(
                        preview.graphics.BrushType.SOLID_COLOR, curColor);
                }
            };

            deleteBtn.onClick = function() {
                if (confirm("Delete swatch?")) {
                    groups[currentGroup].splice(index, 1);
                    saveGroups(groups);
                    dlg.close();
                    refreshSwatches();
                }
            };

            saveBtn.onClick = function() {
                var finalHex = rgbToHex(curColor[0], curColor[1], curColor[2]);
                var swatches = groups[currentGroup];
                swatches[index] = { hex: finalHex, name: nameInput.text || "" };
                var newPos = parseInt(posInput.text, 10) - 1;
                if (!isNaN(newPos) && newPos !== index && newPos >= 0 && newPos < swatches.length) {
                    var moved = swatches.splice(index, 1)[0];
                    swatches.splice(newPos, 0, moved);
                }
                saveGroups(groups);
                dlg.close();
                refreshSwatches();
            };

            cancelBtn.onClick = function() { dlg.close(); };

            dlg.show();
        } catch (e) {
            alert("Error editing swatch: " + e.toString());
        }
    }

    // ============================================================
    // HELP
    // ============================================================
    function showHelpDialog() {
        alert(
            "jg_ColorSwatch v" + SCRIPT_VERSION + " — Help\n" +
            "════════════════════════════════\n\n" +

            "SWATCH CLICKS\n" +
            "  Click            Apply fill color to selected shape layer\n" +
            "  Shift + Click    Toggle stroke on selected shape layer\n" +
            "                   → same color again = set stroke to None\n" +
            "                   → no shape layer selected = create solid\n" +
            "  Ctrl + Click     Edit swatch  (Mac: Cmd + Click)\n" +
            "  Alt + Click      Delete swatch  (Mac: Option + Click)\n" +
            "  Double-click     Open detail view (large preview + info)\n\n" +

            "VIEWS  (top-left buttons)\n" +
            "  ⊞  Swatches   Compact color grid\n" +
            "  ⬚  Cards      Larger squares with hex code\n" +
            "  ≡  List       Rows with hex code; supports reorder\n" +
            "  Active view shown with [ ] brackets\n\n" +

            "TOOLBAR  (second row)\n" +
            "  Group dropdown   Switch between color groups\n" +
            "  ⚙                Rename / delete / export current group\n" +
            "  ⇅                Reorder mode: shows ↑↓ arrows in List view\n" +
            "                   (auto-switches to List view)\n" +
            "  Names            Show / hide name labels in Cards & List\n\n" +

            "ACTION BUTTONS  (bottom)\n" +
            "  Add Color          Pick a single color via AE color picker\n" +
            "  Add Multiple       Pick several colors at once (+ Add Slot\n" +
            "                     to add more rows)\n\n" +

            "MINIMAL MODE  (Min button, top right)\n" +
            "  Shows only the swatch grid, no controls\n" +
            "  S / s     Toggle full / half swatch size\n" +
            "  ←         Return to full mode\n" +
            "  Group name displayed in header\n\n" +

            "IMPORT / EXPORT\n" +
            "  📥  Import a .json color group file\n" +
            "  ⚙ → Export  Save current group as .json\n\n" +

            "SHAPE LAYER SUPPORT\n" +
            "  Works on all selected shape layers at once\n" +
            "  Applies color recursively to all fills / strokes\n" +
            "  inside nested shape groups\n\n" +

            "PERSISTENCE\n" +
            "  Last selected group is restored on next launch\n\n" +

            "by JaviG 🤘"
        );
    }

    // ============================================================
    // REFRESH SWATCHES  (dynamic grid — no hardcoded row count)
    // ============================================================
    function refreshSwatches() {
        if (minimalGroupLabel) minimalGroupLabel.text = currentGroup || "";
        while (swatchGroup.children.length > 0) swatchGroup.remove(swatchGroup.children[0]);

        // Hide / restore main controls based on mode
        if (controlPanel && buttonGroup) {
            if (isDetailView) {
                setVisible(controlPanel,  false);
                setVisible(buttonGroup,   false);
                setVisible(minimalHeader, false);
            } else if (isMinimalMode) {
                setVisible(minimalHeader, true);
                // controlPanel + buttonGroup already collapsed by toggleMinimalMode
            } else {
                setVisible(controlPanel,  true);
                setVisible(buttonGroup,   true);
            }
        }

        if (isDetailView && currentDetailSwatch) {
            // ── Detail view ──────────────────────────────────────────
            swatchGroup.orientation   = "column";
            swatchGroup.alignChildren = ["center", "top"];
            swatchGroup.spacing       = 10;
            swatchGroup.margins       = 0;

            var colorPanel = swatchGroup.add("panel");
            colorPanel.preferredSize = [200, 200];
            colorPanel.graphics.backgroundColor = colorPanel.graphics.newBrush(
                colorPanel.graphics.BrushType.SOLID_COLOR,
                hexToRGBArray(currentDetailSwatch.hex));

            var info = swatchGroup.add("group");
            info.orientation   = "column";
            info.alignChildren = ["center", "top"];
            info.spacing       = 6;

            var hexRow = info.add("group");
            hexRow.orientation   = "row";
            hexRow.alignChildren = ["left", "center"];
            hexRow.spacing       = 5;
            hexRow.add("statictext", undefined, "Hex:");
            var hexTxt = hexRow.add("edittext", undefined, currentDetailSwatch.hex);
            hexTxt.characters = 7;
            hexTxt.readonly   = true;

            var nameRow = info.add("group");
            nameRow.orientation   = "row";
            nameRow.alignChildren = ["left", "center"];
            nameRow.spacing       = 5;
            nameRow.add("statictext", undefined, "Name:");
            var nameTxt = nameRow.add("edittext", undefined, currentDetailSwatch.name || "");
            nameTxt.characters = 20;
            nameTxt.onChange = function() {
                var newName = nameTxt.text;
                groups[currentGroup][currentDetailSwatch.index].name = newName;
                currentDetailSwatch.name = newName;
                saveGroups(groups);
            };

            var backBtn = swatchGroup.add("button", undefined, "← Back");
            backBtn.size    = [80, 22];
            backBtn.onClick = exitDetailView;

        } else {
            // ── Normal view ──────────────────────────────────────────
            var swatches      = groups[currentGroup] || [];
            var effectiveView = isMinimalMode ? "Swatches" : currentView;

            if (effectiveView === "List") {
                swatchGroup.orientation   = "row";
                swatchGroup.alignChildren = ["left", "top"];
                swatchGroup.spacing       = 10;

                var half = Math.ceil(swatches.length / 2);
                var col1 = swatchGroup.add("group");
                var col2 = swatchGroup.add("group");
                col1.orientation = col2.orientation = "column";
                col1.alignChildren = col2.alignChildren = ["left", "top"];
                col1.spacing = col2.spacing = 2;

                for (var i = 0; i < swatches.length; i++) {
                    (function(idx) {
                        var target = idx < half ? col1 : col2;
                        var hex    = swatches[idx].hex;
                        var name   = swatches[idx].name || "";

                        var row = target.add("group");
                        row.orientation   = "row";
                        row.alignChildren = ["left", "center"];
                        row.spacing       = 3;

                        if (isReorderMode) {
                            var upBtn = row.add("button", undefined, "↑");
                            upBtn.size    = [18, 18];
                            upBtn.onClick = function() { moveSwatch(idx, idx - 1); };

                            var dnBtn = row.add("button", undefined, "↓");
                            dnBtn.size    = [18, 18];
                            dnBtn.onClick = function() { moveSwatch(idx, idx + 1); };
                        }

                        var box = row.add("panel");
                        box.preferredSize = [14, 14];
                        box.graphics.backgroundColor = box.graphics.newBrush(
                            box.graphics.BrushType.SOLID_COLOR, hexToRGBArray(hex));
                        box.helpTip = hex;
                        addSwatchHandlers(box, hex, name, idx);

                        var hexTxt = row.add("edittext", undefined, hex);
                        hexTxt.characters = 7;
                        hexTxt.readonly   = true;

                        if (showNames && name) row.add("statictext", undefined, name);
                    })(i);
                }

            } else if (effectiveView === "Cards") {
                swatchGroup.orientation   = "row";
                swatchGroup.alignChildren = ["left", "top"];
                swatchGroup.spacing       = 6;

                // Cards adapt their column count to the panel width so the
                // grid never gets clipped when the user narrows the window.
                // 60 = card preferredSize width, 6 = inter-card spacing, 3 = max cols.
                var CARD_COLS = computeColsForCardSize(60, 6, 3);
                var cardCols  = [];
                for (var c = 0; c < CARD_COLS; c++) {
                    var cc = swatchGroup.add("group");
                    cc.orientation   = "column";
                    cc.alignChildren = ["center", "top"];
                    cc.spacing       = 4;
                    cardCols.push(cc);
                }

                for (var i = 0; i < swatches.length; i++) {
                    (function(idx) {
                        var hex  = swatches[idx].hex;
                        var name = swatches[idx].name || "";

                        var card = cardCols[idx % CARD_COLS].add("group");
                        card.orientation   = "column";
                        card.alignChildren = ["center", "top"];
                        card.spacing       = 2;
                        card.margins       = 0;
                        card.preferredSize = [60, -1];

                        var swatch = card.add("panel");
                        swatch.preferredSize = [40, 40];
                        swatch.graphics.backgroundColor = swatch.graphics.newBrush(
                            swatch.graphics.BrushType.SOLID_COLOR, hexToRGBArray(hex));
                        swatch.helpTip = hex + (name ? " — " + name : "");

                        var hexLbl = card.add("statictext", undefined, hex);
                        hexLbl.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 8);

                        if (showNames && name) {
                            var nameLbl = card.add("statictext", undefined, name);
                            nameLbl.graphics.font = ScriptUI.newFont("Arial", "ITALIC", 8);
                        }

                        addSwatchHandlers(swatch, hex, name, idx);
                    })(i);
                }

            } else {
                // ── Swatches grid (dynamic rows + dynamic columns) ────
                // The number of columns adapts to the panel width so swatches
                // never get clipped — they wrap into more rows instead.
                var sqSize    = (isMinimalMode && minimalSmall) ? 15 : 30;
                var sqSpacing = sqSize === 15 ? 1 : 2;
                var cols      = computeSwatchCols(sqSize, sqSpacing);

                swatchGroup.orientation   = "column";
                swatchGroup.alignChildren = ["left", "top"];
                swatchGroup.spacing       = sqSpacing;

                var numRows = Math.max(1, Math.ceil(swatches.length / cols));
                for (var r = 0; r < numRows; r++) {
                    var rowGrp = swatchGroup.add("group");
                    rowGrp.orientation   = "row";
                    rowGrp.alignChildren = ["left", "center"];
                    rowGrp.spacing       = sqSpacing;

                    for (var col = 0; col < cols; col++) {
                        (function(idx) {
                            if (idx >= swatches.length) return;
                            var hex  = swatches[idx].hex;
                            var name = swatches[idx].name || "";
                            var sq   = rowGrp.add("panel");
                            sq.preferredSize = [sqSize, sqSize];
                            sq.margins       = 0;
                            sq.graphics.backgroundColor = sq.graphics.newBrush(
                                sq.graphics.BrushType.SOLID_COLOR, hexToRGBArray(hex));
                            sq.helpTip = hex + (name ? " — " + name : "");
                            addSwatchHandlers(sq, hex, name, idx);
                        })(r * cols + col);
                    }
                }
            }
        }

        win.layout.layout(true);
    }

    // ============================================================
    // BUILD UI
    // ============================================================
    function buildUI(thisObj) {
        win = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", "jg_ColorSwatch", undefined, { resizeable: true, closeButton: true });

        win.minimumSize   = [1, 1];
        win.orientation   = "column";
        win.alignChildren = ["fill", "top"];
        win.spacing       = isMac ? 6  : 5;
        win.margins       = isMac ? 12 : 10;

        // ── Minimal mode header (hidden in full mode) ─────────────
        minimalHeader = win.add("group");
        minimalHeader.orientation   = "row";
        minimalHeader.alignment     = ["fill", "top"];
        minimalHeader.alignChildren = ["left", "center"];
        minimalHeader.spacing       = 4;
        minimalHeader.margins       = 0;
        setVisible(minimalHeader, false);

        minimalGroupLabel = minimalHeader.add("statictext", undefined, "");
        minimalGroupLabel.alignment = ["fill", "center"];

        var sizeBtn = minimalHeader.add("button", undefined, "S");
        sizeBtn.size    = [20, 20];
        sizeBtn.helpTip = "Toggle half-size swatches";

        var fullModeBtn = minimalHeader.add("button", undefined, "←");
        fullModeBtn.size    = [20, 20];
        fullModeBtn.helpTip = "Switch to full mode";

        // ── Control panel (top bar + group bar) ───────────────────
        controlPanel = win.add("group");
        controlPanel.orientation   = "column";
        controlPanel.alignChildren = ["fill", "top"];
        controlPanel.alignment     = ["fill", "top"];
        controlPanel.spacing       = 5;
        controlPanel.margins       = 0;

        // ── Update banner (hidden unless an update is detected) ───
        // Lives inside controlPanel so it disappears in minimal mode automatically.
        updateBanner = controlPanel.add("group");
        updateBanner.orientation   = "row";
        updateBanner.alignment     = ["fill", "top"];
        updateBanner.alignChildren = ["fill", "center"];
        updateBanner.spacing       = 4;
        updateBanner.margins       = [4, 2, 4, 2];
        setVisible(updateBanner, false);

        try {
            updateBanner.graphics.backgroundColor = updateBanner.graphics.newBrush(
                updateBanner.graphics.BrushType.SOLID_COLOR, [0.16, 0.45, 0.85]);
        } catch (e) {}

        updateBannerText = updateBanner.add("statictext", undefined, "");
        updateBannerText.alignment = ["fill", "center"];
        try {
            updateBannerText.graphics.foregroundColor = updateBannerText.graphics.newPen(
                updateBannerText.graphics.PenType.SOLID_COLOR, [1, 1, 1], 1);
        } catch (e) {}

        var updateGetBtn     = updateBanner.add("button", undefined, "Get");
        updateGetBtn.size    = [40, 18];
        updateGetBtn.helpTip = "Open the download page";
        updateGetBtn.onClick = openUpdateURL;

        var updateDismissBtn = updateBanner.add("button", undefined, "✕");
        updateDismissBtn.size    = [22, 18];
        updateDismissBtn.helpTip = "Dismiss for this version";
        updateDismissBtn.onClick = function() {
            // Dismiss the currently-advertised version
            var v = updateBanner._advertisedVersion || "";
            setDismissedUpdateVersion(v);
            setVisible(updateBanner, false);
            win.layout.layout(true);
        };

        // Top bar: view buttons + right-side actions
        // Spacing kept tight and decorative labels removed so the panel can
        // be narrowed enough for the swatches grid to wrap meaningfully.
        var topBar = controlPanel.add("group");
        topBar.orientation   = "row";
        topBar.alignment     = ["fill", "top"];
        topBar.alignChildren = ["left", "center"];
        topBar.spacing       = 3;
        topBar.margins       = 0;

        var viewGroup = topBar.add("group");
        viewGroup.orientation = "row";
        viewGroup.spacing     = 2;
        viewGroup.alignment   = ["left", "center"];

        var rightBtns = topBar.add("group");
        rightBtns.orientation = "row";
        rightBtns.spacing     = 2;
        rightBtns.alignment   = ["right", "center"];

        var minimalBtn = rightBtns.add("button", undefined, "▭");
        minimalBtn.size    = [20, 20];
        minimalBtn.helpTip = "Switch to minimal mode";

        var settingsBtn = rightBtns.add("button", undefined, "⚙");
        settingsBtn.size    = [22, 20];
        settingsBtn.helpTip = "Settings · Import / Export / Help / License";

        var versionTxt = rightBtns.add("statictext", undefined, "v" + SCRIPT_VERSION);
        versionTxt.graphics.font = ScriptUI.newFont("Arial", "REGULAR", 7);
        versionTxt.graphics.foregroundColor = versionTxt.graphics.newPen(
            versionTxt.graphics.PenType.SOLID_COLOR, [0.5, 0.5, 0.5], 1);
        versionTxt.helpTip = "Installed version";

        // View buttons — active button shown with brackets
        var viewButtons = {};
        for (var i = 0; i < VIEW_MODES.length; i++) {
            (function(mode) {
                viewButtons[mode] = viewGroup.add("button", undefined, VIEW_ICONS[mode]);
                viewButtons[mode].size    = [25, 20];
                viewButtons[mode].helpTip = mode;
                viewButtons[mode].onClick = function() {
                    currentView = mode;
                    updateViewButtons();
                    refreshSwatches();
                };
            })(VIEW_MODES[i]);
        }

        function updateViewButtons() {
            for (var m in viewButtons) {
                viewButtons[m].text = (m === currentView)
                    ? "[" + VIEW_ICONS[m] + "]"
                    : VIEW_ICONS[m];
            }
        }
        updateViewButtons();

        // Group bar: dropdown + settings gear
        var groupNames = getKeys(groups);
        var savedLast  = loadLastGroup();
        currentGroup   = (savedLast && groups[savedLast]) ? savedLast : groupNames[0];

        var groupBar = controlPanel.add("group");
        groupBar.orientation   = "row";
        groupBar.alignment     = ["fill", "top"];
        groupBar.alignChildren = ["fill", "center"];
        groupBar.spacing       = 2;
        groupBar.margins       = 0;

        var groupDropdown = groupBar.add("dropdownlist", undefined, groupNames.concat(["+ Add group"]));
        groupDropdown.selection = groupDropdown.find(currentGroup) || 0;
        groupDropdown.alignment = ["fill", "center"];

        var editGroupBtn = groupBar.add("button", undefined, "✎");
        editGroupBtn.size    = [20, 20];
        editGroupBtn.helpTip = "Edit group (rename / delete)";

        var reorderBtn = groupBar.add("button", undefined, "⇅");
        reorderBtn.size    = [20, 20];
        reorderBtn.helpTip = "Toggle reorder mode (show ↑↓ arrows in List view)";

        var showNamesBtn = groupBar.add("button", undefined, "Aa");
        showNamesBtn.size    = [22, 20];
        showNamesBtn.helpTip = "Toggle name labels in Cards and List views";

        // ── Swatch container ──────────────────────────────────────
        scrollPanel = win.add("panel");
        scrollPanel.alignChildren     = ["fill", "top"];
        scrollPanel.alignment         = ["fill", "fill"];
        scrollPanel.minimumSize.height = 80;

        var swatchContainer = scrollPanel.add("group");
        swatchContainer.orientation   = "column";
        swatchContainer.alignChildren = ["fill", "top"];
        swatchContainer.alignment     = ["fill", "fill"];
        swatchContainer.spacing       = 0;
        swatchContainer.margins       = 0;

        swatchGroup = swatchContainer.add("group");
        swatchGroup.orientation   = "row";
        swatchGroup.alignChildren = ["left", "top"];
        swatchGroup.alignment     = ["fill", "top"];
        swatchGroup.spacing       = 2;
        swatchGroup.margins       = 0;

        // ── Action buttons ────────────────────────────────────────
        buttonGroup = win.add("group");
        buttonGroup.orientation   = "column";
        buttonGroup.alignment     = ["fill", "bottom"];
        buttonGroup.alignChildren = ["fill", "center"];
        buttonGroup.spacing       = 5;
        buttonGroup.margins       = 0;

        var addButton         = buttonGroup.add("button", undefined, "Add Color");
        var addMultipleButton = buttonGroup.add("button", undefined, "Add Multiple");
        // Allow these buttons (and the dropdown above) to clip rather than
        // forcing the panel wider than the user wants.
        addButton.minimumSize         = [0, 0];
        addMultipleButton.minimumSize = [0, 0];
        groupDropdown.minimumSize     = [0, 0];

        // ── Group dropdown handlers ───────────────────────────────
        function refreshDropdown(selectName) {
            groupDropdown.removeAll();
            for (var g in groups) groupDropdown.add("item", g);
            groupDropdown.add("item", "+ Add group");
            if (selectName) groupDropdown.selection = groupDropdown.find(selectName);
        }

        groupDropdown.onChange = function() {
            var sel = groupDropdown.selection ? groupDropdown.selection.text : "";
            if (sel === "+ Add group") {
                var name = prompt("New group name:", "New Group");
                if (!name) { refreshDropdown(currentGroup); return; }
                groups[name] = [];
                saveGroups(groups);
                currentGroup = name;
                saveLastGroup(currentGroup);
                refreshDropdown(name);
                refreshSwatches();
            } else {
                currentGroup = sel;
                saveLastGroup(currentGroup);
                refreshSwatches();
            }
        };

        // ── Settings menu actions (used by both editGroup dialog & ⚙ menu)
        function doExport() {
            try {
                var file = File.saveDialog("Export Color Group", "JSON:*.json");
                if (!file) return;
                if (file.name.indexOf(".json") === -1) file = new File(file.fsName + ".json");
                var data = {
                    name:       currentGroup,
                    swatches:   groups[currentGroup],
                    exportDate: formatDate(new Date())
                };
                if (file.open('w')) {
                    file.write(JSON.stringify(data, null, 2));
                    file.close();
                    alert("Exported successfully!");
                } else {
                    alert("Error: could not write file.");
                }
            } catch (e) { alert("Export error: " + e.toString()); }
        }

        function doImport() {
            try {
                var file = File.openDialog("Import Color Group", "JSON:*.json");
                if (!file) return;
                if (!file.open('r')) { alert("Error: could not open file."); return; }
                var raw  = file.read();
                file.close();
                var data = JSON.parse(raw);
                if (!data.name || !data.swatches || !(data.swatches instanceof Array)) {
                    throw new Error("Invalid file format.");
                }
                var newName = data.name;
                var counter = 1;
                while (groups[newName]) { newName = data.name + " " + counter++; }
                groups[newName] = data.swatches;
                saveGroups(groups);
                currentGroup = newName;
                saveLastGroup(currentGroup);
                refreshDropdown(newName);
                refreshSwatches();
                alert("Imported successfully!");
            } catch (e) { alert("Import error: " + e.toString()); }
        }

        editGroupBtn.onClick = function() {
            var dlg = new Window("dialog", "Edit Group: " + currentGroup);
            dlg.orientation   = "column";
            dlg.alignChildren = ["fill", "top"];
            dlg.spacing       = 10;
            dlg.margins       = 16;

            var nameGrp = dlg.add("group");
            nameGrp.orientation   = "row";
            nameGrp.alignChildren = ["left", "center"];
            nameGrp.spacing       = 5;
            nameGrp.add("statictext", undefined, "Name:");
            var nameInput = nameGrp.add("edittext", undefined, currentGroup);
            nameInput.characters = 20;

            var btnGrp = dlg.add("group");
            btnGrp.orientation   = "row";
            btnGrp.alignChildren = ["center", "center"];
            btnGrp.spacing       = 10;
            var deleteBtn = btnGrp.add("button", undefined, "Delete Group");
            var okBtn     = btnGrp.add("button", undefined, "OK");

            deleteBtn.onClick = function() {
                if (getKeys(groups).length <= 1) { alert("Cannot delete the last group!"); return; }
                if (confirm("Delete group '" + currentGroup + "'?")) {
                    delete groups[currentGroup];
                    saveGroups(groups);
                    currentGroup = getKeys(groups)[0];
                    saveLastGroup(currentGroup);
                    refreshDropdown(currentGroup);
                    refreshSwatches();
                    dlg.close();
                }
            };

            okBtn.onClick = function() {
                var newName = nameInput.text;
                if (newName && newName !== currentGroup) {
                    groups[newName] = groups[currentGroup];
                    delete groups[currentGroup];
                    currentGroup = newName;
                    saveGroups(groups);
                    saveLastGroup(currentGroup);
                    refreshDropdown(newName);
                    refreshSwatches();
                }
                dlg.close();
            };

            dlg.show();
        };

        // ── Reorder mode toggle ───────────────────────────────────
        reorderBtn.onClick = function() {
            isReorderMode   = !isReorderMode;
            reorderBtn.text = isReorderMode ? "[⇅]" : "⇅";
            if (currentView !== "List") {
                currentView = "List";
                updateViewButtons();
            }
            refreshSwatches();
        };

        // ── Show names toggle ─────────────────────────────────────
        showNamesBtn.onClick = function() {
            showNames         = !showNames;
            showNamesBtn.text = showNames ? "[Aa]" : "Aa";
            refreshSwatches();
        };

        // ── Settings menu (Import / Export / Help / License) ─────
        settingsBtn.onClick = function() {
            var menu = new Window("dialog", "Settings");
            menu.orientation   = "column";
            menu.alignChildren = ["fill", "top"];
            menu.spacing       = 6;
            menu.margins       = 14;

            function makeItem(label, action) {
                var b = menu.add("button", undefined, label);
                b.preferredSize = [180, 28];
                b.onClick = function() { menu.close(); action(); };
                return b;
            }

            makeItem("Import palette", doImport);
            makeItem("Export palette", doExport);

            // Visual separator between palette ops and app-level items
            var sep = menu.add("panel");
            sep.alignment     = ["fill", "top"];
            sep.preferredSize = [-1, 1];

            makeItem("Check for updates", manualCheckForUpdates);
            makeItem("Help",              showHelpDialog);
            makeItem("License",           showLicenseInfoDialog);

            // Trailing Close so the menu has an explicit way out (Esc still works).
            var closeBtn = menu.add("button", undefined, "Close", { name: "cancel" });
            closeBtn.alignment = ["right", "center"];
            closeBtn.onClick   = function() { menu.close(); };

            menu.show();
        };

        // ── Add Color ─────────────────────────────────────────────
        addButton.onClick = function() {
            if (groups[currentGroup] && groups[currentGroup].length >= MAX_SWATCHES) {
                alert("Maximum of " + MAX_SWATCHES + " swatches per group.\nCreate a new group for more.");
                return;
            }
            var c = openColorPicker(null);
            if (c) {
                if (!groups[currentGroup]) groups[currentGroup] = [];
                groups[currentGroup].push({ hex: rgbToHex(c[0], c[1], c[2]), name: "" });
                saveGroups(groups);
                refreshSwatches();
            }
        };

        // ── Add Multiple Colors ───────────────────────────────────
        addMultipleButton.onClick = function() {
            var dlg = new Window("dialog", "Add Multiple Colors");
            dlg.orientation   = "column";
            dlg.alignChildren = ["fill", "top"];
            dlg.spacing       = 8;
            dlg.margins       = 16;

            var slots      = [];
            var slotsGroup = dlg.add("group");
            slotsGroup.orientation   = "column";
            slotsGroup.alignChildren = ["fill", "top"];
            slotsGroup.spacing       = 4;

            function addSlot() {
                var slotRow = slotsGroup.add("group");
                slotRow.orientation   = "row";
                slotRow.alignChildren = ["left", "center"];
                slotRow.spacing       = 6;

                var preview = slotRow.add("panel");
                preview.preferredSize = [40, 24];
                preview.graphics.backgroundColor = preview.graphics.newBrush(
                    preview.graphics.BrushType.SOLID_COLOR, [0.85, 0.85, 0.85]);

                var pickBtn = slotRow.add("button", undefined, "Pick " + (slots.length + 1));
                pickBtn.size = [64, 22];

                var hexTxt = slotRow.add("edittext", undefined, "");
                hexTxt.characters = 7;
                hexTxt.readonly   = true;

                // Each addSlot call has its own `slot`, so direct closure capture is safe.
                var slot = { color: null, preview: preview, hexTxt: hexTxt };
                slots.push(slot);

                pickBtn.onClick = function() {
                    var c = openColorPicker(slot.color);
                    if (c) {
                        slot.color = c;
                        slot.preview.graphics.backgroundColor = slot.preview.graphics.newBrush(
                            slot.preview.graphics.BrushType.SOLID_COLOR, c);
                        slot.hexTxt.text = rgbToHex(c[0], c[1], c[2]);
                        dlg.layout.layout(true);
                    }
                };

                dlg.layout.layout(true);
            }

            addSlot(); addSlot(); addSlot();

            var addSlotBtn = dlg.add("button", undefined, "+ Add Slot");
            addSlotBtn.alignment = ["left", "center"];
            addSlotBtn.onClick   = addSlot;

            var btnRow = dlg.add("group");
            btnRow.orientation   = "row";
            btnRow.alignChildren = ["center", "center"];
            btnRow.spacing       = 10;
            var addBtn    = btnRow.add("button", undefined, "Add Selected Colors");
            var cancelBtn = btnRow.add("button", undefined, "Cancel");

            addBtn.onClick = function() {
                if (!groups[currentGroup]) groups[currentGroup] = [];
                var added = false;
                for (var i = 0; i < slots.length; i++) {
                    var c = slots[i].color;
                    if (c && !isNaN(c[0]) && groups[currentGroup].length < MAX_SWATCHES) {
                        groups[currentGroup].push({ hex: rgbToHex(c[0], c[1], c[2]), name: "" });
                        added = true;
                    }
                }
                if (added) { saveGroups(groups); refreshSwatches(); }
                dlg.close();
            };

            cancelBtn.onClick = function() { dlg.close(); };
            dlg.show();
        };

        // ── Minimal mode toggle ───────────────────────────────────
        function toggleMinimalMode() {
            isMinimalMode = !isMinimalMode;
            if (isMinimalMode) {
                setVisible(controlPanel,  false);
                setVisible(buttonGroup,   false);
                setVisible(minimalHeader, true);
                scrollPanel.minimumSize = [0, 0];
                scrollPanel.margins     = 0;
                win.margins       = 0;
                win.spacing       = 0;
                win.alignChildren = ["fill", "fill"];
                win.minimumSize   = [1, 1];
            } else {
                setVisible(controlPanel,  true);
                setVisible(buttonGroup,   true);
                setVisible(minimalHeader, false);
                scrollPanel.minimumSize = [0, 0];
                scrollPanel.margins     = isMac ? 13 : 10;
                win.margins       = isMac ? 12 : 10;
                win.spacing       = isMac ? 6  : 5;
                win.alignChildren = ["fill", "top"];
                win.minimumSize   = [1, 1];
            }
            refreshSwatches();
            win.layout.layout(true);
        }

        minimalBtn.onClick  = toggleMinimalMode;
        fullModeBtn.onClick = toggleMinimalMode;

        sizeBtn.onClick = function() {
            minimalSmall = !minimalSmall;
            sizeBtn.text = minimalSmall ? "s" : "S";
            refreshSwatches();
        };

        // ── Esc handling (works when panel has keyboard focus) ────
        try {
            win.addEventListener("keydown", function(k) {
                if (k.keyName === "Escape") {
                    if (isDetailView)        exitDetailView();
                    else if (isMinimalMode)  toggleMinimalMode();
                }
            });
        } catch (e) {}

        refreshSwatches();

        // Refresh swatches whenever the panel width crosses a column boundary
        // OR after the user finishes resizing. Tracking width (not cols) sidesteps
        // the case where computeSwatchCols can't read a fresh size and returns
        // a stale value — a width-based threshold guarantees we re-measure.
        var lastWidth = -1;
        function maybeRefreshOnResize() {
            if (isDetailView) return;
            var w = readWidth(scrollPanel) || readWidth(win) || 0;
            var sqSize    = (isMinimalMode && minimalSmall) ? 15 : 30;
            var threshold = sqSize + 2;  // one column-step
            if (lastWidth < 0 || Math.abs(w - lastWidth) >= threshold) {
                lastWidth = w;
                refreshSwatches();
            }
        }
        win.onResizing = function() { this.layout.resize(); maybeRefreshOnResize(); };
        win.onResize   = function() {
            this.layout.resize();
            if (isDetailView) return;
            // Always re-render once the resize settles, regardless of threshold.
            lastWidth = readWidth(scrollPanel) || readWidth(win) || 0;
            refreshSwatches();
        };

        return win;
    }

    // ============================================================
    // LOCKED UI  (shown when the user cancels the activation dialog)
    // ============================================================
    function buildLockedUI(thisObj) {
        var w = (thisObj instanceof Panel)
            ? thisObj
            : new Window("palette", "jg_ColorSwatch", undefined, { resizeable: true, closeButton: true });
        w.orientation   = "column";
        w.alignChildren = ["fill", "top"];
        w.spacing       = 8;
        w.margins       = 16;

        var msg = w.add("statictext", undefined, "License required", { multiline: true });
        msg.graphics.font = ScriptUI.newFont("Arial", "BOLD", 13);

        var sub = w.add("statictext", undefined,
            "Enter a license key to unlock jg_ColorSwatch.",
            { multiline: true });
        sub.preferredSize.width = 220;

        var activateBtn = w.add("button", undefined, "Enter license key");
        var buyBtn      = w.add("button", undefined, "Buy a license");

        activateBtn.onClick = function() {
            if (showActivationDialog("first")) {
                // Activation succeeded — rebuild as the full panel.
                while (w.children.length > 0) w.remove(w.children[0]);
                buildUI(w);
                w.layout.layout(true);
            }
        };
        buyBtn.onClick = openBuyURL;

        if (w instanceof Window) { w.center(); w.show(); }
        return w;
    }

    // ============================================================
    // BOOT
    // ============================================================
    if (!gateOnLicense()) {
        buildLockedUI(thisObj);
        return;
    }

    var ui = buildUI(thisObj);
    if (ui instanceof Window) { ui.center(); ui.show(); }

    // Background update check after the panel is visible. Silent unless a
    // newer version is published in scripts_doc/jg_ColorSwatch/version.json.
    try { maybeShowUpdateBanner(); } catch (e) {}

})(this);

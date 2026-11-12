import React, { useContext, useState } from "react";
import { AuthContext } from "../../context/AuthContext";

const SettingsPanel = ({ onClose }) => {
  const {
    theme, updateTheme, accent, updateAccent,
    desktopNotifications, updateDesktopNotifications,
  } = useContext(AuthContext);
  const [busy, setBusy] = useState(false);

  const enableNotifications = async (checked) => {
    if (!checked) {
      updateDesktopNotifications(false);
      return;
    }
    if (!("Notification" in window)) {
      window.alert("This browser does not support desktop notifications.");
      return;
    }
    setBusy(true);
    try {
      const permission = Notification.permission === "granted"
        ? "granted"
        : await Notification.requestPermission();
      if (permission === "granted") updateDesktopNotifications(true);
      else window.alert("Notification permission was not granted. You can enable it in your browser settings.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="qc-settings-title" className="qc-settings-panel w-full max-w-md rounded-2xl border border-white/10 p-5 text-white shadow-2xl">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-violet-300">QuickChat preferences</p>
            <h2 id="qc-settings-title" className="mt-1 text-xl font-semibold">Settings</h2>
          </div>
          <button type="button" onClick={onClose} className="qc-icon-btn" aria-label="Close settings">×</button>
        </header>

        <div className="space-y-5">
          <section>
            <h3 className="text-sm font-semibold">Appearance</h3>
            <p className="mt-1 text-xs text-white/45">Choose the look used on this device.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {["dark", "light"].map((value) => (
                <button key={value} type="button" onClick={() => updateTheme(value)} aria-pressed={theme === value} className={`rounded-xl border px-3 py-3 text-sm capitalize transition ${theme === value ? "border-violet-300 bg-violet-400/15 text-white" : "border-white/10 bg-white/5 text-white/60"}`}>
                  {value === "dark" ? "🌙 Dark" : "☀️ Light"}
                </button>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-sm font-semibold">Accent color</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                { id: "violet", label: "Violet", color: "#9b83f5" },
                { id: "blue", label: "Blue", color: "#5799f5" },
                { id: "emerald", label: "Emerald", color: "#34c99a" },
                { id: "rose", label: "Rose", color: "#ef7d9b" },
              ].map((item) => (
                <button key={item.id} type="button" onClick={() => updateAccent(item.id)} aria-label={item.label + " accent"} aria-pressed={accent === item.id} className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${accent === item.id ? "border-white/70 bg-white/10" : "border-white/10"}`}>
                  <span className="h-3 w-3 rounded-full" style={{ background: item.color }} />
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          <section className="flex items-center justify-between gap-4 border-t border-white/10 pt-4">
            <div>
              <h3 className="text-sm font-semibold">Desktop notifications</h3>
              <p className="mt-1 text-xs text-white/45">Show a browser notification for incoming messages outside the open conversation.</p>
            </div>
            <input aria-label="Enable desktop notifications" type="checkbox" checked={desktopNotifications} disabled={busy} onChange={(e) => enableNotifications(e.target.checked)} className="h-4 w-4 shrink-0 accent-violet-400" />
          </section>
          <p className="text-[10px] text-white/35">Preferences are saved in this browser. Notification permission is controlled by your browser.</p>
        </div>
      </section>
    </div>
  );
};

export default SettingsPanel;

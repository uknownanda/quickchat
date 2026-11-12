import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";

const sections = [
  { id: "appearance", label: "Appearance", icon: "◐", detail: "Theme and accent" },
  { id: "chat", label: "Chat experience", icon: "▤", detail: "Typography and layout" },
  { id: "profile", label: "Profile", icon: "◎", detail: "Your public identity" },
  { id: "privacy", label: "Privacy", icon: "◇", detail: "Visibility and safety" },
  { id: "conversations", label: "Conversations", icon: "▧", detail: "Personalize each chat" },
];

const accents = [
  { id: "violet", label: "Ultraviolet", color: "#9b83f5" },
  { id: "blue", label: "Electric blue", color: "#5799f5" },
  { id: "emerald", label: "Mint", color: "#34c99a" },
  { id: "rose", label: "Rose", color: "#ef7d9b" },
  { id: "amber", label: "Amber", color: "#f4b860" },
];

const Choice = ({ label, active, onClick, children }) => (
  <button type="button" onClick={onClick} aria-pressed={active} className={`qc-setting-choice ${active ? "selected" : ""}`}>
    {children || label}
  </button>
);

const SettingRow = ({ title, description, children }) => (
  <div className="qc-setting-row">
    <div className="min-w-0"><h3>{title}</h3>{description && <p>{description}</p>}</div>
    <div className="shrink-0">{children}</div>
  </div>
);

const SettingsPanel = ({ onClose, selectedUser }) => {
  const navigate = useNavigate();
  const { theme, updateTheme, accent, updateAccent, preferences, updatePreference, wallpapers, updateWallpaper } = useContext(AuthContext);
  const [active, setActive] = useState("appearance");

  const goProfile = () => { onClose(); navigate("/profile"); };

  return (
    <div className="qc-settings-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="qc-settings-title" className="qc-settings-shell">
        <aside className="qc-settings-nav">
          <div className="qc-settings-brand"><span className="qc-settings-mark">Q</span><div><b>QuickChat</b><small>PERSONALIZATION CENTER</small></div></div>
          <p className="qc-settings-nav-label">PREFERENCES</p>
          {sections.map((item) => (
            <button key={item.id} type="button" onClick={() => setActive(item.id)} className={`qc-settings-nav-item ${active === item.id ? "active" : ""}`}>
              <span className="qc-settings-nav-icon">{item.icon}</span><span><b>{item.label}</b><small>{item.detail}</small></span><span className="qc-settings-nav-arrow">›</span>
            </button>
          ))}
          <div className="qc-settings-nav-foot"><span className="qc-settings-status-dot" /> Preferences saved on this device</div>
        </aside>
        <main className="qc-settings-main">
          <header className="qc-settings-header">
            <div><p className="qc-settings-eyebrow">YOUR SPACE · YOUR RULES</p><h2 id="qc-settings-title">{sections.find((item) => item.id === active)?.label}</h2><p>Fine-tune the way QuickChat feels and works for you.</p></div>
            <button type="button" className="qc-settings-close" onClick={onClose} aria-label="Close settings">×</button>
          </header>

          {active === "appearance" && <div className="qc-settings-content">
            <section className="qc-settings-section"><div className="qc-settings-section-title"><h3>Interface theme</h3><p>A calm, dark-first workspace designed for focus.</p></div>
              <div className="qc-theme-cards">
                <Choice active={theme === "dark"} onClick={() => updateTheme("dark")}><span className="qc-theme-preview dark"><i/><i/><i/></span><b>Midnight</b><small>Dark mode</small></Choice>
                <Choice active={theme === "light"} onClick={() => updateTheme("light")}><span className="qc-theme-preview light"><i/><i/><i/></span><b>Daylight</b><small>Light mode</small></Choice>
              </div>
            </section>
            <section className="qc-settings-section"><div className="qc-settings-section-title"><h3>Accent palette</h3><p>Choose the color that highlights your workspace.</p></div>
              <div className="qc-accent-grid">{accents.map((item) => <button key={item.id} type="button" onClick={() => updateAccent(item.id)} aria-pressed={accent === item.id} className={`qc-accent-option ${accent === item.id ? "selected" : ""}`}><span style={{ background: item.color }}/><b>{item.label}</b>{accent === item.id && <small>✓</small>}</button>)}</div>
            </section>
          </div>}

          {active === "chat" && <div className="qc-settings-content">
            <section className="qc-settings-section"><div className="qc-settings-section-title"><h3>Reading comfort</h3><p>Adjust message text and the density of your conversation.</p></div>
              <SettingRow title="Message text size" description="Applied to message content."><div className="qc-settings-inline">{["small","medium","large"].map((v) => <Choice key={v} label={v} active={preferences.fontSize === v} onClick={() => updatePreference("fontSize",v)} />)}</div></SettingRow>
              <SettingRow title="Conversation density" description="Choose how much space messages occupy."><div className="qc-settings-inline">{["compact","comfortable"].map((v) => <Choice key={v} label={v} active={preferences.chatDensity === v} onClick={() => updatePreference("chatDensity",v)} />)}</div></SettingRow>
            </section>
            <section className="qc-settings-section"><div className="qc-settings-section-title"><h3>Message styling</h3><p>Set the visual character of message bubbles.</p></div>
              <SettingRow title="Bubble shape"><div className="qc-settings-inline">{["soft","classic"].map((v) => <Choice key={v} label={v} active={preferences.bubbleStyle === v} onClick={() => updatePreference("bubbleStyle",v)} />)}</div></SettingRow>
              <SettingRow title="Corner radius"><div className="qc-settings-inline">{["rounded","sharp"].map((v) => <Choice key={v} label={v} active={preferences.cornerStyle === v} onClick={() => updatePreference("cornerStyle",v)} />)}</div></SettingRow>
              <SettingRow title="Show message timestamps" description="Display the time beneath each message."><input className="qc-setting-switch" type="checkbox" checked={preferences.showTimestamps} onChange={(e) => updatePreference("showTimestamps",e.target.checked)} /></SettingRow>
              <SettingRow title="Enter to send" description="Press Enter to send; use Shift + Enter for a new line."><input className="qc-setting-switch" type="checkbox" checked={preferences.enterToSend} onChange={(e) => updatePreference("enterToSend",e.target.checked)} /></SettingRow>
            </section>
          </div>}

          {active === "profile" && <div className="qc-settings-content">
            <div className="qc-settings-feature-card"><div className="qc-settings-feature-icon">◎</div><div><h3>Make your profile yours</h3><p>Update your display name, profile photo and bio. Your username remains your unique identifier.</p><button type="button" className="qc-settings-primary" onClick={goProfile}>Edit profile <span>↗</span></button></div></div>
            <section className="qc-settings-section"><div className="qc-settings-section-title"><h3>Profile presentation</h3><p>Choose a subtle accent for your personal profile identity.</p></div><div className="qc-accent-grid">{accents.map((item) => <button key={item.id} type="button" onClick={() => updatePreference("profileAccent",item.id)} aria-pressed={preferences.profileAccent === item.id} className={`qc-accent-option ${preferences.profileAccent === item.id ? "selected" : ""}`}><span style={{background:item.color}}/><b>{item.label}</b></button>)}</div></section>
          </div>}

          {active === "privacy" && <div className="qc-settings-content">
            <div className="qc-settings-feature-card"><div className="qc-settings-feature-icon">◇</div><div><h3>Privacy should be enforced, not just displayed</h3><p>Online presence, last-seen visibility, read receipts and typing indicators are controlled by the messaging server. This version does not expose switches that would falsely imply those controls are active.</p></div></div>
            <section className="qc-settings-section"><div className="qc-settings-section-title"><h3>Current safeguards</h3><p>What QuickChat currently provides.</p></div>
              <div className="qc-privacy-list"><div><b>Account access</b><span>Authenticated sessions</span></div><div><b>Contact discovery</b><span>Contact requests before a connection</span></div><div><b>Message transport</b><span>Private app conversations over your account session</span></div></div>
            </section>
          </div>}

          {active === "conversations" && <div className="qc-settings-content">
            {selectedUser ? <><div className="qc-settings-feature-card"><div className="qc-settings-feature-avatar">{selectedUser.profilePic ? <img src={selectedUser.profilePic} alt="" /> : (selectedUser.fullName || "?").slice(0,1)}</div><div><h3>{selectedUser.fullName}</h3><p>Personalize the conversation with this contact. These settings stay on this device.</p></div></div>
              <section className="qc-settings-section"><div className="qc-settings-section-title"><h3>Conversation wallpaper</h3><p>Choose a background for this chat only.</p></div><div className="qc-wallpaper-grid">{[{id:"default",label:"Original"},{id:"midnight",label:"Midnight"},{id:"ocean",label:"Ocean"},{id:"forest",label:"Forest"},{id:"sunset",label:"Sunset"}].map((item) => <button key={item.id} type="button" onClick={() => updateWallpaper(selectedUser._id,item.id)} aria-pressed={(wallpapers[selectedUser._id] || "default") === item.id} className={`qc-wallpaper-option ${item.id} ${(wallpapers[selectedUser._id] || "default") === item.id ? "selected" : ""}`}><span/>{item.label}</button>)}</div></section>
            </> : <div className="qc-settings-empty"><span>▧</span><h3>Choose a conversation first</h3><p>Open a chat, then return here to personalize its wallpaper and appearance.</p></div>}
          </div>}

          <footer className="qc-settings-footer"><span>QuickChat · Personalization</span><button type="button" onClick={onClose}>Done</button></footer>
        </main>
      </section>
    </div>
  );
};

export default SettingsPanel;

import React, { useContext, useEffect, useRef, useState } from "react";
import assets from "../assets/assets";
import { formatMessageTime } from "../lib/utils";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import { formatLastSeen } from "../lib/utils";
import toast from "react-hot-toast";
import ProfileImagePreview from "./ProfileImagePreview";

const emojiCategories = [
  { id: "smileys", label: "Smileys", icon: "😀", emojis: "😀 😃 😄 😁 😆 😅 😂 🤣 🥲 🥹 ☺️ 😊 😇 🙂 🙃 😉 😌 😍 🥰 😘 😗 😙 😚 😋 😛 😝 😜 🤪 🤨 🧐 🤓 😎 🥸 🤩 🥳 🙂‍↕️ 😏 😒 🙂‍↔️ 😞 😔 😟 😕 🙁 ☹️ 😣 😖 😫 😩 🥺 😢 😭 😤 😠 😡 🤬 🤯 😳 🥵 🥶 😶‍🌫️ 😱 😨 😰 😥 😓 🤗 🤔 🫣 🤭 🫢 🫡 🤫 🫠 🤥 😶 🫥 😐 😑 😬 🙄 😯 😦 😧 😮 😲 🥱 😴 🤤 😪 😵 😵‍💫 🫨 🤐 🥴 🤢 🤮 🤧 😷 🤒 🤕 🤑 🤠".split(" ") },
  { id: "gestures", label: "Gestures", icon: "👋", emojis: "👋 🤚 🖐️ ✋ 🖖 🫱 🫲 🫳 🫴 👌 🤌 🤏 ✌️ 🤞 🫰 🤟 🤘 🤙 👈 👉 👆 🖕 👇 ☝️ 🫵 👍 👎 ✊ 👊 🤛 🤜 👏 🙌 🫶 👐 🤲 🤝 🙏 ✍️ 💅 🤳 💪 🦾 🦿 🦵 🦶 👂 🦻 👃 🧠 🫀 🫁 🦷 🦴 👀 👁️ 👅 👄 🫦".split(" ") },
  { id: "hearts", label: "Hearts", icon: "❤️", emojis: "❤️ 🩷 🧡 💛 💚 💙 🩵 💜 🤎 🖤 🩶 🤍 💔 ❤️‍🔥 ❤️‍🩹 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ♥️ 💌 💋 🫂".split(" ") },
  { id: "animals", label: "Animals", icon: "🐻", emojis: "🐶 🐱 🐭 🐹 🐰 🦊 🐻 🐼 🐻‍❄️ 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐒 🦍 🦧 🐔 🐧 🐦 🐤 🐣 🐥 🦆 🦅 🦉 🦇 🐺 🐗 🐴 🦄 🫎 🐝 🪱 🦋 🐌 🐞 🐜 🪰 🪲 🪳 🦟 🦗 🕷️ 🦂 🐢 🐍 🦎 🦖 🦕 🐙 🦑 🦐 🦞 🦀 🐡 🐠 🐟 🐬 🐳 🦈 🐊 🐅 🐆 🦓 🦍 🦣 🐘 🦛 🦏 🐪 🐫 🦒 🦘 🦬 🐃 🐂 🐄 🐎 🐖 🐏 🐑 🦙 🐐 🦌 🐕 🐩 🦮 🐈 🐓 🦃 🦚 🦜 🦢 🪿 🦩 🕊️ 🐇 🦝 🦨 🦡 🦫 🦦 🦥 🐁 🐀 🐿️ 🦔".split(" ") },
  { id: "nature", label: "Nature", icon: "🌿", emojis: "🌵 🎄 🌲 🌳 🌴 🪵 🌱 🌿 ☘️ 🍀 🎍 🪴 🎋 🍃 🍂 🍁 🪺 🪻 🌾 💐 🌷 🌹 🥀 🪷 🌺 🌸 🌼 🌻 🌞 🌝 🌛 🌜 🌚 🌕 🌖 🌗 🌘 🌑 🌒 🌓 🌔 🌙 🌎 🌍 🌏 🪐 💫 ⭐ 🌟 ✨ 🌠 🌌 ☀️ 🌤️ ⛅ 🌥️ ☁️ 🌦️ 🌧️ ⛈️ 🌩️ 🌨️ ❄️ ☃️ ⛄ 🌬️ 💨 💧 💦 ☔ ☂️ 🌊 🔥".split(" ") },
  { id: "food", label: "Food", icon: "🍕", emojis: "🍏 🍎 🍐 🍊 🍋 🍌 🍉 🍇 🍓 🫐 🍈 🍒 🍑 🥭 🍍 🥥 🥝 🍅 🍆 🥑 🥦 🥬 🥒 🌶️ 🫑 🌽 🥕 🫒 🧄 🧅 🥔 🍠 🫘 🥐 🥯 🍞 🥖 🥨 🧀 🥚 🍳 🧈 🥞 🧇 🥓 🥩 🍗 🍖 🌭 🍔 🍟 🍕 🫓 🥪 🥙 🧆 🌮 🌯 🫔 🥗 🥘 🫕 🍝 🍜 🍲 🍛 🍣 🍱 🥟 🦪 🍤 🍙 🍚 🍘 🍥 🥠 🥮 🍢 🍡 🍧 🍨 🍦 🥧 🧁 🍰 🎂 🍮 🍭 🍬 🍫 🍿 🍩 🍪 🌰 🥜 🍯 🥛 🍼 ☕ 🫖 🍵 🧃 🥤 🧋 🍶 🍺 🍻 🥂 🍷 🥃 🍸 🍹 🧉 🧊".split(" ") },
  { id: "activities", label: "Activity", icon: "⚽", emojis: "⚽ 🏀 🏈 ⚾ 🥎 🎾 🏐 🏉 🥏 🎱 🪀 🏓 🏸 🏒 🏑 🥍 🏏 🪃 🥅 ⛳ 🪁 🏹 🎣 🤿 🥊 🥋 🎽 🛹 🛼 🛷 ⛸️ 🥌 🎿 ⛷️ 🏂 🏋️ 🤼 🤸 ⛹️ 🤺 🏇 🧘 🏄 🏊 🚴 🚵 🧗 🏆 🥇 🥈 🥉 🏅 🎖️ 🏵️ 🎗️ 🎫 🎟️ 🎪 🤹 🎭 🩰 🎨 🎬 🎤 🎧 🎼 🎹 🥁 🪘 🎷 🎺 🪗 🎸 🪕 🎻 🪇 🎮 🕹️ 🎲 ♟️ 🎯 🎳 🎰 🧩".split(" ") },
  { id: "travel", label: "Travel", icon: "🚀", emojis: "🚗 🚕 🚙 🚌 🚎 🏎️ 🚓 🚑 🚒 🚐 🛻 🚚 🚛 🚜 🛵 🏍️ 🛺 🚲 🛴 🛹 🛼 🚏 🛣️ 🛤️ 🛢️ ⛽ 🛞 🚨 🚥 🚦 🚧 ⚓ 🛟 ⛵ 🛶 🚤 🛳️ ⛴️ 🛥️ 🚢 ✈️ 🛩️ 🛫 🛬 🪂 💺 🚁 🚟 🚠 🚡 🛰️ 🚀 🛸 🌍 🏔️ ⛰️ 🌋 🗻 🏕️ 🏖️ 🏜️ 🏝️ 🏞️ 🏟️ 🏛️ 🏗️ 🧱 🪨 🪵 🏘️ 🏚️ 🏠 🏡 🏢 🏣 🏤 🏥 🏦 🏨 🏩 🏪 🏫 🏬 🏭 🏯 🏰 💒 🗼 🗽 ⛪ 🕌 🛕 🕍 ⛩️ 🕋 ⛲ 🌁 🌃 🌆 🌇 🌉 🌌 🎠 🎡 🎢".split(" ") },
  { id: "objects", label: "Objects", icon: "💡", emojis: "⌚ 📱 📲 💻 ⌨️ 🖥️ 🖨️ 🖱️ 🖲️ 🕹️ 💽 💾 💿 📀 📼 📷 📸 📹 🎥 📽️ 🎞️ 📞 ☎️ 📟 📠 📺 📻 🎙️ 🎚️ 🎛️ 🧭 ⏱️ ⏲️ ⏰ 🕰️ ⌛ ⏳ 📡 🔋 🪫 🔌 💡 🔦 🕯️ 🪔 🧯 🛢️ 💸 💵 💴 💶 💷 🪙 💰 💳 🧾 💎 ⚖️ 🪜 🧰 🪛 🔧 🔨 ⚒️ 🛠️ ⛏️ 🪚 🔩 ⚙️ 🧱 ⛓️ 🧲 🔫 💣 🧨 🪓 🔪 🗡️ ⚔️ 🛡️ 🚬 ⚰️ 🪦 ⚱️ 🏺 🔮 📿 🧿 🪬 💈 ⚗️ 🔭 🔬 🕳️ 🩻 💊 💉 🩹 🩼 🩺 🩸 🧬 🦠 🧫 🧪 🌡️ 🧹 🪠 🧺 🧻 🚽 🚿 🛁 🧼 🪥 🪒 🧽 🪣 🧴 🛎️ 🔑 🗝️ 🚪 🪑 🛋️ 🛏️ 🛌 🧸 🪆 🖼️ 🪞 🪟 🛍️ 🎁 🎈 🎏 🎀 🪄 🪅 🎊 🎉 🎎 🏮 🎐".split(" ") },
  { id: "symbols", label: "Symbols", icon: "💯", emojis: "💯 🔢 🔣 🔠 🔡 🔤 🅰️ 🆎 🅱️ 🆑 🆒 🆓 ℹ️ 🆔 Ⓜ️ 🆕 🆖 🅾️ 🆗 🆘 🆙 🆚 🈁 🈂️ 🈷️ 🈶 🈯 🉐 🈹 🈚 🈲 🉑 🈸 🈴 🈳 🈺 🈵 🔴 🟠 🟡 🟢 🔵 🟣 🟤 ⚫ ⚪ 🟥 🟧 🟨 🟩 🟦 🟪 🟫 ⬛ ⬜ ◼️ ◻️ ◾ ◽ ▪️ ▫️ 🔶 🔷 🔸 🔹 🔺 🔻 💠 🔘 🔳 🔲 ➕ ➖ ➗ ✖️ ♾️ ‼️ ⁉️ ❓ ❔ ❕ ❗ 〰️ 💱 💲 ⚕️ ♻️ ⚜️ 🔱 📛 🔰 ⭕ ✅ ☑️ ✔️ ❌ ❎ ➰ ➿〽️ ✳️ ✴️ ❇️ ©️ ®️ ™️".split(" ") },
  { id: "flags", label: "Flags", icon: "🏳️", emojis: "🏳️ 🏴 🏁 🚩 🏳️‍🌈 🏳️‍⚧️ 🏴‍☠️ 🇮🇳 🇺🇸 🇬🇧 🇨🇦 🇦🇺 🇳🇿 🇯🇵 🇰🇷 🇨🇳 🇸🇬 🇫🇷 🇩🇪 🇮🇹 🇪🇸 🇵🇹 🇧🇷 🇲🇽 🇦🇷 🇿🇦 🇳🇬 🇪🇬 🇸🇦 🇦🇪 🇹🇷 🇷🇺 🇺🇦 🇵🇰 🇧🇩 🇱🇰 🇳🇵 🇹🇭 🇻🇳 🇮🇩 🇲🇾 🇵🇭 🇮🇪 🇳🇱 🇸🇪 🇳🇴 🇩🇰 🇫🇮 🇨🇭 🇬🇷 🇮🇱 🇵🇸 🇺🇳".split(" ") },
];
const reactions = ["❤️", "😂", "👍", "🔥", "😮", "😢"];

const formatDateSeparator = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  if (sameDay(date, today)) return "Today";
  if (sameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "long",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
};
const ChatContainer = () => {
  const {
    messages,
    hasMoreMessages,
    loadingOlderMessages,
    loadOlderMessages,
    selectedUser,
    setSelectedUser,
    sendMessage,
    typingUsers,
    sendTyping,
    updateMessage,
    deleteMessage,
    searchMessages,
    togglePinMessage,
  } = useContext(ChatContext);
  const { authUser, onlineUsers, socketStatus, wallpapers, updateWallpaper, loadWallpaper, preferences } = useContext(AuthContext);
  const scrollEnd = useRef(null);
  const messageListRef = useRef(null);
  const previousScrollHeight = useRef(null);
  const composerInputRef = useRef(null);
  const typingTimer = useRef(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [replyTo, setReplyTo] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojiCategory, setEmojiCategory] = useState("smileys");
  const [emojiSearch, setEmojiSearch] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const [showContactAbout, setShowContactAbout] = useState(false);
  const [wallpaperMenuOpen, setWallpaperMenuOpen] = useState(false);
  const handleSendMessage = async (e) => {
    e?.preventDefault?.();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const sent = await sendMessage({ text, replyTo: replyTo?._id || null });
      if (!sent) return;
      setInput("");
      setReplyTo(null);
      setShowEmoji(false);
      sendTyping(selectedUser._id, false);
    } finally {
      setSending(false);
    }
  };
  const handleSendImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Only image files are allowed");
      e.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5 MB");
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onloadend = async () => {
      const sent = await sendMessage({
        image: reader.result,
        replyTo: replyTo?._id || null,
      });
      if (sent) setReplyTo(null);
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };
  useEffect(() => {
    const list = messageListRef.current;
    if (previousScrollHeight.current !== null && list) {
      const heightBefore = previousScrollHeight.current;
      previousScrollHeight.current = null;
      requestAnimationFrame(() => {
        if (messageListRef.current) {
          messageListRef.current.scrollTop += messageListRef.current.scrollHeight - heightBefore;
        }
      });
      return;
    }
    scrollEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => {
    if (!searchOpen || !selectedUser || !search.trim()) {
      setSearchResults([]);
      return;
    }
    const t = setTimeout(
      async () =>
        setSearchResults(await searchMessages(selectedUser._id, search)),
      250,
    );
    return () => clearTimeout(t);
  }, [search, searchOpen, selectedUser?._id]);
  useEffect(() => {
    if (selectedUser?._id) loadWallpaper(selectedUser._id);
  }, [selectedUser?._id]);

  useEffect(() => () => clearTimeout(typingTimer.current), []);
  useEffect(() => {
    if (replyTo) composerInputRef.current?.focus();
  }, [replyTo]);
  const replyMessage = (id) =>
    messages.find((m) => m._id === (typeof id === "object" ? id?._id : id));
  const onTyping = (value) => {
    setInput(value);
    if (!selectedUser) return;
    sendTyping(selectedUser._id, Boolean(value.trim()));
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(
      () => sendTyping(selectedUser._id, false),
      900,
    );
  };
  const beginEdit = (msg) => {
    setEditingId(msg._id);
    setEditText(msg.text || "");
  };
  const submitEdit = async (id) => {
    await updateMessage(id, { text: editText });
    setEditingId(null);
  };
  const scrollTo = (id) =>
    document
      .getElementById(`message-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  const lastSeenLabel = formatLastSeen(selectedUser?.lastSeen);
  const pinnedMessages = messages
    .filter((m) => m.isPinned && !m.deletedAt)
    .sort(
      (a, b) =>
        new Date(b.pinnedAt || b.createdAt) -
        new Date(a.pinnedAt || a.createdAt),
    );

  if (!selectedUser)
    return (
      <div className="qc-empty h-full flex flex-col items-center justify-center text-center p-8">
        <img
          src={assets.logo_big}
          alt="QuickChat"
          className="w-28 opacity-90 mb-5"
        />
        <h2 className="text-2xl font-semibold text-white">
          Your conversations, your space.
        </h2>
        <p className="text-sm text-white/40 mt-2">
          Choose a contact to start messaging.
        </p>
      </div>
    );
  return (
    <main
      className="qc-chat h-full relative flex flex-col min-w-0"
      data-wallpaper={wallpapers[selectedUser._id] || "default"}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        const msg = replyMessage(e.dataTransfer.getData("text/message-id"));
        if (msg) setReplyTo(msg);
      }}
    >
      <header className="qc-chat-header flex items-center gap-3 px-4 md:px-5 py-3 md:py-4">
        <button
          onClick={() => setSelectedUser(null)}
          className="md:hidden text-white/70 text-xl"
          aria-label="Back to contacts"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => setShowContactAbout(true)}
          aria-label={`View ${selectedUser.fullName}'s profile`}
          className="shrink-0 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
        >
          <img
            src={selectedUser.profilePic || assets.avatar_icon}
            alt={`${selectedUser.fullName}'s profile picture`}
            className="qc-chat-avatar w-10 h-10 rounded-full object-cover"
          />
        </button>
        <button
          type="button"
          onClick={() => setShowContactAbout(true)}
          className="flex-1 min-w-0 text-left rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
          aria-label={`View ${selectedUser.fullName}'s profile`}
        >
          <p className="font-semibold text-white truncate">
            {selectedUser.fullName}
          </p>
          <p className="qc-chat-presence text-xs text-white/45">
  {socketStatus !== "connected" ? (
    <span className="inline-flex items-center gap-1.5 text-amber-300">
      <span className={`h-2 w-2 rounded-full ${socketStatus === "connecting" ? "animate-pulse bg-amber-300" : "bg-amber-400"}`} />
      {socketStatus === "connecting" ? "Connecting…" : socketStatus === "reconnecting" ? "Reconnecting…" : "Offline"}
    </span>
  ) : typingUsers[selectedUser._id] ? (
    <span className="text-violet-300">Typing…</span>
  ) : onlineUsers.includes(selectedUser._id) ? (
    <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
      Online
    </span>
  ) : (
    lastSeenLabel
  )}
</p>
        </button>
        <div className="qc-chat-theme-picker">
          <button
            type="button"
            className="qc-chat-theme-trigger"
            aria-label="Change conversation theme"
            aria-expanded={wallpaperMenuOpen}
            onClick={() => setWallpaperMenuOpen((open) => !open)}
            title="Change conversation theme"
          >
            <span className={`qc-theme-trigger-swatch ${wallpapers[selectedUser._id] || "default"}`} />
            <span className="qc-theme-trigger-label">Theme</span>
            <span className="qc-theme-trigger-chevron">⌄</span>
          </button>
          {wallpaperMenuOpen && (
            <div className="qc-chat-theme-menu" role="group" aria-label="Conversation themes">
              <div className="qc-theme-menu-heading">
                <div><b>Choose a look</b><small>Conversation theme</small></div>
                <span>12 THEMES</span>
              </div>
              <div className="qc-chat-theme-grid">
                {[
                  { id: "default", label: "Classic" },
                  { id: "midnight", label: "Midnight" },
                  { id: "ocean", label: "Ocean" },
                  { id: "forest", label: "Forest" },
                  { id: "sunset", label: "Sunset" },
                  { id: "aurora", label: "Aurora" },
                  { id: "stardust", label: "Stardust" },
                  { id: "geometry", label: "Geometry" },
                  { id: "glass", label: "Glass" },
                  { id: "minimal", label: "Minimal" },
                  { id: "dreamscape", label: "Dreamscape" },
                  { id: "ember", label: "Ember" },
                ].map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`qc-chat-theme-tile ${(wallpapers[selectedUser._id] || "default") === item.id ? "active" : ""}`}
                    onClick={() => {
                      updateWallpaper(selectedUser._id, item.id);
                      setWallpaperMenuOpen(false);
                    }}
                    aria-pressed={(wallpapers[selectedUser._id] || "default") === item.id}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <span className={`qc-theme-tile-art ${item.id}`} />
                    <span>{item.label}</span>
                    {(wallpapers[selectedUser._id] || "default") === item.id && <i aria-hidden="true">✓</i>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          className="qc-icon-btn"
          onClick={() => {
            setSearchOpen((v) => !v);
            setSearch("");
          }}
          title="Search messages"
        >
          ⌕
        </button>
      </header>
      {showContactAbout && (
        <div className="fixed inset-0 z-[150] bg-[#0d0b16] text-white md:hidden">
          <div className="flex h-full flex-col">
            <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
              <button
                type="button"
                onClick={() => setShowContactAbout(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-2xl text-white/75 hover:bg-white/10"
                aria-label="Back to conversation"
              >
                ‹
              </button>
              <div>
                <p className="font-semibold">Contact info</p>
                <p className="text-[11px] text-white/40">QuickChat profile</p>
              </div>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-9">
              <div className="flex flex-col items-center text-center">
                <ProfileImagePreview
                  src={selectedUser.profilePic || assets.avatar_icon}
                  alt={`${selectedUser.fullName}'s profile picture`}
                  className="h-28 w-28 rounded-full object-cover ring-4 ring-violet-400/15"
                />
                <h2 className="mt-5 text-xl font-semibold">{selectedUser.fullName}</h2>
                {selectedUser.username && (
                  <p className="mt-1 text-sm text-violet-200">@{selectedUser.username}</p>
                )}
                <p className="mt-3 text-xs text-white/50">
                  {onlineUsers.includes(selectedUser._id) ? (
                    <span className="text-emerald-400">● Online</span>
                  ) : lastSeenLabel}
                </p>
              </div>
              <section className="mt-9 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-violet-200/80">About</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/75">
                  {selectedUser.bio || "No bio added yet."}
                </p>
              </section>
              <section className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-violet-200/80">Contact status</p>
                <p className="mt-3 text-sm text-white/70">
                  {onlineUsers.includes(selectedUser._id) ? "Currently online" : lastSeenLabel}
                </p>
              </section>
            </div>
            <div className="border-t border-white/10 p-4">
              <button
                type="button"
                onClick={() => setShowContactAbout(false)}
                className="w-full rounded-xl bg-violet-500/15 py-3 text-sm font-medium text-violet-200"
              >
                Back to chat
              </button>
            </div>
          </div>
        </div>
      )}
      {pinnedMessages.length > 0 && (
        <button
          onClick={() => scrollTo(pinnedMessages[0]._id)}
          className="qc-pinned-banner mx-4 mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-left"
        >
          <span>📌</span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] uppercase tracking-wider opacity-60">
              Pinned message · {pinnedMessages.length}
            </span>
            <span className="block truncate text-xs">
              {pinnedMessages[0].text || "Shared image"}
            </span>
          </span>
          <span className="text-xs opacity-60">View ↗</span>
        </button>
      )}
      {searchOpen && (
        <div className="qc-search-bar px-4 py-3">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages in this conversation…"
            className="qc-input w-full"
          />
          {searchResults.length > 0 && (
            <div className="qc-search-results mt-2">
              {searchResults.map((m) => (
                <button
                  key={m._id}
                  onClick={() => {
                    scrollTo(m._id);
                    setSearchOpen(false);
                  }}
                  className="block w-full text-left p-2 rounded-lg hover:bg-white/5"
                >
                  <span className="block text-xs text-white/80 truncate">
                    {m.text}
                  </span>
                  <span className="text-[10px] text-white/35">
                    {formatMessageTime(m.createdAt)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <section
        ref={messageListRef}
        onScroll={(event) => {
          if (event.currentTarget.scrollTop <= 48 && hasMoreMessages && !loadingOlderMessages) {
            previousScrollHeight.current = event.currentTarget.scrollHeight;
            loadOlderMessages();
          }
        }}
        onClick={() => setSelectedMessageId(null)}
        className={`qc-message-list flex-1 overflow-y-auto px-4 md:px-7 py-5 space-y-3 ${dragActive ? "qc-drop-active" : ""}`}
      >
        {loadingOlderMessages && (
          <p className="py-2 text-center text-xs text-white/40">Loading older messages…</p>
        )}
        {messages.map((msg, index) => {
          const mine =
            msg.senderId === authUser?._id ||
            msg.senderId?._id === authUser?._id;
          const quoted =
            msg.replyTo &&
            (typeof msg.replyTo === "object"
              ? msg.replyTo
              : replyMessage(msg.replyTo));
          const currentDate = formatDateSeparator(msg.createdAt);
          const previousDate =
            index > 0 ? formatDateSeparator(messages[index - 1].createdAt) : "";
          return (
            <React.Fragment key={msg._id}>
              {currentDate && currentDate !== previousDate && (
                <div className="qc-date-separator" aria-label={currentDate}>
                  <span>{currentDate}</span>
                </div>
              )}
            <div
              id={`message-${msg._id}`}
              key={msg._id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <div
                draggable
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedMessageId((current) =>
                    current === msg._id ? null : msg._id,
                  );
                }}
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/message-id", msg._id);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                className={`qc-message group relative max-w-[84%] md:max-w-[68%] ${mine ? "mine" : "theirs"}`}
              >
                {selectedMessageId === msg._id && (
                  <div
                    className={`qc-message-actions ${reactionPickerMessageId === msg._id ? "reaction-picker-open" : ""}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setReplyTo(msg);
                        setSelectedMessageId(null);
                      }}
                      title="Reply"
                    >
                      ↩
                    </button>
                    <div className="qc-reaction-menu">
                      {reactions.map((em) => (
                        <button
                          type="button"
                          key={em}
                          title={`React with ${em}`}
                          onClick={() => updateMessage(msg._id, { emoji: em })}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => togglePinMessage(msg._id)}
                      title={msg.isPinned ? "Unpin message" : "Pin message"}
                    >
                      {msg.isPinned ? "📌" : "⌖"}
                    </button>
                    {mine && !msg.deletedAt && msg.text && (
                      <button onClick={() => beginEdit(msg)} title="Edit">
                        ✎
                      </button>
                    )}
                    {mine && !msg.deletedAt && (
                      <button
                        onClick={() => {
                          if (
                            window.confirm("Delete this message for everyone?")
                          )
                            deleteMessage(msg._id);
                        }}
                        title="Delete"
                      >
                        ⌫
                      </button>
                    )}
                  </div>
                )}
                {quoted && (
                  <button
                    onClick={() => scrollTo(quoted._id)}
                    className="qc-quoted block w-full text-left mb-2"
                  >
                    <span className="block text-[10px] text-violet-200">
                      ↪ Replying to message
                    </span>
                    <span className="block text-xs truncate">
                      {quoted.text || "📷 Image"}
                    </span>
                  </button>
                )}
                {msg.deletedAt ? (
                  <p className="text-sm italic text-white/45">
                    This message was deleted
                  </p>
                ) : editingId === msg._id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="qc-edit-input"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => submitEdit(msg._id)}
                        className="qc-mini-primary"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-xs text-white/60"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {msg.image && (
                      <img
                        src={msg.image}
                        className="max-w-full max-h-64 rounded-xl mb-1"
                        alt="Shared attachment"
                      />
                    )}
                    {msg.text && (
                      <p className="whitespace-pre-wrap break-words text-sm">
                        {msg.text}
                      </p>
                    )}
                  </>
                )}
                {!!msg.reactions?.length && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {msg.reactions.map((r, i) => (
                      <span
                        key={`${r.userId}-${i}`}
                        className="qc-reaction-chip"
                      >
                        {r.emoji}
                      </span>
                    ))}
                  </div>
                )}
                {msg.isPinned && (
                  <span className="mr-2 text-[10px] text-violet-200">
                    📌 Pinned
                  </span>
                )}
                <div className="qc-message-meta flex items-center justify-between gap-5 mt-1">
                  {preferences.showTimestamps && <span className="text-[10px] text-white/45">
                    {formatMessageTime(msg.createdAt)}
                    {msg.editedAt ? " · edited" : ""}
                  </span>}
                  {mine && (
                    <span className="text-[10px] text-white/55">
                      {msg.readAt || msg.seen
                        ? "✓✓ Seen"
                        : msg.deliveredAt
                          ? "✓✓ Delivered"
                          : "✓ Sent"}
                    </span>
                  )}
                </div>
              </div>
            </div>
            </React.Fragment>
          );
        })}
        <div ref={scrollEnd} />
      </section>
      {dragActive && (
        <div className="absolute inset-x-5 bottom-24 qc-drop-hint pointer-events-none">
          Drop message here to reply
        </div>
      )}
      <form
        onSubmit={handleSendMessage}
        className="qc-composer-wrap p-2.5 md:p-4"
      >
        {replyTo && (
          <div className="qc-reply-preview flex items-center gap-3 mb-2 px-3 py-2">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-violet-200">Replying to message</p>
              <p className="text-xs truncate text-white/75">
                {replyTo.text || "📷 Image"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="text-white/60"
            >
              ✕
            </button>
          </div>
        )}
        <div className="qc-composer flex items-center gap-2 px-2.5 py-2 md:px-3">
          <div className="relative">
            <button
              type="button"
              className="qc-tool-btn"
              onClick={() => setShowEmoji((v) => !v)}
              aria-label="Emoji picker"
            >
              ☺
            </button>
            {showEmoji && (
              <div className="qc-emoji-popover" role="dialog" aria-label="Emoji picker">
                <div className="qc-emoji-header">
                  <div><strong>Emoji</strong><small>Pick the perfect reaction</small></div>
                  <button type="button" className="qc-emoji-close" onClick={() => setShowEmoji(false)} aria-label="Close emoji picker">×</button>
                </div>
                <input
                  className="qc-emoji-search"
                  type="search"
                  value={emojiSearch}
                  onChange={(e) => setEmojiSearch(e.target.value)}
                  placeholder="Search emoji by name or symbol…"
                  aria-label="Search emoji"
                />
                {!emojiSearch && (
                  <div className="qc-emoji-categories" role="tablist" aria-label="Emoji categories">
                    {emojiCategories.map((category) => (
                      <button
                        type="button"
                        key={category.id}
                        role="tab"
                        aria-selected={emojiCategory === category.id}
                        className={emojiCategory === category.id ? "active" : ""}
                        onClick={() => setEmojiCategory(category.id)}
                        title={category.label}
                      >{category.icon}</button>
                    ))}
                  </div>
                )}
                <div className="qc-emoji-section-label">{emojiSearch ? "Matching emoji" : emojiCategories.find((category) => category.id === emojiCategory)?.label}</div>
                <div className="qc-emoji-grid">
                  {(emojiSearch
                    ? emojiCategories.flatMap((category) => category.emojis).filter((emoji, index, all) => all.indexOf(emoji) === index && emoji.includes(emojiSearch.trim()))
                    : emojiCategories.find((category) => category.id === emojiCategory)?.emojis || []
                  ).map((em, index) => (
                    <button
                      type="button"
                      key={em + index}
                      onClick={() => {
                        setInput((value) => value + em);
                        composerInputRef.current?.focus();
                      }}
                      aria-label={`Insert ${em}`}
                    >{em}</button>
                  ))}
                </div>
                {emojiSearch && !emojiCategories.some((category) => category.emojis.some((emoji) => emoji.includes(emojiSearch.trim()))) && (
                  <p className="qc-emoji-no-results">No matching emoji found.</p>
                )}
              </div>
            )}
          </div>
          <input
            ref={composerInputRef}
            onChange={(e) => onTyping(e.target.value)}
            value={input}
            onKeyDown={(e) => {
              if (e.key === "Escape") setReplyTo(null);
              if (preferences.enterToSend && e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Write a message…"
            aria-label="Write a message"
            className="qc-composer-input flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/35 min-w-0"
          />
          <input
            onChange={handleSendImage}
            type="file"
            id="image"
            accept="image/*"
            hidden
          />
          <label
            htmlFor="image"
            className="qc-tool-btn cursor-pointer"
            title="Attach an image only"
            aria-label="Attach image"
          >
            ＋
          </label>
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="qc-send-btn"
            aria-label="Send message"
          >
            {sending ? "…" : "➤"}
          </button>
        </div>
      </form>
    </main>
  );
};
export default ChatContainer;

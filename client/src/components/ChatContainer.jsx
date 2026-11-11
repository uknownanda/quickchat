import React, { useContext, useEffect, useRef, useState } from "react";
import assets from "../assets/assets";
import { formatMessageTime } from "../lib/utils";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import { formatLastSeen } from "../lib/utils";
import toast from "react-hot-toast";

const emojiSet = [
  "😀",
  "😂",
  "🥹",
  "😍",
  "🥰",
  "😎",
  "😭",
  "🤔",
  "👍",
  "👏",
  "❤️",
  "🔥",
  "🎉",
  "🙏",
  "✨",
  "💯",
];
const reactions = ["❤️", "😂", "👍", "🔥", "😮", "😢"];
const ChatContainer = () => {
  const {
    messages,
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
  const { authUser, onlineUsers } = useContext(AuthContext);
  const scrollEnd = useRef(null);
  const typingTimer = useRef(null);
  const [input, setInput] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  const handleSendMessage = async (e) => {
    e?.preventDefault?.();
    if (!input.trim()) return;
    await sendMessage({ text: input.trim(), replyTo: replyTo?._id || null });
    setInput("");
    setReplyTo(null);
    setShowEmoji(false);
    sendTyping(selectedUser._id, false);
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
      await sendMessage({
        image: reader.result,
        replyTo: replyTo?._id || null,
      });
      setReplyTo(null);
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };
  useEffect(() => {
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
  useEffect(() => () => clearTimeout(typingTimer.current), []);
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
      <header className="qc-chat-header flex items-center gap-3 px-5 py-4">
        <button
          onClick={() => setSelectedUser(null)}
          className="md:hidden text-white/70 text-xl"
        >
          ‹
        </button>
        <img
          src={selectedUser.profilePic || assets.avatar_icon}
          className="w-10 h-10 rounded-full object-cover"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white truncate">
            {selectedUser.fullName}
          </p>
          <p className="text-xs text-white/45">
  {typingUsers[selectedUser._id] ? (
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
        <img
  src={assets.logo_icon}
  alt="QuickChat"
  className="w-9 h-9 object-contain opacity-90 ml-2"
/>
      </header>
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
        onClick={() => setSelectedMessageId(null)}
        className={`flex-1 overflow-y-auto px-4 md:px-7 py-5 space-y-3 ${dragActive ? "qc-drop-active" : ""}`}
      >
        {messages.map((msg) => {
          const mine =
            msg.senderId === authUser?._id ||
            msg.senderId?._id === authUser?._id;
          const quoted =
            msg.replyTo &&
            (typeof msg.replyTo === "object"
              ? msg.replyTo
              : replyMessage(msg.replyTo));
          return (
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
                    className="qc-message-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button onClick={() => setReplyTo(msg)} title="Reply">
                      ↩
                    </button>
                    <div className="qc-reaction-menu">
                      {reactions.map((em) => (
                        <button
                          key={em}
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
                  <span className="text-[10px] text-white/45">
                    {formatMessageTime(msg.createdAt)}
                    {msg.editedAt ? " · edited" : ""}
                  </span>
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
          );
        })}
        <div ref={scrollEnd} />
      </section>
      {typingUsers[selectedUser._id] && (
        <div className="px-5 pb-1 text-[11px] text-violet-300">typing…</div>
      )}
      {dragActive && (
        <div className="absolute inset-x-5 bottom-24 qc-drop-hint pointer-events-none">
          Drop message here to reply
        </div>
      )}
      <form
        onSubmit={handleSendMessage}
        className="qc-composer-wrap p-3 md:p-4"
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
        <div className="qc-composer flex items-center gap-2 px-3 py-2">
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
              <div className="qc-emoji-popover">
                {emojiSet.map((em) => (
                  <button
                    type="button"
                    key={em}
                    onClick={() => setInput((v) => v + em)}
                  >
                    {em}
                  </button>
                ))}
              </div>
            )}
          </div>
          <input
            onChange={(e) => onTyping(e.target.value)}
            value={input}
            onKeyDown={(e) => {
              if (e.key === "Escape") setReplyTo(null);
            }}
            placeholder="Write a message…"
            className="flex-1 bg-transparent outline-none text-sm text-white placeholder:text-white/35 min-w-0"
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
            disabled={!input.trim()}
            className="qc-send-btn"
            aria-label="Send message"
          >
            ➤
          </button>
        </div>
      </form>
    </main>
  );
};
export default ChatContainer;

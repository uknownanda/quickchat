import React, { useContext, useEffect, useMemo, useState } from "react";
import assets from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../../context/AuthContext";
import { ChatContext } from "../../context/ChatContext";
import toast from "react-hot-toast";
import ProfileImagePreview from "./ProfileImagePreview";

const formatContactTime = (date) => {
  if (!date) return "";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "";
  const now = new Date();
  if (value.toDateString() === now.toDateString()) return value.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (value.toDateString() === yesterday.toDateString()) return "Yesterday";
  return value.toLocaleDateString([], { month: "short", day: "numeric" });
};

const filters = [
  { id: "all", label: "All" },
  { id: "online", label: "Online" },
  { id: "unread", label: "Unread" },
];

const Sidebar = () => {
  const {
    getUsers,
    users,
    selectedUser,
    setSelectedUser,
    unseenMessages,
    setUnseenMessages,
  } = useContext(ChatContext);
  const { authUser, logout, onlineUsers, axios } = useContext(AuthContext);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [requests, setRequests] = useState({ received: [], sent: [] });
  const [showDiscover, setShowDiscover] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const navigate = useNavigate();

  const loadRequests = async () => {
    try {
      const { data } = await axios.get("/api/contacts/requests");
      if (data.success) setRequests(data);
    } catch (error) {
      console.error("Load contact requests:", error);
    }
  };

  useEffect(() => {
    getUsers();
    loadRequests();
  }, [onlineUsers]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }
      try {
        const { data } = await axios.get(
          `/api/contacts/search?q=${encodeURIComponent(query.trim())}`,
        );
        setResults(data.users || []);
      } catch (error) {
        toast.error(error.response?.data?.message || "Search failed");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const invite = async (id) => {
    try {
      await axios.post(`/api/contacts/requests/${id}`);
      toast.success("Invitation sent");
      setResults((old) =>
        old.map((user) =>
          user._id === id ? { ...user, relationship: "sent" } : user,
        ),
      );
      loadRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not send invitation");
    }
  };

  const respond = async (id, action) => {
    try {
      await axios.patch(`/api/contacts/requests/${id}`, { action });
      toast.success(
        action === "accept" ? "Contact added" : "Invitation declined",
      );
      await Promise.all([getUsers(), loadRequests()]);
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Could not update invitation",
      );
    }
  };

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users
      .filter((user) => {
        const matchesQuery =
          !normalizedQuery ||
          user.fullName?.toLowerCase().includes(normalizedQuery) ||
          user.username?.toLowerCase().includes(normalizedQuery);
        const isOnline = onlineUsers.includes(user._id);
        const hasUnread = Number(unseenMessages[user._id]) > 0;
        const matchesFilter =
          activeFilter === "all" ||
          (activeFilter === "online" && isOnline) ||
          (activeFilter === "unread" && hasUnread);
        return matchesQuery && matchesFilter;
      })
      .sort((a, b) => {
        // Keep the most recently active conversations at the top.
        // Contacts without messages remain below active conversations.
        const aLastActivity = a.lastMessage?.createdAt
          ? new Date(a.lastMessage.createdAt).getTime()
          : 0;
        const bLastActivity = b.lastMessage?.createdAt
          ? new Date(b.lastMessage.createdAt).getTime()
          : 0;
        return bLastActivity - aLastActivity;
      });
  }, [users, query, activeFilter, onlineUsers, unseenMessages]);

  const totalUnread = Object.values(unseenMessages).reduce(
    (total, count) => total + (Number(count) || 0),
    0,
  );

  const selectContact = (user) => {
    setSelectedUser(user);
    setUnseenMessages((previous) => ({ ...previous, [user._id]: 0 }));
  };

  const openProfile = () => {
    setShowAccountMenu(false);
    navigate("/profile");
  };

  return (
    <aside
      className={`qc-sidebar h-full min-h-0 p-4 md:p-5 rounded-r-2xl overflow-y-auto text-white flex flex-col ${selectedUser ? "max-md:hidden" : ""}`}
    >
      <div className="flex items-center justify-between gap-3 pb-5">
        <div className="min-w-0">
          <div className="text-2xl font-bold tracking-tight">
            Quick<span className="qc-gradient-text">Chat</span>
          </div>
          <p className="mt-0.5 text-xs text-white/45">Your private space</p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowAccountMenu((open) => !open)}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.045] p-1.5 transition hover:border-violet-300/25 hover:bg-white/[0.08]"
            aria-label="Open account menu"
            aria-expanded={showAccountMenu}
          >
            <span className="relative">
              <img
                src={authUser?.profilePic || assets.avatar_icon}
                alt="Your profile"
                className="h-9 w-9 rounded-full object-cover"
              />
              <i className="qc-online-dot online" />
            </span>
            <span className="hidden min-w-0 text-left sm:block">
              <span className="block max-w-[100px] truncate text-xs font-semibold">
                {authUser?.fullName || "Your account"}
              </span>
              <span className="block text-[10px] text-emerald-300">Online</span>
            </span>
            <span className="px-1 text-sm text-white/55">⌄</span>
          </button>
          {showAccountMenu && (
            <>
              <button
                type="button"
                aria-label="Close account menu"
                className="fixed inset-0 z-20 cursor-default"
                onClick={() => setShowAccountMenu(false)}
              />
              <div className="qc-account-menu absolute right-0 top-full z-30 mt-2 w-48 rounded-xl border border-white/10 bg-[#211b35] p-2 shadow-2xl">
                <button
                  type="button"
                  onClick={openProfile}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-white/85 hover:bg-white/[0.07]"
                >
                  <span>♙</span> Edit profile
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAccountMenu(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-rose-300 hover:bg-rose-400/10"
                >
                  <span>↪</span> Log out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          setShowDiscover((isOpen) => {
            if (isOpen) setQuery("");
            else setActiveFilter("all");
            return !isOpen;
          });
        }}
        className="qc-primary-btn mb-3 flex w-full items-center justify-center gap-2"
        aria-expanded={showDiscover}
        aria-controls="quickchat-discover-panel"
      >
        <span className="text-base leading-none">＋</span> Find people
      </button>

      {showDiscover && (
        <section
          id="quickchat-discover-panel"
          className="qc-panel qc-sidebar-reveal mb-4 p-3"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Discover people</p>
            <button
              type="button"
              onClick={() => {
                setShowDiscover(false);
                setQuery("");
              }}
              className="rounded-md px-2 py-1 text-xs text-white/45 hover:bg-white/10 hover:text-white"
              aria-label="Close people search"
            >
              ×
            </button>
          </div>
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by username or name"
            aria-label="Search people by username or name"
            className="qc-input w-full"
          />
          <div className="mt-3 max-h-44 space-y-2 overflow-y-auto">
            {results.map((user) => (
              <div
                key={user._id}
                className="flex items-center gap-2 text-sm"
              >
                <ProfileImagePreview
                  src={user.profilePic || assets.avatar_icon}
                  alt={`${user.fullName}'s profile picture`}
                  className="h-8 w-8 rounded-full object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate">{user.fullName}</p>
                  <p className="truncate text-[10px] text-white/40">
                    @{user.username}
                  </p>
                </div>
                {user.relationship === "none" ||
                user.relationship === "rejected" ? (
                  <button
                    type="button"
                    onClick={() => invite(user._id)}
                    className="qc-small-btn"
                  >
                    Invite
                  </button>
                ) : (
                  <span className="text-[10px] text-violet-200">
                    {user.relationship === "contact"
                      ? "Connected"
                      : user.relationship === "sent"
                        ? "Pending"
                        : "Requested you"}
                  </span>
                )}
              </div>
            ))}
            {query.trim().length >= 2 && !results.length && (
              <p className="py-2 text-xs text-white/40">
                No matching people found.
              </p>
            )}
            {query.trim().length < 2 && (
              <p className="py-2 text-xs text-white/40">
                Enter at least 2 characters to search.
              </p>
            )}
          </div>
        </section>
      )}

      {!!requests.received?.length && (
        <section className="qc-panel qc-sidebar-reveal mb-4 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">Invitations</p>
              <p className="text-[10px] text-white/40">
                People who want to connect
              </p>
            </div>
            <span className="qc-count">{requests.received.length}</span>
          </div>
          <div className="space-y-1">
            {requests.received.map((request) => (
              <div
                key={request._id}
                className="flex items-center gap-2 py-2"
              >
                <ProfileImagePreview
                  src={request.sender?.profilePic || assets.avatar_icon}
                  alt={`${request.sender?.fullName || "Contact"}'s profile picture`}
                  className="h-8 w-8 rounded-full object-cover"
                />
                <p className="min-w-0 flex-1 truncate text-xs">
                  {request.sender?.fullName}
                </p>
                <button
                  type="button"
                  onClick={() => respond(request._id, "accept")}
                  className="qc-small-btn"
                >
                  Accept
                </button>
                <button
                  type="button"
                  onClick={() => respond(request._id, "reject")}
                  className="rounded-lg px-2 py-1 text-xs text-white/45 transition hover:bg-white/10 hover:text-white"
                  aria-label={`Decline invitation from ${request.sender?.fullName || "contact"}`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[.16em] text-white/65">
            Messages
          </p>
          <p className="mt-0.5 text-[10px] text-white/35">
            {users.length} {users.length === 1 ? "contact" : "contacts"}
          </p>
        </div>
        {totalUnread > 0 && (
          <span className="qc-sidebar-unread">
            {totalUnread > 99 ? "99+" : totalUnread} unread
          </span>
        )}
      </div>

      <label className="qc-sidebar-search mb-3 flex items-center gap-2 rounded-xl px-3">
        <span className="text-base text-white/40" aria-hidden="true">⌕</span>
        <input
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            if (showDiscover) setShowDiscover(false);
          }}
          placeholder="Search contacts"
          aria-label="Search contacts"
          className="w-full min-w-0 bg-transparent py-1.5 text-[11px] leading-4 text-white outline-none ring-0 placeholder:text-white/35 focus:outline-none focus:ring-0"
        />
        {query && !showDiscover && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="text-sm text-white/45 hover:text-white"
            aria-label="Clear contact search"
          >
            ×
          </button>
        )}
      </label>

      <div
        className="qc-sidebar-filters mb-3 grid grid-cols-3 gap-1 rounded-xl p-1"
        role="tablist"
        aria-label="Filter contacts"
      >
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={activeFilter === filter.id}
            onClick={() => setActiveFilter(filter.id)}
            className={`qc-sidebar-filter ${activeFilter === filter.id ? "active" : ""}`}
          >
            {filter.label}
            {filter.id === "online" && (
              <span className="ml-1 text-[9px] opacity-65">
                {users.filter((user) => onlineUsers.includes(user._id)).length}
              </span>
            )}
            {filter.id === "unread" && totalUnread > 0 && (
              <span className="ml-1 text-[9px] opacity-65">
                {users.filter((user) => Number(unseenMessages[user._id]) > 0).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="qc-sidebar-contact-list min-h-0 flex-1 space-y-1 overflow-y-auto">
        {filteredUsers.map((user) => {
          const isOnline = onlineUsers.includes(user._id);
          const unreadCount = Number(unseenMessages[user._id]) || 0;
          const isActive = selectedUser?._id === user._id;
          return (
            <div
              key={user._id}
              role="button"
              tabIndex={0}
              aria-pressed={isActive}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  selectContact(user);
                }
              }}
              onClick={() => selectContact(user)}
              className={`qc-contact qc-sidebar-contact w-full cursor-pointer rounded-xl p-2.5 text-left ${isActive ? "active" : ""}`}
            >
              <span className="relative shrink-0">
                <ProfileImagePreview
                  src={user.profilePic || assets.avatar_icon}
                  alt={`${user.fullName}'s profile picture`}
                  className="h-11 w-11 rounded-full object-cover"
                />
                <i className={`qc-online-dot ${isOnline ? "online" : ""}`} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center justify-between gap-2">
                  <span
                    className={`block truncate text-[13px] ${unreadCount ? "font-semibold text-white" : "font-medium text-white/90"}`}
                  >
                    {user.fullName}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5">
                    {user.lastMessage?.createdAt && <span className="text-[9px] text-white/35">{formatContactTime(user.lastMessage.createdAt)}</span>}
                    {unreadCount > 0 && <span className="qc-count">{unreadCount > 99 ? "99+" : unreadCount}</span>}
                  </span>
                </span>
                <span className="qc-sidebar-preview mt-1 block truncate text-[10px] text-white/45">
                  {user.lastMessage
                    ? user.lastMessage.deletedAt
                      ? "Message deleted"
                      : (user.lastMessage.senderId?.toString() === authUser?._id?.toString() ? "You: " : "") + (user.lastMessage.text || (user.lastMessage.image ? "📷 Photo" : "Message"))
                    : isOnline ? "Online" : "Offline"}
                </span>
              </span>
            </div>
          );
        })}
        {!filteredUsers.length && (
          <div className="qc-sidebar-empty px-3 py-9 text-center">
            <span className="mx-auto grid h-10 w-10 place-items-center rounded-2xl bg-violet-400/10 text-xl text-violet-200">
              {query.trim() ? "⌕" : activeFilter === "online" ? "◌" : activeFilter === "unread" ? "✓" : "✦"}
            </span>
            <p className="mt-3 text-xs font-medium text-white/70">
              {query.trim()
                ? "No contacts match your search"
                : activeFilter === "online"
                  ? "Nobody is online right now"
                  : activeFilter === "unread"
                    ? "You're all caught up"
                    : "No contacts yet"}
            </p>
            <p className="mt-1 text-[10px] leading-5 text-white/35">
              {query.trim()
                ? "Try another name or username."
                : activeFilter === "all"
                  ? "Find people and send an invitation to start chatting."
                  : "Try another filter to see your conversations."}
            </p>
            {activeFilter === "all" && !query.trim() && (
              <button
                type="button"
                onClick={() => setShowDiscover(true)}
                className="mt-3 text-xs font-semibold text-violet-200 hover:text-white"
              >
                Find people <span aria-hidden="true">→</span>
              </button>
            )}
          </div>
        )}
      </div>
      <div className="qc-sidebar-footer mt-3 flex items-center justify-between border-t border-white/[0.07] pt-3 text-[10px] text-white/30">
        <span>QuickChat</span>
        <span className="inline-flex items-center gap-1.5">
          <i className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Connected
        </span>
      </div>
    </aside>
  );
};

export default Sidebar;

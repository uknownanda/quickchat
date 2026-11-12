import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import { formatLastSeen } from "../lib/utils";
import assets from "../assets/assets";
import ProfileImagePreview from "./ProfileImagePreview";

const RightSidebar = () => {
  const { selectedUser, messages } = useContext(ChatContext);
  const { onlineUsers, axios } = useContext(AuthContext);
  const [activeImage, setActiveImage] = useState(null);
  const [msgImages, setMsgImages] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState("");
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  const loadSharedMedia = useCallback(async (signal) => {
    if (!selectedUser?._id) return;
    setMediaLoading(true);
    setMediaError("");
    try {
      const { data } = await axios.get(`/api/messages/media/${selectedUser._id}`, { signal });
      if (data.success) {
        setMsgImages((data.media || []).map((item) => ({
          url: item.image,
          id: item._id,
          date: item.createdAt,
        })));
      } else {
        setMediaError("Unable to load shared images.");
      }
    } catch (error) {
      if (error.code !== "ERR_CANCELED" && error.name !== "CanceledError") {
        console.error("Shared media load failed:", error);
        setMediaError(error.response?.data?.message || "Unable to load shared images.");
      }
    } finally {
      if (!signal?.aborted) setMediaLoading(false);
    }
  }, [selectedUser?._id, axios]);

  useEffect(() => {
    const controller = new AbortController();
    setMsgImages([]);
    setActiveImage(null);
    setMediaError("");
    if (selectedUser?._id) loadSharedMedia(controller.signal);
    return () => controller.abort();
  }, [selectedUser?._id, loadSharedMedia]);

  useEffect(() => {
    if (!activeImage) return undefined;
    previousFocusRef.current = document.activeElement;
    closeButtonRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape") setActiveImage(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus?.();
    };
  }, [activeImage]);

  if (!selectedUser) {
    return (
      <aside className="qc-right-empty h-full w-full flex items-center justify-center" aria-label="QuickChat">
        <img src={assets.logo_big} alt="QuickChat" className="w-36 max-w-[65%] opacity-80" />
      </aside>
    );
  }

  const isOnline = onlineUsers.includes(selectedUser._id);
  const pinnedMessages = messages
    .filter((message) => message.isPinned && !message.deletedAt)
    .sort((a, b) => new Date(b.pinnedAt || b.createdAt) - new Date(a.pinnedAt || a.createdAt));

  const copyUsername = async () => {
    if (!selectedUser.username || !navigator.clipboard?.writeText) return;
    try {
      await navigator.clipboard.writeText(`@${selectedUser.username}`);
    } catch (error) {
      console.error("Unable to copy username:", error);
    }
  };

  return (
    <>
      <aside className="qc-right-panel h-full w-full relative overflow-y-auto text-white">
        <div className="qc-profile-card flex flex-col items-center text-center">
          <div className="relative">
            <ProfileImagePreview
              src={selectedUser.profilePic || assets.avatar_icon}
              alt={`${selectedUser.fullName}'s profile picture`}
              className="qc-profile-avatar rounded-full object-cover ring-4 ring-violet-400/15"
            />
            <span
              aria-label={isOnline ? "Online" : "Offline"}
              className={`absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-[#11101b] ${isOnline ? "bg-emerald-400" : "bg-slate-500"}`}
            />
          </div>
          <h2 className="qc-profile-name text-lg font-semibold">{selectedUser.fullName}</h2>
          <p className="qc-profile-seen text-xs text-white/55">
            {isOnline ? "Online now" : formatLastSeen(selectedUser.lastSeen)}
          </p>
          {selectedUser.username && (
            <button
              type="button"
              onClick={copyUsername}
              title="Copy username"
              className="qc-profile-username rounded-full border border-violet-300/15 bg-violet-400/10 px-3 py-1 text-xs text-violet-200 hover:bg-violet-400/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"
            >
              @{selectedUser.username} · Copy
            </button>
          )}
          <p className="qc-profile-bio max-w-xs text-sm leading-relaxed text-white/55">
            {selectedUser.bio || "No bio added yet."}
          </p>
        </div>

        <div className="qc-right-divider border-t border-white/10" />

        <section className="qc-pinned-section" aria-labelledby="qc-pinned-heading">
          <div className="flex items-center justify-between">
            <h3 id="qc-pinned-heading" className="text-sm font-semibold tracking-tight">Pinned messages</h3>
            <span className="rounded-full px-2 py-1 text-[10px] text-white/60">{pinnedMessages.length}</span>
          </div>
          {pinnedMessages.length ? (
            <div className="mt-3 space-y-2">
              {pinnedMessages.slice(0, 5).map((message) => (
                <div key={message._id} className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                  <p className="line-clamp-3 text-xs text-white/80">
                    {message.text || (message.image ? "Image message" : "Pinned message")}
                  </p>
                  <p className="mt-1 text-[10px] text-white/40">
                    {message.pinnedAt ? new Date(message.pinnedAt).toLocaleDateString() : "Pinned"}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-white/40">Pinned messages will appear here.</p>
          )}
        </section>

        <div className="qc-right-divider my-4 border-t border-white/10" />

        <section className="qc-shared-section" aria-labelledby="qc-shared-heading">
          <div className="flex items-center justify-between">
            <h3 id="qc-shared-heading" className="text-sm font-semibold tracking-tight">Shared media</h3>
            <span className="qc-media-count rounded-full px-2 py-1 text-[10px] text-white/60">
              {mediaLoading ? "…" : msgImages.length}
            </span>
          </div>
          {mediaLoading ? (
            <div className="mt-4 grid grid-cols-3 gap-2" aria-label="Loading shared images" role="status">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="aspect-square animate-pulse rounded-xl bg-white/10" />
              ))}
            </div>
          ) : mediaError ? (
            <div className="qc-media-empty mt-4 rounded-xl border border-dashed border-white/10 px-4 py-6 text-center">
              <p className="text-xs text-white/60">{mediaError}</p>
              <button
                type="button"
                onClick={() => loadSharedMedia()}
                className="mt-3 rounded-lg bg-violet-500/20 px-3 py-2 text-xs text-violet-200 hover:bg-violet-500/30"
              >
                Try again
              </button>
            </div>
          ) : msgImages.length ? (
            <div className="qc-media-grid mt-3 grid grid-cols-3 gap-2">
              {msgImages.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveImage(item)}
                  aria-label={`Preview shared image from ${new Date(item.date).toLocaleDateString()}`}
                  className="qc-media-item group relative aspect-square overflow-hidden rounded-xl bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"
                >
                  <img
                    src={item.url}
                    alt="Shared image"
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/15" />
                </button>
              ))}
            </div>
          ) : (
            <div className="qc-media-empty mt-4 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
              <span className="text-2xl" aria-hidden="true">▧</span>
              <p className="mt-2 text-xs text-white/45">No shared images yet</p>
            </div>
          )}
        </section>
      </aside>

      {activeImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Shared image preview"
          onClick={() => setActiveImage(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setActiveImage(null)}
            className="absolute right-5 top-5 rounded-full bg-white/10 px-3 py-2 text-white hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"
            aria-label="Close image preview"
          >
            ✕
          </button>
          <img
            src={activeImage.url}
            alt="Shared image preview"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
};

export default RightSidebar;

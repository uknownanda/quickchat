import React, { useCallback, useContext, useEffect, useRef, useState } from "react";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import { formatLastSeen } from "../lib/utils";
import assets from "../assets/assets";

const RightSidebar = () => {
  const { selectedUser } = useContext(ChatContext);
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
          <div className="relative mb-3">
            <button
              type="button"
              onClick={() => setActiveImage({
                url: selectedUser.profilePic || assets.avatar_icon,
                alt: `${selectedUser.fullName}'s profile picture`,
              })}
              aria-label={`View ${selectedUser.fullName}'s profile picture`}
              title="View profile picture"
              className="group cursor-zoom-in rounded-full p-1 bg-gradient-to-br from-violet-400 via-fuchsia-400 to-indigo-500 shadow-lg shadow-violet-500/20 transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"
            >
              <img
                src={selectedUser.profilePic || assets.avatar_icon}
                alt={`${selectedUser.fullName}'s profile picture`}
                className="h-24 w-24 rounded-full border-4 border-[#11101b] object-cover"
                loading="lazy"
              />
            </button>
            <span
              aria-label={isOnline ? "Online" : "Offline"}
              className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-[3px] border-[#11101b] ${isOnline ? "bg-emerald-400" : "bg-slate-500"}`}
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
          aria-label={activeImage.alt || "Image preview"}
          onClick={() => setActiveImage(null)}
          className="fixed inset-0 z-[100] flex h-[100dvh] w-screen items-center justify-center overflow-hidden bg-black p-0"
        >
          <button
            ref={closeButtonRef}
            type="button"
            onClick={() => setActiveImage(null)}
            className="fixed right-5 top-5 z-[101] flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/60 text-xl text-white shadow-lg backdrop-blur-md transition hover:bg-white/20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-300"
            aria-label="Close image preview"
          >
            ✕
          </button>
          <img
            src={activeImage.url}
            alt={activeImage.alt || "Image preview"}
            onClick={(event) => event.stopPropagation()}
            className="h-auto w-auto max-h-[92dvh] max-w-[94vw] select-none object-contain object-center"
          />
        </div>
      )}
    </>
  );
};

export default RightSidebar;

import React, { useContext, useEffect, useState } from "react";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import { formatLastSeen } from "../lib/utils";
import assets from "../assets/assets";
import ProfileImagePreview from "./ProfileImagePreview";

const RightSidebar = () => {
  const { selectedUser } = useContext(ChatContext);
  const { onlineUsers, axios } = useContext(AuthContext);
  const [activeImage, setActiveImage] = useState(null);
  const [msgImages, setMsgImages] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setMsgImages([]);
    setActiveImage(null);
    if (!selectedUser?._id) return undefined;
    axios.get(`/api/messages/media/${selectedUser._id}`)
      .then(({ data }) => {
        if (!cancelled && data.success) {
          setMsgImages(data.media.map((item) => ({
            url: item.image,
            id: item._id,
            date: item.createdAt,
          })));
        }
      })
      .catch((error) => {
        console.error("Shared media load failed:", error);
      });
    return () => { cancelled = true; };
  }, [selectedUser?._id, axios]);

  if (!selectedUser)
    return (
      <aside
        className="qc-right-empty h-full w-full flex items-center justify-center"
        aria-label="QuickChat"
      >
        <img
          src={assets.logo_big}
          alt="QuickChat"
          className="w-36 max-w-[65%] opacity-80"
        />
      </aside>
    );
  const isOnline = onlineUsers.includes(selectedUser._id);

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
              className={`absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-[#11101b] ${isOnline ? "bg-emerald-400" : "bg-slate-500"}`}
            />
          </div>
          <h2 className="qc-profile-name text-lg font-semibold">
            {selectedUser.fullName}
          </h2>
          <p className="qc-profile-seen text-xs text-white/55">
            {isOnline ? "Online now" : formatLastSeen(selectedUser.lastSeen)}
          </p>
          {selectedUser.username && (
            <p className="qc-profile-username rounded-full border border-violet-300/15 bg-violet-400/10 px-3 py-1 text-xs text-violet-200">
              @{selectedUser.username}
            </p>
          )}
          <p className="qc-profile-bio max-w-xs text-sm leading-relaxed text-white/55">
            {selectedUser.bio || "No bio added yet."}
          </p>
        </div>
        <div className="qc-right-divider border-t border-white/10" />
        <section className="qc-shared-section">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold tracking-tight">Shared media</h3>
              
            </div>
            <span className="qc-media-count rounded-full px-2 py-1 text-[10px] text-white/60">
              {msgImages.length}
            </span>
          </div>
          {msgImages.length ? (
            <div className="qc-media-grid grid gap-3">
              {msgImages.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveImage(item)}
                  className="qc-media-item group relative aspect-square overflow-hidden rounded-2xl bg-white/5"
                >
                  <img
                    src={item.url}
                    alt="Shared media"
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/15" />
                </button>
              ))}
            </div>
          ) : (
            <div className="qc-media-empty mt-4 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
              <span className="text-2xl">▧</span>
              <p className="mt-2 text-xs text-white/45">No shared images yet</p>
            </div>
          )}
        </section>
      </aside>
      {activeImage && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
          onClick={() => setActiveImage(null)}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
        >
          <button
            onClick={() => setActiveImage(null)}
            className="absolute right-5 top-5 rounded-full bg-white/10 px-3 py-2 text-white"
            aria-label="Close image preview"
          >
            ✕
          </button>
          <img
            src={activeImage.url}
            alt="Shared image preview"
            onClick={(e) => e.stopPropagation()}
            className="max-h-[88vh] max-w-[92vw] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </>
  );
};
export default RightSidebar;

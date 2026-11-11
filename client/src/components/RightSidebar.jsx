import React, { useContext, useMemo, useState } from "react";
import { ChatContext } from "../../context/ChatContext";
import { AuthContext } from "../../context/AuthContext";
import { formatLastSeen } from "../lib/utils";
import assets from "../assets/assets";
import ProfileImagePreview from "./ProfileImagePreview";

const RightSidebar = () => {
  const { selectedUser, messages } = useContext(ChatContext);
  const { onlineUsers } = useContext(AuthContext);
  const [activeImage, setActiveImage] = useState(null);
  const msgImages = useMemo(
    () =>
      messages
        .filter((msg) => msg.image && !msg.deletedAt)
        .map((msg) => ({ url: msg.image, id: msg._id, date: msg.createdAt })),
    [messages],
  );

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
        <div className="px-5 pt-10 pb-6 flex flex-col items-center text-center">
          <div className="relative">
            <ProfileImagePreview
              src={selectedUser.profilePic || assets.avatar_icon}
              alt={`${selectedUser.fullName}'s profile picture`}
              className="w-24 h-24 rounded-full object-cover ring-4 ring-violet-400/15"
            />
            <span
              className={`absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full border-2 border-[#11101b] ${isOnline ? "bg-emerald-400" : "bg-slate-500"}`}
            />
          </div>
          <h2 className="mt-4 text-lg font-semibold">
            {selectedUser.fullName}
          </h2>
          <p className="mt-1 text-xs text-white/55">
            {isOnline ? "Online now" : formatLastSeen(selectedUser.lastSeen)}
          </p>
          {selectedUser.username && (
            <p className="mt-3 rounded-full border border-violet-300/15 bg-violet-400/10 px-3 py-1 text-xs text-violet-200">
              @{selectedUser.username}
            </p>
          )}
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/55">
            {selectedUser.bio || "No bio added yet."}
          </p>
        </div>
        <div className="mx-5 border-t border-white/10" />
        <section className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Shared media</h3>
              <p className="mt-0.5 text-[11px] text-white/40">
                Images exchanged in this conversation
              </p>
            </div>
            <span className="rounded-full bg-white/8 px-2 py-1 text-[10px] text-white/60">
              {msgImages.length}
            </span>
          </div>
          {msgImages.length ? (
            <div className="mt-4 grid grid-cols-3 gap-2">
              {msgImages.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveImage(item)}
                  className="group relative aspect-square overflow-hidden rounded-xl bg-white/5"
                >
                  <img
                    src={item.url}
                    alt="Shared media"
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                  />
                  <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/15" />
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-white/10 px-4 py-8 text-center">
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

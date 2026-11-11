import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const ProfileImagePreview = ({
  src,
  alt = "Profile picture",
  className = "",
}) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setOpen(true);
        }}
        onKeyDown={(event) => event.stopPropagation()}
        aria-label={`Preview ${alt.toLowerCase()}`}
        className="inline-flex shrink-0 cursor-zoom-in rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-violet-400"
      >
        <img src={src} alt={alt} className={className} />
      </button>

      {open &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Profile picture preview"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close preview"
              className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-xl text-white transition hover:bg-white/20"
            >
              ×
            </button>
            <img
              src={src}
              alt={alt}
              onClick={(event) => event.stopPropagation()}
              className="max-h-[88dvh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
            />
          </div>,
          document.body,
        )}
    </>
  );
};

export default ProfileImagePreview;

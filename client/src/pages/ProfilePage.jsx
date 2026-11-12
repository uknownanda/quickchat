import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import assets from "../assets/assets";
import { AuthContext } from "../../context/AuthContext";

const ProfilePage = () => {
  const { authUser, updateProfile } = useContext(AuthContext);
  const navigate = useNavigate();
  const [name, setName] = useState(authUser?.fullName || "");
  const [bio, setBio] = useState(authUser?.bio || "");
  const [selectedImg, setSelectedImg] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(authUser?.profilePic || assets.avatar_icon);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selectedImg) {
      setPreviewUrl(authUser?.profilePic || assets.avatar_icon);
      return undefined;
    }
    const url = URL.createObjectURL(selectedImg);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedImg, authUser?.profilePic]);

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Choose a PNG, JPG or WEBP image.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Profile images must be 5 MB or smaller.");
      event.target.value = "";
      return;
    }
    setSelectedImg(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleanName = name.trim();
    const cleanBio = bio.trim();
    if (!cleanName) {
      toast.error("Please enter your display name.");
      return;
    }
    setSaving(true);
    try {
      let profilePic;
      if (selectedImg) {
        profilePic = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error("Unable to read the selected image."));
          reader.readAsDataURL(selectedImg);
        });
      }
      await updateProfile({
        ...(profilePic ? { profilePic } : {}),
        fullName: cleanName,
        bio: cleanBio,
      });
      navigate("/");
    } catch (error) {
      toast.error(error.message || "Unable to update your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="qc-profile-page min-h-screen w-full px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-5xl items-center justify-center">
        <section className="qc-profile-editor w-full overflow-hidden rounded-3xl border shadow-2xl">
          <header className="qc-profile-editor-header flex items-center justify-between gap-4 border-b px-6 py-5 sm:px-9">
            <div>
              <p className="qc-profile-eyebrow text-[11px] font-semibold uppercase tracking-[0.2em]">Your account</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Profile settings</h1>
              <p className="qc-profile-subtitle mt-1 text-sm">Personalize how people see you on QuickChat.</p>
            </div>
            <button type="button" onClick={() => navigate("/")} className="qc-profile-close rounded-xl border px-3 py-2 text-sm transition" aria-label="Back to chats">
              <span aria-hidden="true">←</span><span className="ml-2 hidden sm:inline">Back to chats</span>
            </button>
          </header>

          <div className="grid md:grid-cols-[minmax(0,1fr)_300px]">
            <form onSubmit={handleSubmit} className="qc-profile-form flex flex-col gap-6 px-6 py-7 sm:px-9 sm:py-9">
              <div>
                <h2 className="text-sm font-semibold">Profile photo</h2>
                <p className="qc-profile-subtitle mt-1 text-xs">Use a clear photo so friends can recognize you.</p>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <img src={previewUrl} alt="Your profile preview" className="qc-profile-photo h-20 w-20 rounded-full object-cover" />
                  <div className="flex flex-col items-start gap-2">
                    <label htmlFor="qc-profile-avatar" className="qc-profile-upload cursor-pointer rounded-xl px-4 py-2.5 text-sm font-semibold transition">Choose image</label>
                    <input id="qc-profile-avatar" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} className="sr-only" />
                    <span className="qc-profile-hint text-[11px]">PNG, JPG or WEBP · Up to 5 MB</span>
                    {selectedImg && <button type="button" onClick={() => setSelectedImg(null)} className="qc-profile-remove text-xs">Remove selected image</button>}
                  </div>
                </div>
              </div>

              <div className="qc-profile-divider" />

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold">Display name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} type="text" required maxLength={60} placeholder="Your name" className="qc-profile-input w-full rounded-xl px-4 py-3 text-sm outline-none transition" />
              </label>

              <div className="flex flex-col gap-2">
                <span className="text-sm font-semibold">Username</span>
                <div className="qc-profile-username-field flex items-center rounded-xl px-4 py-3">
                  <span className="qc-profile-at">@</span>
                  <span className="min-w-0 truncate text-sm font-medium">{authUser?.username || "username"}</span>
                  <span className="qc-profile-locked ml-auto text-[10px]">Verified identity</span>
                </div>
                <p className="qc-profile-hint text-[11px]">Your username helps people find you and cannot be changed here.</p>
              </div>

              <label className="flex flex-col gap-2">
                <span className="text-sm font-semibold">About you</span>
                <textarea value={bio} onChange={(event) => setBio(event.target.value)} placeholder="A little about yourself…" maxLength={300} rows={4} className="qc-profile-input w-full resize-y rounded-xl px-4 py-3 text-sm leading-relaxed outline-none transition" />
                <span className="qc-profile-hint self-end text-[11px]">{bio.length}/300</span>
              </label>

              <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
                <button type="button" onClick={() => navigate("/")} className="qc-profile-cancel rounded-xl px-5 py-3 text-sm font-semibold transition">Cancel</button>
                <button type="submit" disabled={saving} className="qc-profile-save rounded-xl px-7 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60">{saving ? "Saving…" : "Save changes"}</button>
              </div>
            </form>

            <aside className="qc-profile-preview flex flex-col items-center justify-center px-7 py-9 text-center">
              <span className="qc-profile-eyebrow text-[10px] font-semibold uppercase tracking-[0.2em]">Live preview</span>
              <div className="qc-profile-preview-ring mt-5 rounded-full p-1">
                <img src={previewUrl} alt="" className="h-32 w-32 rounded-full object-cover sm:h-36 sm:w-36" />
              </div>
              <h2 className="mt-5 max-w-full break-words text-lg font-semibold">{name.trim() || "Your name"}</h2>
              <p className="qc-profile-preview-username mt-1 text-sm">@{authUser?.username || "username"}</p>
              <p className="qc-profile-preview-bio mt-4 max-w-[230px] whitespace-pre-wrap break-words text-xs leading-relaxed">{bio.trim() || "Your bio will appear here."}</p>
              <div className="qc-profile-preview-status mt-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px]"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Ready to chat</div>
              <p className="qc-profile-hint mt-8 max-w-[220px] text-[10px] leading-relaxed">This is how your profile will appear to other QuickChat users.</p>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
};

export default ProfilePage;

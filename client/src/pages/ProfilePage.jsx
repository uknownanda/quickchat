import React, { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AuthContext } from "../../context/AuthContext";
import assets from "../assets/assets";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

const ProfilePage = () => {
  const { authUser, updateProfile } = useContext(AuthContext);
  const navigate = useNavigate();
  const [name, setName] = useState(authUser?.fullName || "");
  const [bio, setBio] = useState(authUser?.bio || "");
  const [selectedImg, setSelectedImg] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(authUser?.profilePic || assets.avatar_icon);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(authUser?.fullName || "");
    setBio(authUser?.bio || "");
  }, [authUser?.fullName, authUser?.bio]);

  useEffect(() => {
    if (!selectedImg) {
      setPreviewUrl(authUser?.profilePic || assets.avatar_icon);
      return undefined;
    }
    const objectUrl = URL.createObjectURL(selectedImg);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedImg, authUser?.profilePic]);

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast.error("Choose a PNG, JPG or WEBP image.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
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
      toast.success("Your profile has been saved.");
      navigate("/");
    } catch (error) {
      toast.error(error.message || "Unable to update your profile.");
    } finally {
      setSaving(false);
    }
  };

  const hasChanges =
    name.trim() !== (authUser?.fullName || "") ||
    bio.trim() !== (authUser?.bio || "") ||
    Boolean(selectedImg);

  return (
    <main className="qc-profile-page min-h-screen w-full px-4 py-7 sm:px-6 lg:px-8">
      <div className="qc-profile-page-inner mx-auto w-full max-w-6xl">
        <header className="qc-profile-topbar">
          <button type="button" onClick={() => navigate("/")} className="qc-profile-back" aria-label="Back to chats">
            <span aria-hidden="true">←</span>
            <span>Back to chats</span>
          </button>
          <div className="qc-profile-topbar-meta">
            <span className="qc-profile-topbar-dot" />
            ACCOUNT SETTINGS
          </div>
        </header>

        <section className="qc-profile-editor">
          <div className="qc-profile-heading">
            <div>
              <p className="qc-profile-eyebrow">YOUR SPACE, YOUR IDENTITY</p>
              <h1>Profile settings<span>.</span></h1>
              <p className="qc-profile-subtitle">Make your QuickChat profile feel like you.</p>
            </div>
            <div className="qc-profile-heading-icon" aria-hidden="true">✳</div>
          </div>

          <div className="qc-profile-layout">
            <form onSubmit={handleSubmit} className="qc-profile-form">
              <section className="qc-profile-section">
                <div className="qc-profile-section-heading">
                  <div>
                    <h2>Profile photo</h2>
                    <p>Choose an image that people will recognize.</p>
                  </div>
                  <span className="qc-profile-step">01</span>
                </div>

                <div className="qc-profile-avatar-row">
                  <div className="qc-profile-avatar-wrap">
                    <img src={previewUrl} alt="Profile preview" className="qc-profile-photo" />
                    <label htmlFor="qc-profile-avatar" className="qc-profile-avatar-edit" title="Choose profile photo" aria-label="Choose profile photo">
                      <span aria-hidden="true">↗</span>
                    </label>
                  </div>
                  <div className="qc-profile-upload-copy">
                    <label htmlFor="qc-profile-avatar" className="qc-profile-upload">Upload new photo</label>
                    <input id="qc-profile-avatar" type="file" accept="image/png,image/jpeg,image/webp" onChange={handleImageChange} className="sr-only" />
                    <p>PNG, JPG or WEBP. Maximum file size 5 MB.</p>
                    {selectedImg && (
                      <button type="button" onClick={() => setSelectedImg(null)} className="qc-profile-remove">
                        Remove selected photo
                      </button>
                    )}
                  </div>
                </div>
              </section>

              <div className="qc-profile-divider" />

              <section className="qc-profile-section">
                <div className="qc-profile-section-heading">
                  <div>
                    <h2>Personal information</h2>
                    <p>These details are visible to your QuickChat contacts.</p>
                  </div>
                  <span className="qc-profile-step">02</span>
                </div>

                <label className="qc-profile-field">
                  <span>Display name</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    type="text"
                    required
                    maxLength={60}
                    placeholder="Enter your name"
                    autoComplete="name"
                    className="qc-profile-input"
                  />
                  <small>Use the name your friends know you by.</small>
                </label>

                <div className="qc-profile-field">
                  <span>Username</span>
                  <div className="qc-profile-username-field">
                    <span className="qc-profile-at">@</span>
                    <span className="qc-profile-username-value">{authUser?.username || "username"}</span>
                    <span className="qc-profile-locked"><span aria-hidden="true">⌑</span> Fixed</span>
                  </div>
                  <small>Your unique username cannot be changed from this page.</small>
                </div>

                <label className="qc-profile-field">
                  <span>About you <small className="qc-profile-optional">OPTIONAL</small></span>
                  <textarea
                    value={bio}
                    onChange={(event) => setBio(event.target.value)}
                    placeholder="Share a little about yourself..."
                    maxLength={300}
                    rows={4}
                    className="qc-profile-input qc-profile-textarea"
                  />
                  <div className="qc-profile-field-foot">
                    <small>A short introduction helps people get to know you.</small>
                    <small className={bio.length >= 280 ? "qc-profile-count near-limit" : "qc-profile-count"}>{bio.length}/300</small>
                  </div>
                </label>
              </section>

              <div className="qc-profile-actions">
                <button type="button" onClick={() => navigate("/")} className="qc-profile-cancel" disabled={saving}>Cancel</button>
                <button type="submit" disabled={saving || !hasChanges} className="qc-profile-save">
                  {saving ? <><span className="qc-profile-spinner" /> Saving changes...</> : <>Save changes <span aria-hidden="true">↗</span></>}
                </button>
              </div>
            </form>

            <aside className="qc-profile-preview">
              <div className="qc-profile-preview-label">
                <span className="qc-profile-preview-live" />
                LIVE PREVIEW
              </div>
              <div className="qc-profile-preview-card">
                <div className="qc-profile-preview-cover">
                  <span>QUICKCHAT MEMBER</span>
                  <span className="qc-profile-preview-cover-mark">✳</span>
                </div>
                <div className="qc-profile-preview-content">
                  <div className="qc-profile-preview-avatar">
                    <img src={previewUrl} alt="" />
                  </div>
                  <h2>{name.trim() || "Your name"}</h2>
                  <p className="qc-profile-preview-username">@{authUser?.username || "username"}</p>
                  <p className="qc-profile-preview-bio">{bio.trim() || "Your introduction will appear here. Tell people a little about yourself."}</p>
                  <div className="qc-profile-preview-status"><span /> Available to connect</div>
                </div>
              </div>
              <div className="qc-profile-preview-note">
                <span aria-hidden="true">✦</span>
                <p>Your preview updates as you edit. This is how your profile details appear to other people.</p>
              </div>
            </aside>
          </div>
        </section>
        <p className="qc-profile-footer">QUICKCHAT <span>·</span> PROFILE &amp; IDENTITY</p>
      </div>
    </main>
  );
};

export default ProfilePage;

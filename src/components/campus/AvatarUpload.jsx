import { Camera } from "lucide-react";
import { useRef, useState } from "react";
import { uploadProfileAvatar } from "../../services/profileService";
import "./avatar-upload.css";

function getInitials(name = "UCI") {
  return String(name)
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "UCI";
}

export default function AvatarUpload({
  user,
  profile,
  name = "Usuario Campus UCI",
  size = "md",
  editable = true,
  onAvatarUpdated,
}) {
  const inputRef = useRef(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const avatarUrl = previewUrl || profile?.avatar_url || "";

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setUploading(true);
    let localPreview = "";

    try {
      localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);

      const updatedProfile = await uploadProfileAvatar({
        userId: user?.id,
        file,
      });

      onAvatarUpdated?.(updatedProfile);
    } catch (uploadError) {
      console.error("Error subiendo avatar:", uploadError);
      setError(uploadError.message || "No se pudo subir la foto.");
      setPreviewUrl("");
      if (localPreview) URL.revokeObjectURL(localPreview);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className={`avatar-upload avatar-upload-${size}`}>
      <button
        type="button"
        className="avatar-upload-frame"
        onClick={() => editable && inputRef.current?.click()}
        disabled={!editable || uploading}
        aria-label={editable ? "Subir foto de perfil" : "Foto de perfil"}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={`Foto de ${name}`} className="avatar-image" />
        ) : (
          <span className="avatar-initials">{getInitials(name)}</span>
        )}

        {uploading ? <span className="avatar-spinner" aria-hidden="true" /> : null}

        {editable ? (
          <span className="avatar-camera" aria-hidden="true">
            <Camera size={15} strokeWidth={2.1} />
          </span>
        ) : null}
      </button>

      {editable ? (
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="avatar-input"
        />
      ) : null}

      {error ? <span className="avatar-error">{error}</span> : null}
    </div>
  );
}

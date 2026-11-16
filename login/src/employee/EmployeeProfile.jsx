import { useEffect, useRef, useState } from "react";

import {
  getEmployeeProfile,
  uploadEmployeeProfilePicture,
} from "./employeeProfileApi";

import ChangePassword from "./ChangePassword";
import "./EmployeeProfile.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

function getImageUrl(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value, `${API_BASE_URL}/`);
    const backendOrigin = new URL(API_BASE_URL).origin;

    const isBackendImage = url.origin === backendOrigin;

    const isCloudinaryImage =
      url.protocol === "https:" && url.hostname === "res.cloudinary.com";

    if (!isBackendImage && !isCloudinaryImage) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function EmployeeProfile({ user, onPasswordChanged, onProfilePictureUpdated }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [imageError, setImageError] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState("");

  const [showChangePassword, setShowChangePassword] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      try {
        const accessToken = localStorage.getItem("accessToken");

        const data = await getEmployeeProfile(accessToken);

        if (!active) return;

        setProfile(data);
        setImageError(false);
      } catch (err) {
        if (active) {
          setError(err.message || "Unable to load profile.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;

    setError("");
    setSuccess("");

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      setError("Only JPG and PNG images are allowed.");
      event.target.value = "";
      setSelectedFile(null);
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be 2 MB or less.");
      event.target.value = "";
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || uploading) return;

    setUploading(true);
    setError("");
    setSuccess("");

    try {
      const updatedProfile = await uploadEmployeeProfilePicture(selectedFile);

      setProfile(updatedProfile);
      setImageError(false);
      if (typeof onProfilePictureUpdated === "function") {
        onProfilePictureUpdated(updatedProfile?.profile_picture);
      }
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setSuccess("Profile picture updated successfully.");
    } catch (err) {
      console.error("Profile Picture Upload Error:", err);

      setError(err.message || "Failed to upload profile picture.");
    } finally {
      setUploading(false);
    }
  };

  const username = profile?.username || user?.username || "Employee";

  const userId = user?.id ?? "N/A";
  const role = profile?.role || "Employee";

  const initial = username.charAt(0).toUpperCase();

  const imageUrl = getImageUrl(profile?.profile_picture);

  return (
    <div className="employee-profile-page">
      <div className="employee-profile-heading">
        <h1>My Profile</h1>

        <p>View and manage your employee account information.</p>
      </div>

      <div className="employee-profile-card">
        <div className="employee-profile-banner" />

        <div className="employee-profile-body">
          <div className="employee-profile-picture">
            {imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt={`${username}'s profile`}
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
              />
            ) : (
              <span>{initial}</span>
            )}
          </div>

          <h2>{username}</h2>

          <span className="employee-profile-role">{role}</span>

          {loading && (
            <p className="employee-profile-status" role="status">
              Loading profile information...
            </p>
          )}

          {/* Profile Picture Upload */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              marginTop: "22px",
              width: "100%",
            }}
          >
            <label
              htmlFor="employee-profile-image"
              style={{
                fontWeight: 600,
                fontSize: "13px",
                color: "#334155",
              }}
            >
              Change Profile Picture
            </label>

            <input
              id="employee-profile-image"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png"
              disabled={uploading}
              onChange={handleFileChange}
              style={{
                maxWidth: "270px",
                width: "100%",
                fontSize: "12px",
              }}
            />

            <small style={{ color: "#64748b" }}>JPG or PNG, maximum 2 MB</small>

            {selectedFile && (
              <button
                type="button"
                disabled={uploading}
                onClick={handleUpload}
                style={{
                  background: "#2563eb",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  padding: "11px 20px",
                  fontWeight: 600,
                  cursor: uploading ? "wait" : "pointer",
                }}
              >
                {uploading ? "Uploading..." : "Upload Picture"}
              </button>
            )}

            {success && (
              <p
                role="status"
                style={{
                  color: "#047857",
                  fontSize: "13px",
                }}
              >
                {success}
              </p>
            )}

            {error && (
              <p className="employee-profile-error" role="alert">
                {error}
              </p>
            )}
          </div>

          <div className="employee-profile-info">
            <div className="employee-profile-info-row">
              <span>Username</span>
              <strong>{username}</strong>
            </div>

            <div className="employee-profile-info-row">
              <span>User ID</span>
              <strong>{userId}</strong>
            </div>

            <div className="employee-profile-info-row">
              <span>Role</span>
              <strong>{role}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Existing Change Password Feature */}
      <div className="employee-profile-security">
        <div className="employee-profile-security-header">
          <div>
            <h3>Account Security</h3>
            <p>Manage your account password and security settings.</p>
          </div>

          <button
            type="button"
            className="employee-profile-password-toggle"
            onClick={() => setShowChangePassword((previous) => !previous)}
            aria-expanded={showChangePassword}
            aria-controls="employee-change-password"
          >
            {showChangePassword ? "Cancel" : "Change Password"}
          </button>
        </div>

        {showChangePassword && (
          <div id="employee-change-password">
            <ChangePassword onPasswordChanged={onPasswordChanged} />
          </div>
        )}
      </div>
    </div>
  );
}

export default EmployeeProfile;

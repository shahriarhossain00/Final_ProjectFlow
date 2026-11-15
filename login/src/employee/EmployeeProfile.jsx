import { useEffect, useState } from "react";
import { getEmployeeProfile } from "./employeeProfileApi";
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

    // Only display images from the configured backend.
    if (url.origin !== new URL(API_BASE_URL).origin) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function EmployeeProfile({ user, onPasswordChanged }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imageError, setImageError] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    let active = true;

    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");

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
    };

    loadProfile();

    return () => {
      active = false;
    };
  }, [user?.id]);

  const username = user?.username || profile?.username || "Employee";
  const userId = user?.id ?? "N/A";
  const role = profile?.role || "Employee";
  const initial = username.charAt(0).toUpperCase();
  const imageUrl = getImageUrl(profile?.profile_picture);

  return (
    <div className="employee-profile-page">
      {/* Page Heading */}
      <div className="employee-profile-heading">
        <h1>My Profile</h1>
        <p>View and manage your employee account information.</p>
      </div>

      {/* Profile Card */}
      <div className="employee-profile-card">
        <div className="employee-profile-banner" />

        <div className="employee-profile-body">
          <div className="employee-profile-picture">
            {imageUrl && !imageError ? (
              <img
                src={imageUrl}
                alt={`${username}'s profile`}
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

          {error && (
            <p className="employee-profile-error" role="alert">
              {error}
            </p>
          )}

          {/* Employee Information */}
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

      {/* Account Security */}
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

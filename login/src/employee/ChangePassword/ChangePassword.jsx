import { useState } from "react";
import { changeEmployeePassword } from "../api/changePasswordApi";
import "./ChangePassword.css";

function ChangePassword({ onPasswordChanged }) {
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [showPasswords, setShowPasswords] = useState({
    oldPassword: false,
    newPassword: false,
    confirmPassword: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
  };

  const togglePassword = (field) => {
    setShowPasswords((previous) => ({
      ...previous,
      [field]: !previous[field],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");

    const { oldPassword, newPassword, confirmPassword } = formData;

    if (!oldPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    if (newPassword === oldPassword) {
      setError("New password must be different from current password.");
      return;
    }

    setLoading(true);

    try {
      await changeEmployeePassword({
        oldPassword,
        newPassword,
        confirmPassword,
      });

      setFormData({
        oldPassword: "",
        newPassword: "",
        confirmPassword: "",
      });

      setSuccess("Password changed successfully.");

      // Parent component can clear the session and redirect to login.
      if (typeof onPasswordChanged === "function") {
        onPasswordChanged();
      }
    } catch (err) {
      setError(err.message || "Unable to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="change-password-container">
      <div className="change-password-header">
        <h3>Change Password</h3>
        <p>Keep your account secure by updating your password.</p>
      </div>

      <form className="change-password-form" onSubmit={handleSubmit}>
        <div className="change-password-field">
          <label htmlFor="oldPassword">Current Password</label>

          <div className="change-password-input-wrapper">
            <input
              id="oldPassword"
              name="oldPassword"
              type={showPasswords.oldPassword ? "text" : "password"}
              value={formData.oldPassword}
              onChange={handleChange}
              placeholder="Enter your current password"
              autoComplete="current-password"
              required
              disabled={loading}
            />

            <button
              type="button"
              onClick={() => togglePassword("oldPassword")}
              disabled={loading}
            >
              {showPasswords.oldPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="change-password-field">
          <label htmlFor="newPassword">New Password</label>

          <div className="change-password-input-wrapper">
            <input
              id="newPassword"
              name="newPassword"
              type={showPasswords.newPassword ? "text" : "password"}
              value={formData.newPassword}
              onChange={handleChange}
              placeholder="Enter new password"
              autoComplete="new-password"
              required
              disabled={loading}
            />

            <button
              type="button"
              onClick={() => togglePassword("newPassword")}
              disabled={loading}
            >
              {showPasswords.newPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="change-password-field">
          <label htmlFor="confirmPassword">Confirm New Password</label>

          <div className="change-password-input-wrapper">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showPasswords.confirmPassword ? "text" : "password"}
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your new password"
              autoComplete="new-password"
              required
              disabled={loading}
            />

            <button
              type="button"
              onClick={() => togglePassword("confirmPassword")}
              disabled={loading}
            >
              {showPasswords.confirmPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {error && (
          <p className="change-password-error" role="alert">
            {error}
          </p>
        )}

        {success && (
          <p className="change-password-success" role="status">
            {success}
          </p>
        )}

        <button
          type="submit"
          className="change-password-submit"
          disabled={loading}
        >
          {loading ? "Updating Password..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}

export default ChangePassword;

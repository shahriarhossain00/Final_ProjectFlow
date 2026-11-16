import { useEffect, useState } from "react";
import { forgotPassword, resetPassword } from "../api/passwordResetApi";
import "./ResetPassword.css";

const COOLDOWN_MS = 5 * 60 * 1000;
const STORAGE_KEY = "passwordResetCooldown";

function getCooldownEnd(email) {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");

    if (saved?.email !== email.trim().toLowerCase()) {
      return 0;
    }

    return Number(saved.availableAt) || 0;
  } catch {
    return 0;
  }
}

function getRemainingSeconds(availableAt) {
  return Math.max(0, Math.ceil((availableAt - Date.now()) / 1000));
}

function ResetPassword({
  email = "",
  onResetSuccess,
  onBackToForgot,
  onBackToLogin,
}) {
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [cooldownEnd, setCooldownEnd] = useState(() => getCooldownEnd(email));

  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    getRemainingSeconds(getCooldownEnd(email)),
  );

  // Update the countdown every second.
  useEffect(() => {
    const interval = setInterval(() => {
      setRemainingSeconds(getRemainingSeconds(cooldownEnd));
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownEnd]);

  const minutes = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");

  const seconds = String(remainingSeconds % 60).padStart(2, "0");

  const handleResendCode = async () => {
    if (resending || loading) return;

    // Recheck the deadline to prevent early requests.
    if (getRemainingSeconds(getCooldownEnd(email)) > 0) {
      return;
    }

    setError("");
    setMessage("");
    setResending(true);

    try {
      await forgotPassword(email);

      const availableAt = Date.now() + COOLDOWN_MS;

      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          email: email.trim().toLowerCase(),
          availableAt,
        }),
      );

      setCooldownEnd(availableAt);
      setRemainingSeconds(300);
      setOtp("");

      setMessage(
        "If the email is registered, a new verification code has been sent.",
      );
    } catch (err) {
      setError(err.message || "Unable to resend code.");
    } finally {
      setResending(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading || resending) return;

    setError("");
    setMessage("");

    if (!email.trim()) {
      setError("Email address is missing. Please request a code.");
      return;
    }

    if (!otp.trim() || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setLoading(true);

    try {
      await resetPassword({
        email,
        otp: otp.trim(),
        newPassword,
        confirmPassword,
      });

      setOtp("");
      setNewPassword("");
      setConfirmPassword("");

      sessionStorage.removeItem(STORAGE_KEY);

      if (typeof onResetSuccess === "function") {
        onResetSuccess("Password reset successfully. Please log in again.");
      }
    } catch (err) {
      setError(err.message || "Unable to reset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-page">
      <div className="reset-password-container">
        <div className="reset-password-header">
          <div className="reset-password-brand">PF</div>

          <h1>Reset Password</h1>

          <p>
            Enter the verification code sent to your email and create a new
            password.
          </p>
        </div>

        <form className="reset-password-form" onSubmit={handleSubmit}>
          <div className="reset-password-field">
            <label htmlFor="reset-email">Email Address</label>

            <input
              id="reset-email"
              type="email"
              value={email}
              readOnly
              autoComplete="email"
            />
          </div>

          <div className="reset-password-field">
            <label htmlFor="reset-otp">Verification Code</label>

            <input
              id="reset-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Enter verification code"
              value={otp}
              onChange={(event) => {
                setOtp(event.target.value);
                setError("");
              }}
              disabled={loading || resending}
              required
            />
          </div>

          {/* OTP Resend Timer */}
          <div className="reset-otp-timer">
            {remainingSeconds > 0 ? (
              <>
                <p className="reset-otp-timer-label">
                  Resend code available in
                </p>

                <strong className="reset-otp-countdown">
                  {minutes}:{seconds}
                </strong>
              </>
            ) : (
              <p className="reset-otp-ready">Didn't receive the code?</p>
            )}

            <button
              type="button"
              className="reset-otp-resend"
              onClick={handleResendCode}
              disabled={remainingSeconds > 0 || loading || resending}
            >
              {resending ? "Sending..." : "Resend Code"}
            </button>
          </div>

          <div className="reset-password-field">
            <label htmlFor="reset-new-password">New Password</label>

            <div className="reset-password-input-wrapper">
              <input
                id="reset-new-password"
                type={showNewPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(event) => {
                  setNewPassword(event.target.value);
                  setError("");
                }}
                disabled={loading || resending}
                required
              />

              <button
                type="button"
                onClick={() => setShowNewPassword((prev) => !prev)}
                disabled={loading || resending}
              >
                {showNewPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="reset-password-field">
            <label htmlFor="reset-confirm-password">Confirm New Password</label>

            <div className="reset-password-input-wrapper">
              <input
                id="reset-confirm-password"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(event) => {
                  setConfirmPassword(event.target.value);
                  setError("");
                }}
                disabled={loading || resending}
                required
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                disabled={loading || resending}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {error && (
            <p className="reset-password-error" role="alert">
              {error}
            </p>
          )}

          {message && (
            <p className="reset-password-success" role="status">
              {message}
            </p>
          )}

          <button
            type="submit"
            className="reset-password-submit"
            disabled={loading || resending}
          >
            {loading ? "Resetting Password..." : "Reset Password"}
          </button>
        </form>

        <div className="reset-password-footer">
          <button
            type="button"
            onClick={onBackToForgot}
            disabled={loading || resending}
          >
            Change Email
          </button>

          <button
            type="button"
            onClick={onBackToLogin}
            disabled={loading || resending}
          >
            Back to Employee Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;

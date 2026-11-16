import { useState } from "react";
import { forgotPassword } from "../api/passwordResetApi";
import "./ForgotPassword.css";

function ForgotPassword({ onOtpSent, onBackToLogin }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading) return;

    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Email address is required.");
      return;
    }

    setLoading(true);

    try {
      const data = await forgotPassword(normalizedEmail);
      // Save the resend cooldown after a successful API request.
      sessionStorage.setItem(
        "passwordResetCooldown",
        JSON.stringify({
          email: normalizedEmail,
          availableAt: Date.now() + 5 * 60 * 1000,
        }),
      );

      console.log("Forgot Password API Status: Success");

      setSuccess(
        data?.detail ||
          "If an account exists with this email, a reset code has been sent.",
      );

      // Continue to the OTP verification and reset password page.
      // Do not store the OTP or password in localStorage.
      if (typeof onOtpSent === "function") {
        onOtpSent(normalizedEmail);
      }
    } catch (err) {
      setError(err.message || "Failed to send reset code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-page">
      <div className="forgot-password-container">
        <div className="forgot-password-header">
          <div className="forgot-password-brand">PF</div>

          <h1>Forgot Password?</h1>

          <p>
            Enter your registered email address. We'll send you a verification
            code to reset your password.
          </p>
        </div>

        <form className="forgot-password-form" onSubmit={handleSubmit}>
          <div className="forgot-password-field">
            <label htmlFor="forgot-email">Email Address</label>

            <input
              id="forgot-email"
              type="email"
              placeholder="Enter your registered email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError("");
              }}
              disabled={loading}
              required
            />
          </div>

          {error && (
            <p className="forgot-password-error" role="alert">
              {error}
            </p>
          )}

          {success && (
            <p className="forgot-password-success" role="status">
              {success}
            </p>
          )}

          <button
            type="submit"
            className="forgot-password-submit"
            disabled={loading}
          >
            {loading ? "Sending Code..." : "Send Reset Code"}
          </button>
        </form>

        <div className="forgot-password-footer">
          <button type="button" onClick={onBackToLogin} disabled={loading}>
            Back to Employee Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;

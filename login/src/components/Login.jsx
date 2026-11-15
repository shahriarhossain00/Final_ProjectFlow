import { useState } from "react";
import "./Login.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

function Login({
  initialMode = "admin",
  successMessage = "",
  onLoginSuccess,
  onRegisterClick,
  onForgotPassword,
}) {
  const [mode, setMode] = useState(initialMode);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Switch between Admin and Employee login
  const changeMode = (nextMode) => {
    if (loading) return;

    setMode(nextMode);
    setError("");
    setUsername("");
    setEmail("");
    setPassword("");
    setShowPassword(false);
  };

  // Handle login
  const handleLogin = async (event) => {
    event.preventDefault();

    if (loading) return;

    setError("");

    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }

    setLoading(true);

    let authenticatedUser = null;
    let tokens = null;

    try {
      // Step 1: Authenticate with Django backend
      let response;

      try {
        response = await fetch(`${API_BASE_URL}/api/login/`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            username: username.trim(),
            password,
          }),
        });
      } catch {
        throw new Error(
          "Cannot connect to the server. Please check your connection.",
        );
      }

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || "Invalid username or password.");
      }

      if (!data?.access || !data?.refresh) {
        throw new Error("Authentication tokens were not received.");
      }

      tokens = {
        access: data.access,
        refresh: data.refresh,
      };

      // Step 2: Fetch authenticated user profile
      let profileResponse;

      try {
        profileResponse = await fetch(`${API_BASE_URL}/api/profile/`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${tokens.access}`,
          },
        });
      } catch {
        throw new Error("Unable to connect to the profile service.");
      }

      const profile = await profileResponse.json().catch(() => null);

      console.log("Profile API Status:", profileResponse.status);
      console.log("Profile API Data:", profile);

      if (!profileResponse.ok || !profile) {
        throw new Error("Unable to verify your account. Please try again.");
      }

      if (typeof profile.is_staff !== "boolean") {
        throw new Error("Account permission information is unavailable.");
      }

      // Step 3: Check account permissions
      if (mode === "admin" && !profile.is_staff) {
        throw new Error("This account does not have Admin access.");
      }

      if (mode === "employee" && profile.is_staff) {
        throw new Error("Please use the Admin Login tab.");
      }

      authenticatedUser = profile;
    } catch (err) {
      console.error("Login failed:", err.message);

      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }

    // Step 4: Update application after successful authentication
    if (authenticatedUser && tokens) {
      onLoginSuccess({
        user: authenticatedUser,
        access: tokens.access,
        refresh: tokens.refresh,
      });
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Login Header */}
        <div className="login-header">
          <div className="login-brand">PF</div>

          <h1>Welcome Back</h1>

          <p>Sign in to your ProjectFlow workspace</p>
        </div>

        {/* Admin / Employee Tabs */}
        <div className="login-tabs">
          <button
            type="button"
            className={mode === "admin" ? "active" : ""}
            onClick={() => changeMode("admin")}
            disabled={loading}
          >
            Admin Login
          </button>

          <button
            type="button"
            className={mode === "employee" ? "active" : ""}
            onClick={() => changeMode("employee")}
            disabled={loading}
          >
            Employee Login
          </button>
        </div>

        <form className="login-form" onSubmit={handleLogin}>
          {/* Success message after password change */}
          {successMessage && (
            <p className="login-success-message" role="status">
              {successMessage}
            </p>
          )}

          {/* Username */}
          <label htmlFor="username">Username</label>

          <input
            id="username"
            type="text"
            autoComplete="username"
            placeholder="Enter your username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={loading}
            required
          />

          {/* Admin Email */}
          {mode === "admin" && (
            <>
              <label htmlFor="email">Email</label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="Enter your email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={loading}
                required
              />
            </>
          )}

          {/* Password */}
          <label htmlFor="password">Password</label>

          <div className="login-password-wrapper">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              required
            />

            <button
              type="button"
              className="login-password-toggle"
              onClick={() => setShowPassword((previous) => !previous)}
              disabled={loading}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {/* Forgot Password - Employee Only */}
          {mode === "employee" && (
            <div className="login-forgot-password">
              <button
                type="button"
                onClick={onForgotPassword}
                disabled={loading}
              >
                Forgot Password?
              </button>
            </div>
          )}

          {/* Login Error */}
          {error && (
            <p className="login-message error" role="alert">
              {error}
            </p>
          )}

          {/* Login Button */}
          <button className="login-btn" type="submit" disabled={loading}>
            {loading
              ? "Signing in..."
              : mode === "admin"
                ? "Login as Admin"
                : "Login as Employee"}
          </button>
        </form>

        {/* Employee Registration */}
        {mode === "employee" && (
          <div className="login-register-section">
            <p>Don't have an account?</p>

            <button type="button" onClick={onRegisterClick} disabled={loading}>
              Register as Employee
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;

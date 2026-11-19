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
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Switch between the three login modes.
  const changeMode = (nextMode) => {
    if (loading) return;

    setMode(nextMode);
    setError("");
    setUsername("");
    setPassword("");
    setShowPassword(false);
  };

  // Authenticate the user and verify their role using backend APIs.
  const handleLogin = async (event) => {
    event.preventDefault();

    if (loading) return;

    setError("");

    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Authenticate using the existing login API.
      const loginResponse = await fetch(`${API_BASE_URL}/api/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const loginData = await loginResponse.json().catch(() => null);

      if (!loginResponse.ok) {
        throw new Error(loginData?.detail || "Invalid username or password.");
      }

      if (!loginData?.access || !loginData?.refresh) {
        throw new Error("Authentication tokens were not received.");
      }

      // Step 2: Fetch basic user information using the access token.
      const userResponse = await fetch(`${API_BASE_URL}/api/profile/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${loginData.access}`,
          Accept: "application/json",
        },
      });

      const userData = await userResponse.json().catch(() => null);

      if (!userResponse.ok || !userData) {
        throw new Error("Unable to verify your account.");
      }

      // Step 3: Fetch the actual account role from the Profile API.
      const roleResponse = await fetch(`${API_BASE_URL}/api/profile-picture/`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${loginData.access}`,
          Accept: "application/json",
        },
      });

      const profileData = await roleResponse.json().catch(() => null);

      if (!roleResponse.ok || !profileData) {
        throw new Error("Unable to verify your account role.");
      }

      const actualRole = profileData.role;
      const isAdmin = userData.is_staff === true;

      // Step 4: Validate the account role against the selected login tab.
      if (mode === "admin" && !isAdmin) {
        throw new Error("This account does not have Admin access.");
      }

      if (mode === "manager" && (isAdmin || actualRole !== "Manager")) {
        throw new Error("This account does not have Manager access.");
      }

      if (mode === "employee" && (isAdmin || actualRole !== "Employee")) {
        throw new Error("This account does not have Employee access.");
      }

      // Step 5: Combine user and profile data for the application.
      const authenticatedUser = {
        ...userData,
        role: isAdmin ? "Admin" : actualRole,
        profile_picture: profileData.profile_picture || null,
      };

      // Step 6: Pass verified user and JWT tokens to App.jsx.
      onLoginSuccess({
        user: authenticatedUser,
        access: loginData.access,
        refresh: loginData.refresh,
      });
    } catch (err) {
      console.error("Login failed:", err.message);
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
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

        {/* Login mode selector */}
        <div className="login-tabs">
          <button
            type="button"
            className={mode === "admin" ? "active" : ""}
            onClick={() => changeMode("admin")}
            disabled={loading}
          >
            Admin
          </button>

          <button
            type="button"
            className={mode === "manager" ? "active" : ""}
            onClick={() => changeMode("manager")}
            disabled={loading}
          >
            Manager
          </button>

          <button
            type="button"
            className={mode === "employee" ? "active" : ""}
            onClick={() => changeMode("employee")}
            disabled={loading}
          >
            Employee
          </button>
        </div>

        {/* Login form */}
        <form className="login-form" onSubmit={handleLogin}>
          {/* Show success message when redirected from password reset */}
          {successMessage && (
            <p className="login-success-message" role="status">
              {successMessage}
            </p>
          )}

          {/* Username input */}
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

          {/* Password input */}
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

            {/* Toggle password visibility */}
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

          {/* Forgot password is available to employees only */}
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

          {/* Display login errors */}
          {error && (
            <p className="login-message error" role="alert">
              {error}
            </p>
          )}

          {/* Submit login form */}
          <button className="login-btn" type="submit" disabled={loading}>
            {loading
              ? "Signing in..."
              : `Login as ${mode.charAt(0).toUpperCase() + mode.slice(1)}`}
          </button>
        </form>

        {/* Employee registration is available to employees only */}
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

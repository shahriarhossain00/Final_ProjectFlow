import { useEffect, useRef, useState } from "react";
import "./Login.css";

const API_BASE_URL = (
  import.meta.env.DEV
    ? import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
    : window.location.origin
).replace(/\/$/, "");

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function GoogleSignInButton({ onCredential, disabled }) {
  const buttonRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [error, setError] = useState("");

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      return;
    }

    let cancelled = false;

    const initializeGoogle = () => {
      if (cancelled || !buttonRef.current || !window.google?.accounts?.id) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response.credential) {
            callbackRef.current(response.credential);
          }
        },
      });

      buttonRef.current.replaceChildren();

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        text: "continue_with",
        width: 280,
      });
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
    } else {
      let script = document.querySelector(
        'script[src="https://accounts.google.com/gsi/client"]',
      );

      if (!script) {
        script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }

      script.addEventListener("load", initializeGoogle);
      script.addEventListener("error", () => {
        if (!cancelled) {
          setError("Unable to load Google Sign-In.");
        }
      });

      return () => {
        cancelled = true;
        script.removeEventListener("load", initializeGoogle);
      };
    }

    return () => {
      cancelled = true;
    };
  }, []);

  if (!GOOGLE_CLIENT_ID) {
    return (
      <p className="login-message error">Google Sign-In is not configured.</p>
    );
  }

  return (
    <div className="login-google-section">
      <p className="login-google-divider">Or continue with</p>

      <div
        className="login-google-button"
        style={{
          opacity: disabled ? 0.5 : 1,
          pointerEvents: disabled ? "none" : "auto",
        }}
      >
        <div ref={buttonRef} />
      </div>

      {error && (
        <p className="login-message error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

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

  const loginInProgressRef = useRef(false);

  const changeMode = (nextMode) => {
    if (loginInProgressRef.current) return;

    setMode(nextMode);
    setError("");
    setUsername("");
    setPassword("");
    setShowPassword(false);
  };

  const completeAuthentication = async (tokens, selectedMode) => {
    if (!tokens?.access || !tokens?.refresh) {
      throw new Error("Authentication tokens were not received.");
    }

    const headers = {
      Authorization: `Bearer ${tokens.access}`,
      Accept: "application/json",
    };

    const userResponse = await fetch(`${API_BASE_URL}/api/profile/`, {
      method: "GET",
      headers,
    });

    const userData = await userResponse.json().catch(() => null);

    if (!userResponse.ok || !userData) {
      throw new Error("Unable to verify your account.");
    }

    const roleResponse = await fetch(`${API_BASE_URL}/api/profile-picture/`, {
      method: "GET",
      headers,
    });

    const profileData = await roleResponse.json().catch(() => null);

    if (!roleResponse.ok || !profileData) {
      throw new Error("Unable to verify your account role.");
    }

    const actualRole = profileData.role;
    const isAdmin = userData.is_staff === true;

    if (selectedMode === "admin" && !isAdmin) {
      throw new Error("This account does not have Admin access.");
    }

    if (selectedMode === "manager" && (isAdmin || actualRole !== "Manager")) {
      throw new Error("This account does not have Manager access.");
    }

    if (selectedMode === "employee" && (isAdmin || actualRole !== "Employee")) {
      throw new Error("This account does not have Employee access.");
    }

    const authenticatedUser = {
      ...userData,
      role: isAdmin ? "Admin" : actualRole,
      profile_picture: profileData.profile_picture || null,
    };

    onLoginSuccess({
      user: authenticatedUser,
      access: tokens.access,
      refresh: tokens.refresh,
    });
  };

  const runAuthentication = async (authenticate) => {
    if (loginInProgressRef.current) return;

    loginInProgressRef.current = true;
    setLoading(true);
    setError("");

    try {
      const tokens = await authenticate();
      await completeAuthentication(tokens, mode);
    } catch (err) {
      console.error("Authentication failed:", err.message);
      setError(err.message || "Login failed. Please try again.");
    } finally {
      loginInProgressRef.current = false;
      setLoading(false);
    }
  };

  const handleLogin = (event) => {
    event.preventDefault();

    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }

    runAuthentication(async () => {
      const response = await fetch(`${API_BASE_URL}/api/login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.detail || "Invalid username or password.");
      }

      return data;
    });
  };

  const handleGoogleLogin = (googleIdToken) => {
    runAuthentication(async () => {
      const response = await fetch(`${API_BASE_URL}/api/google-login/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_token: googleIdToken,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.detail || data?.error || "Google authentication failed.",
        );
      }

      return data;
    });
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-brand">PF</div>
          <h1>Welcome Back</h1>
          <p>Sign in to your ProjectFlow workspace</p>
        </div>

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

        <form className="login-form" onSubmit={handleLogin}>
          {successMessage && (
            <p className="login-success-message" role="status">
              {successMessage}
            </p>
          )}

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

          {error && (
            <p className="login-message error" role="alert">
              {error}
            </p>
          )}

          <button className="login-btn" type="submit" disabled={loading}>
            {loading
              ? "Signing in..."
              : `Login as ${mode.charAt(0).toUpperCase() + mode.slice(1)}`}
          </button>
        </form>

        <GoogleSignInButton
          onCredential={handleGoogleLogin}
          disabled={loading}
        />

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

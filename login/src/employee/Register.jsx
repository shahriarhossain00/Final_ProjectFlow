import { useState } from "react";
import "./Register.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

function Register({ onRegisterSuccess, onBackToLogin }) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const handleRegister = async (event) => {
    event.preventDefault();

    setError("");
    setFieldErrors({});

    const cleanUsername = username.trim();
    const cleanEmail = email.trim();

    if (!cleanUsername || !cleanEmail || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: cleanUsername,
          email: cleanEmail,
          password: password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        if (data && typeof data === "object") {
          setFieldErrors(data);

          setError(
            typeof data.detail === "string"
              ? data.detail
              : "Registration failed. Please check your information.",
          );
        } else {
          setError("Registration failed. Please try again.");
        }

        return;
      }

      // Registration successful
      setPassword("");

      // Redirect directly to Employee Login
      onRegisterSuccess();
    } catch (err) {
      console.error("Registration error:", err.message);

      setError("Cannot connect to the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderFieldError = (field) => {
    const value = fieldErrors[field];

    if (!value) return null;

    const text = Array.isArray(value) ? value.join(" ") : String(value);

    return (
      <p className="register-field-error" role="alert">
        {text}
      </p>
    );
  };

  return (
    <div className="register-page">
      <div className="register-card">
        <div className="register-header">
          <div className="register-icon">+</div>

          <h1>Create Employee Account</h1>

          <p>Register to access your assigned projects and tasks.</p>
        </div>

        <form onSubmit={handleRegister}>
          <label htmlFor="reg-username">Username</label>

          <input
            id="reg-username"
            type="text"
            autoComplete="username"
            placeholder="Enter your username"
            value={username}
            maxLength={150}
            onChange={(event) => setUsername(event.target.value)}
            disabled={loading}
            required
          />

          {renderFieldError("username")}

          <label htmlFor="reg-email">Email</label>

          <input
            id="reg-email"
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
            required
          />

          {renderFieldError("email")}

          <label htmlFor="reg-password">Password</label>

          <div className="register-password-wrapper">
            <input
              id="reg-password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
              required
            />

            <button
              type="button"
              className="register-show-btn"
              onClick={() => setShowPassword((previous) => !previous)}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {renderFieldError("password")}

          {error && (
            <p className="register-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="register-submit-btn"
            disabled={loading}
          >
            {loading ? "Registering..." : "Register as Employee"}
          </button>
        </form>

        <div className="register-bottom">
          <span>Already have an account?</span>

          <button type="button" onClick={onBackToLogin} disabled={loading}>
            Employee Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default Register;

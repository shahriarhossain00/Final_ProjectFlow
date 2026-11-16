import { useState } from "react";

import Login from "./components/Login/Login";
import Dashboard from "./components/Dashboard/Dashboard";

import Register from "./employee/Register/Register";
import EmployeeDashboard from "./employee/EmployeeDashboard/EmployeeDashboard";

import ForgotPassword from "./employee/ForgotPassword/ForgotPassword";
import ResetPassword from "./employee/ResetPassword/ResetPassword";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

// Remove authentication information from localStorage
function clearAuthStorage() {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("userId");
  localStorage.removeItem("username");
  localStorage.removeItem("role");
}

function App() {
  const [page, setPage] = useState("login");
  const [loginMode, setLoginMode] = useState("admin");
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [loginMessage, setLoginMessage] = useState("");

  // Keep the reset email temporarily in React state
  const [resetEmail, setResetEmail] = useState("");

  // Handle successful login
  const handleLoginSuccess = ({ user, access, refresh }) => {
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);

    localStorage.setItem("userId", String(user.id));
    localStorage.setItem("username", user.username);
    localStorage.setItem("role", user.is_staff ? "Admin" : "Employee");

    setCurrentUser(user);
    setLoginMessage("");
    setResetEmail("");

    setPage(user.is_staff ? "admin-dashboard" : "employee-dashboard");
  };

  // Redirect to Employee Login after registration
  const handleRegisterSuccess = () => {
    setLoginMode("employee");
    setLoginMessage("");
    setPage("login");
  };

  // Existing logout flow
  const handleLogout = async () => {
    if (isLoggingOut) return;

    setIsLoggingOut(true);

    const accessToken = localStorage.getItem("accessToken");
    const refreshToken = localStorage.getItem("refreshToken");

    try {
      if (!accessToken || !refreshToken) {
        throw new Error("Authentication tokens are missing.");
      }

      const response = await fetch(`${API_BASE_URL}/api/logout/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          refresh: refreshToken,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        console.error("Logout API Error:", {
          status: response.status,
          message: errorData?.detail || "Unknown server error",
        });

        throw new Error(`Logout failed: ${response.status}`);
      }

      clearAuthStorage();

      setCurrentUser(null);
      setLoginMode("admin");
      setLoginMessage("");
      setResetEmail("");
      setPage("login");
    } catch (error) {
      console.error("Logout error:", error.message);
      alert("Server logout failed. Please try again.");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // After successfully changing password inside My Profile
  const handlePasswordChanged = () => {
    clearAuthStorage();

    setCurrentUser(null);
    setLoginMode("employee");
    setResetEmail("");

    setLoginMessage("Password updated successfully. Please log in again.");

    setPage("login");
  };

  // Open Forgot Password page
  const handleForgotPassword = () => {
    setLoginMessage("");
    setResetEmail("");
    setLoginMode("employee");
    setPage("forgot-password");
  };

  // After successfully requesting an OTP
  const handleOtpSent = (email) => {
    setResetEmail(email);
    setPage("reset-password");
  };

  // After successful password reset
  const handleResetSuccess = () => {
    clearAuthStorage();

    setCurrentUser(null);
    setResetEmail("");
    setLoginMode("employee");

    setLoginMessage(
      "Password reset successfully. Please log in with your new password.",
    );

    setPage("login");
  };

  // Back to Forgot Password to request a new OTP
  const handleBackToForgot = () => {
    setPage("forgot-password");
  };

  // Back to Employee Login from Forgot or Reset page
  const handleBackToEmployeeLogin = () => {
    setResetEmail("");
    setLoginMessage("");
    setLoginMode("employee");
    setPage("login");
  };

  // Back to Employee Login from Register
  const handleBackToLogin = () => {
    setLoginMode("employee");
    setLoginMessage("");
    setPage("login");
  };

  return (
    <>
      {/* Login Page */}
      {page === "login" && (
        <Login
          key={loginMode}
          initialMode={loginMode}
          successMessage={loginMessage}
          onLoginSuccess={handleLoginSuccess}
          onRegisterClick={() => {
            setLoginMessage("");
            setPage("register");
          }}
          onForgotPassword={handleForgotPassword}
        />
      )}

      {/* Employee Registration */}
      {page === "register" && (
        <Register
          onRegisterSuccess={handleRegisterSuccess}
          onBackToLogin={handleBackToLogin}
        />
      )}

      {/* Forgot Password */}
      {page === "forgot-password" && (
        <ForgotPassword
          onOtpSent={handleOtpSent}
          onBackToLogin={handleBackToEmployeeLogin}
        />
      )}

      {/* Reset Password */}
      {page === "reset-password" && (
        <ResetPassword
          email={resetEmail}
          onResetSuccess={handleResetSuccess}
          onBackToForgot={handleBackToForgot}
          onBackToLogin={handleBackToEmployeeLogin}
        />
      )}

      {/* Admin Dashboard */}
      {page === "admin-dashboard" && currentUser?.is_staff && (
        <Dashboard onLogout={handleLogout} isLoggingOut={isLoggingOut} />
      )}

      {/* Employee Dashboard */}
      {page === "employee-dashboard" &&
        currentUser &&
        !currentUser.is_staff && (
          <EmployeeDashboard
            user={currentUser}
            onLogout={handleLogout}
            isLoggingOut={isLoggingOut}
            onPasswordChanged={handlePasswordChanged}
          />
        )}
    </>
  );
}

export default App;

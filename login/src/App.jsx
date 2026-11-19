import { useState } from "react";

import Login from "./components/Login/Login";
import Dashboard from "./components/Dashboard/Dashboard";

import Register from "./employee/Register/Register";
import EmployeeDashboard from "./employee/EmployeeDashboard/EmployeeDashboard";
import ForgotPassword from "./employee/ForgotPassword/ForgotPassword";
import ResetPassword from "./employee/ResetPassword/ResetPassword";

// New Manager dashboard
import ManagerDashboard from "./manager/ManagerDashboard/ManagerDashboard";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

// Clear all stored authentication information.
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
  const [resetEmail, setResetEmail] = useState("");

  // Handle login success and redirect based on verified role.
  const handleLoginSuccess = ({ user, access, refresh }) => {
    const role = user.role;

    // Store authentication tokens and basic user information.
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
    localStorage.setItem("userId", String(user.id));
    localStorage.setItem("username", user.username);
    localStorage.setItem("role", role);

    setCurrentUser(user);
    setLoginMessage("");
    setResetEmail("");

    // Redirect the user to their role-specific dashboard.
    if (role === "Admin") {
      setPage("admin-dashboard");
    } else if (role === "Manager") {
      setPage("manager-dashboard");
    } else {
      setPage("employee-dashboard");
    }
  };

  // Handle logout using the existing backend logout API.
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
        throw new Error(`Logout failed: ${response.status}`);
      }

      // Remove stored tokens after successful logout.
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

  // Redirect to Employee Login after registration.
  const handleRegisterSuccess = () => {
    setLoginMode("employee");
    setLoginMessage("");
    setPage("login");
  };

  // Logout the user after password has been changed.
  const handlePasswordChanged = () => {
    clearAuthStorage();

    setCurrentUser(null);
    setLoginMode("employee");
    setResetEmail("");
    setLoginMessage("Password updated successfully. Please log in again.");
    setPage("login");
  };

  // Open the Forgot Password page.
  const handleForgotPassword = () => {
    setLoginMessage("");
    setResetEmail("");
    setLoginMode("employee");
    setPage("forgot-password");
  };

  // Store email after OTP has been sent.
  const handleOtpSent = (email) => {
    setResetEmail(email);
    setPage("reset-password");
  };

  // Redirect after successful password reset.
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

  // Return to the Forgot Password page.
  const handleBackToForgot = () => {
    setPage("forgot-password");
  };

  // Return to Employee Login.
  const handleBackToEmployeeLogin = () => {
    setResetEmail("");
    setLoginMessage("");
    setLoginMode("employee");
    setPage("login");
  };

  // Return to Employee Login from registration.
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

      {/* Manager Dashboard */}
      {page === "manager-dashboard" && currentUser?.role === "Manager" && (
        <ManagerDashboard
          user={currentUser}
          onLogout={handleLogout}
          isLoggingOut={isLoggingOut}
        />
      )}

      {/* Employee Dashboard */}
      {page === "employee-dashboard" &&
        currentUser &&
        !currentUser.is_staff &&
        currentUser.role === "Employee" && (
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

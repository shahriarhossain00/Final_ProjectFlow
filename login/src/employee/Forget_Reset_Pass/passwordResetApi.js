const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

// Convert backend validation errors into readable messages
function getErrorMessage(data, fallbackMessage) {
  if (!data || typeof data !== "object") {
    return fallbackMessage;
  }

  if (typeof data.detail === "string") {
    return data.detail;
  }

  const errors = Object.values(data);

  for (const error of errors) {
    if (Array.isArray(error) && error.length > 0) {
      return String(error[0]);
    }

    if (typeof error === "string") {
      return error;
    }
  }

  return fallbackMessage;
}

// Send password reset OTP to employee email
export async function forgotPassword(email) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail) {
    throw new Error("Email address is required.");
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/forgot-password/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: normalizedEmail,
      }),
    });
  } catch {
    throw new Error("Cannot connect to the server. Please try again.");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(data, "Unable to send reset code. Please try again."),
    );
  }

  return data;
}

// Reset password using email OTP
export async function resetPassword({
  email,
  otp,
  newPassword,
  confirmPassword,
}) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!normalizedEmail || !otp.trim()) {
    throw new Error("Email and OTP are required.");
  }

  if (!newPassword || !confirmPassword) {
    throw new Error("All password fields are required.");
  }

  if (newPassword !== confirmPassword) {
    throw new Error("New password and confirm password do not match.");
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/reset-password/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: normalizedEmail,
        otp: otp.trim(),
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    });
  } catch {
    throw new Error("Cannot connect to the server. Please try again.");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(data, "Password reset failed. Please try again."),
    );
  }

  return data;
}

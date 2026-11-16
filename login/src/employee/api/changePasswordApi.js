const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

// Convert Django REST Framework errors into readable messages
function getErrorMessage(data) {
  if (!data || typeof data !== "object") {
    return "Unable to change password. Please try again.";
  }

  if (typeof data.detail === "string") {
    return data.detail;
  }

  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value.length > 0) {
      return String(value[0]);
    }

    if (typeof value === "string") {
      return value;
    }
  }

  return "Unable to change password. Please try again.";
}

// Change password for the authenticated employee
export async function changeEmployeePassword({
  oldPassword,
  newPassword,
  confirmPassword,
}) {
  const accessToken = localStorage.getItem("accessToken");

  if (!accessToken) {
    throw new Error("Session expired. Please log in again.");
  }

  if (!oldPassword || !newPassword || !confirmPassword) {
    throw new Error("All password fields are required.");
  }

  if (newPassword !== confirmPassword) {
    throw new Error("New passwords do not match.");
  }

  if (oldPassword === newPassword) {
    throw new Error("New password must be different from current password.");
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/change-password/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword,
      }),
    });
  } catch {
    throw new Error("Cannot connect to the server. Please try again.");
  }

  const data = await response.json().catch(() => null);

  if (response.status === 401) {
    throw new Error("Session expired. Please log in again.");
  }

  if (!response.ok) {
    throw new Error(getErrorMessage(data));
  }

  return data;
}

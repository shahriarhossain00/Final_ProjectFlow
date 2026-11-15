const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

// Fetch authenticated employee profile picture and details
export async function getEmployeeProfile(accessToken) {
  if (!accessToken) {
    throw new Error("Access token is missing. Please log in again.");
  }

  const response = await fetch(`${API_BASE_URL}/api/profile-picture/`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Session expired. Please log in again.");
    }

    throw new Error(data?.detail || "Failed to load employee profile.");
  }

  if (!data || typeof data !== "object") {
    throw new Error("Invalid profile response from server.");
  }

  return data;
}

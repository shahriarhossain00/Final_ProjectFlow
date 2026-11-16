const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

export async function getEmployeeProfile(accessToken) {
  if (!accessToken) {
    throw new Error("Please login again.");
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
    throw new Error(
      data?.detail || `Failed to load profile (${response.status}).`,
    );
  }

  return data;
}

export async function uploadEmployeeProfilePicture(file) {
  const accessToken = localStorage.getItem("accessToken");

  if (!accessToken) {
    throw new Error("Please login again.");
  }

  if (!file || !["image/jpeg", "image/png"].includes(file.type)) {
    throw new Error("Only JPG and PNG images are allowed.");
  }

  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Image must be 2 MB or less.");
  }

  const formData = new FormData();
  formData.append("profile_picture", file);

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/api/profile-picture/`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });
  } catch {
    throw new Error("Cannot connect to the backend server.");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = Array.isArray(data?.profile_picture)
      ? data.profile_picture.join(", ")
      : data?.detail || `Profile picture upload failed (${response.status}).`;

    throw new Error(message);
  }

  return data;
}

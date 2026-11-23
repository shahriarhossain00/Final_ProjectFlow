const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getAccessToken() {
  return localStorage.getItem("accessToken");
}

async function notificationRequest(path, options = {}) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("You are not logged in.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Your session has expired. Please log in again.");
    }

    if (response.status === 403) {
      throw new Error("You do not have permission to access notifications.");
    }

    if (response.status === 404) {
      throw new Error("Notification not found.");
    }

    throw new Error(`Notification request failed (${response.status}).`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function getNotifications(url = null) {
  const path = url
    ? `${new URL(url, API_BASE_URL).pathname}${new URL(url, API_BASE_URL).search}`
    : "/project/notifications/";

  const data = await notificationRequest(path);

  return {
    count: data.count ?? 0,
    next: data.next ?? null,
    previous: data.previous ?? null,
    results: Array.isArray(data.results) ? data.results : [],
  };
}

export async function dismissNotification(notificationId) {
  if (
    !Number.isInteger(Number(notificationId)) ||
    Number(notificationId) <= 0
  ) {
    throw new Error("Invalid notification ID.");
  }

  return notificationRequest(
    `/project/notifications/${encodeURIComponent(notificationId)}/read/`,
    {
      method: "POST",
    },
  );
}

const API_BASE_URL = (
  import.meta.env.DEV
    ? import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
    : window.location.origin
).replace(/\/$/, "");

async function chatRequest(path, options = {}) {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    throw new Error("Session expired. Please log in again.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.detail || data?.message || `Request failed (${response.status})`,
    );
  }

  return data;
}

// Fetch a specific project's chatbox and messages.
export async function getProjectChatbox(projectId, signal) {
  if (!projectId) {
    throw new Error("Project ID is required.");
  }

  return chatRequest(`/project/chatboxes/${encodeURIComponent(projectId)}/`, {
    signal,
  });
}

// Fetch chatboxes available through the admin endpoint.
export async function getAdminChatboxes(signal) {
  return chatRequest("/project/chatboxes/admins/", { signal });
}

// Send a message to a specific chatbox.
export async function sendChatMessage(chatboxId, content) {
  const message = content?.trim();

  if (!chatboxId || !message) {
    throw new Error("Chatbox and message are required.");
  }

  return chatRequest("/project/messages/", {
    method: "POST",
    body: JSON.stringify({
      chatbox: chatboxId,
      content: message,
    }),
  });
}

export async function getChatUsers(signal) {
  const token = localStorage.getItem("accessToken");

  const response = await fetch(`${API_BASE_URL}/api/all_employees/`, {
    method: "GET",
    signal,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error("Unable to load chat users.");
  }

  const data = await response.json();

  if (Array.isArray(data)) {
    return data;
  }

  return Array.isArray(data?.results) ? data.results : [];
}

// Generate an AI summary of a project's team chat.
export async function getProjectChatSummary(projectId, signal) {
  if (!Number.isSafeInteger(Number(projectId)) || Number(projectId) <= 0) {
    throw new Error("Valid project ID is required.");
  }

  const token = localStorage.getItem("accessToken");

  if (!token) {
    throw new Error("Session expired. Please log in again.");
  }

  const response = await fetch(
    `${API_BASE_URL}/project/chat-summary/${encodeURIComponent(projectId)}/`,
    {
      method: "GET",
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    const messages = {
      401: "Session expired. Please log in again.",
      403: "You do not have permission to summarize this chat.",
      404: "Project or chat not found.",
      429: "Too many requests. Please try again later.",
      503: "AI summarization is temporarily unavailable.",
    };

    throw new Error(
      messages[response.status] ||
        "Unable to generate chat summary. Please try again.",
    );
  }

  return await response.json();
}

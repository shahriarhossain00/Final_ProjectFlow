import { resolvePaginationUrl } from "./pagination";
const API_BASE_URL = (
  import.meta.env.DEV
    ? import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
    : window.location.origin
).replace(/\/$/, "");

async function apiRequest(path, signal) {
  const accessToken = localStorage.getItem("accessToken");

  if (!accessToken) {
    throw new Error("Session expired. Please login again.");
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: "GET",
      signal,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error("Cannot connect to the backend server.", {
      cause: error,
    });
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      response.status === 401
        ? "Session expired. Please login again."
        : response.status === 403
          ? "You do not have permission to view submissions."
          : data?.detail || `Failed to load submissions (${response.status}).`;

    throw new Error(message);
  }

  return data;
}

export async function getTaskSubmissions(signal) {
  const submissions = [];
  const visited = new Set();

  const allowedOrigin = new URL(API_BASE_URL).origin;

  let nextUrl = new URL("/project/tasks/submissions/", `${API_BASE_URL}/`).href;

  while (nextUrl) {
    const url = new URL(nextUrl);

    if (url.origin !== allowedOrigin) {
      throw new Error("Invalid pagination URL.");
    }

    if (visited.has(url.href) || visited.size >= 100) {
      throw new Error("Invalid pagination response.");
    }

    visited.add(url.href);

    const data = await apiRequest(`${url.pathname}${url.search}`, signal);

    if (Array.isArray(data)) {
      submissions.push(...data);
      break;
    }

    if (!data || !Array.isArray(data.results)) {
      throw new Error("Unexpected submissions API response.");
    }

    submissions.push(...data.results);

    nextUrl = resolvePaginationUrl(data.next, url.href, API_BASE_URL);
  }

  return submissions;
}

// Allow only files hosted on the configured backend.
export function getSubmissionFileUrl(file) {
  if (!file || typeof file !== "string") {
    return null;
  }

  try {
    const url = new URL(file, `${API_BASE_URL}/`);

    if (
      url.origin !== new URL(API_BASE_URL).origin ||
      !["http:", "https:"].includes(url.protocol)
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

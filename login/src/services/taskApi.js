import { resolvePaginationUrl } from "./pagination";
const API_BASE_URL = (
  import.meta.env.DEV
    ? import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
    : window.location.origin
).replace(/\/$/, "");

function getToken() {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    throw new Error("Please login again.");
  }

  return token;
}

async function apiRequest(path, options = {}) {
  const { method = "GET", body, signal } = options;

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        Authorization: `Bearer ${getToken()}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
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
    const error = new Error(
      response.status === 401
        ? "Session expired. Please login again."
        : response.status === 403
          ? "You do not have permission."
          : response.status === 404
            ? "Requested resource not found."
            : data?.detail || `Request failed (${response.status}).`,
    );

    error.status = response.status;
    error.fields = data;

    throw error;
  }

  return data;
}

// Supports normal arrays and DRF pagination
async function fetchAllPages(path, signal) {
  const results = [];
  const visited = new Set();
  const allowedOrigin = new URL(API_BASE_URL).origin;

  let nextUrl = new URL(path, `${API_BASE_URL}/`).href;

  while (nextUrl) {
    const url = new URL(nextUrl);

    if (url.origin !== allowedOrigin) {
      throw new Error("Invalid pagination URL.");
    }

    if (visited.has(url.href) || visited.size >= 100) {
      throw new Error("Invalid pagination response.");
    }

    visited.add(url.href);

    const data = await apiRequest(`${url.pathname}${url.search}`, { signal });

    if (Array.isArray(data)) {
      results.push(...data);
      break;
    }

    if (!data || !Array.isArray(data.results)) {
      throw new Error("Unexpected API response format.");
    }

    results.push(...data.results);

    nextUrl = resolvePaginationUrl(data.next, url.href, API_BASE_URL);
  }

  return results;
}

// 1. Get employees for assignment dropdown
export function getEmployees(signal) {
  return fetchAllPages("/api/all_employees/", signal);
}

// 2. Get all tasks
export function getTasks(signal) {
  return fetchAllPages("/project/tasks/", signal);
}

// 3. Get selected project details
export function getTaskProject(projectId, signal) {
  const id = Number(projectId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid project ID.");
  }

  return apiRequest(`/project/projects/${id}/`, {
    signal,
  });
}

// 4. Create task and assign employee
export function createTask(taskData) {
  return apiRequest("/project/tasks/", {
    method: "POST",
    body: taskData,
  });
}
// Update an existing task
export async function updateTask(taskId, taskData) {
  return apiRequest(`/project/tasks/${taskId}/`, {
    method: "PATCH",
    body: taskData,
  });
}

// Delete an existing task
export async function deleteTask(taskId) {
  return apiRequest(`/project/tasks/${taskId}/`, {
    method: "DELETE",
  });
}

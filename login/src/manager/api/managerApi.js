import { resolvePaginationUrl } from "../../services/pagination";

// Manager API configuration.
const API_BASE_URL = (
  import.meta.env.DEV
    ? import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
    : window.location.origin
).replace(/\/$/, "");

// Retrieve the authentication token.
function getToken() {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    throw new Error("Session expired. Please log in again.");
  }

  return token;
}

// Validate resource IDs.
function validateId(value, resource = "Resource") {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`Invalid ${resource.toLowerCase()} ID.`);
  }

  return id;
}

// Centralized authenticated API request handler.
async function apiRequest(endpoint, options = {}) {
  const headers = new Headers(options.headers || {});

  headers.set("Accept", "application/json");
  headers.set("Authorization", `Bearer ${getToken()}`);

  if (options.body !== undefined && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new Error("Cannot connect to the backend server.", {
      cause: error,
    });
  }

  const responseData = await response.json().catch(() => null);

  if (!response.ok) {
    let message = `Request failed (${response.status}).`;

    if (response.status === 401) {
      message = "Session expired. Please log in again.";
    } else if (response.status === 403) {
      message = "You do not have permission.";
    } else if (response.status === 404) {
      message = "Requested resource not found.";
    } else if (typeof responseData?.detail === "string") {
      message = responseData.detail;
    } else if (responseData && typeof responseData === "object") {
      const fieldMessages = Object.entries(responseData)
        .map(([field, errors]) => {
          const errorText = Array.isArray(errors)
            ? errors.join(", ")
            : String(errors);

          return `${field}: ${errorText}`;
        })
        .join("\n");

      if (fieldMessages) {
        message = fieldMessages;
      }
    }

    const error = new Error(message);

    error.status = response.status;
    error.fields = responseData;

    throw error;
  }

  return responseData;
}

// Fetch all pages from list endpoints.
// Supports normal arrays and paginated DRF responses.
async function fetchAllPages(endpoint, signal) {
  const results = [];
  const visited = new Set();

  const allowedOrigin = new URL(API_BASE_URL).origin;

  let nextUrl = new URL(endpoint, `${API_BASE_URL}/`).href;

  while (nextUrl) {
    const url = new URL(nextUrl);

    if (url.origin !== allowedOrigin) {
      throw new Error("Unexpected pagination host.");
    }

    if (visited.has(url.href) || visited.size >= 100) {
      throw new Error("Invalid pagination response.");
    }

    visited.add(url.href);

    const data = await apiRequest(`${url.pathname}${url.search}`, { signal });

    // Non-paginated response.
    if (Array.isArray(data)) {
      results.push(...data);
      break;
    }

    // Standard Django REST Framework pagination.
    if (Array.isArray(data?.results)) {
      results.push(...data.results);
    } else if (Array.isArray(data?.data)) {
      results.push(...data.data);
    } else {
      throw new Error("Unexpected API response format.");
    }

    nextUrl = resolvePaginationUrl(data.next, url.href, API_BASE_URL);
  }

  return results;
}

// ==========================================
// DEPARTMENT API
// ==========================================

// Fetch all departments.
export function getDepartments(signal) {
  return fetchAllPages("/project/departments/", signal);
}

// ==========================================
// PROJECT API
// ==========================================

// Fetch projects from the general project endpoint.
// Retained for compatibility with existing components.
export function getProjects(signal) {
  return fetchAllPages("/project/projects/", signal);
}

// Fetch projects managed by the authenticated manager.
export function getMyManagedProjects(signal) {
  return fetchAllPages("/project/all-projects/manager/", signal);
}

// Create a new project.
export function createProject(projectData) {
  return apiRequest("/project/projects/", {
    method: "POST",
    body: JSON.stringify(projectData),
  });
}

// Update an existing project.
export function updateProject(projectId, projectData) {
  const id = validateId(projectId, "Project");

  return apiRequest(`/project/projects/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(projectData),
  });
}

// Fetch details of a specific project.
export function getProjectDetails(projectId, signal) {
  const id = validateId(projectId, "Project");

  return apiRequest(`/project/projects/${id}/`, {
    signal,
  });
}

// ==========================================
// TASK API
// ==========================================

// Fetch tasks from the general task endpoint.
// Retained for compatibility with existing components.
export function getTasks(signal) {
  return fetchAllPages("/project/tasks/", signal);
}

// Fetch tasks assigned to a specific user.
export function getUserTasks(userId, signal) {
  const id = validateId(userId, "User");

  return fetchAllPages(`/project/tasks/user/${id}/`, signal);
}

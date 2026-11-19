// Manager API Service
// Centralized API functions for Manager project management.
// Uses the existing backend endpoints without backend changes.
const API_BASE_URL = (
  import.meta.env.DEV
    ? import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
    : window.location.origin
).replace(/\/$/, "");

// Common request handler
// Adds authentication token and handles API errors.

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("accessToken");

  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  // Attach JWT token to authenticated API requests.
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  // Add JSON content type unless the request uses FormData.
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Read response safely because some endpoints may return no body.
  const responseData = await response.json().catch(() => null);

  // Convert backend errors into readable frontend errors.
  if (!response.ok) {
    let message = "Request failed.";

    if (typeof responseData?.detail === "string") {
      message = responseData.detail;
    } else if (responseData && typeof responseData === "object") {
      message = Object.entries(responseData)
        .map(([field, errors]) => {
          const errorText = Array.isArray(errors)
            ? errors.join(", ")
            : String(errors);

          return `${field}: ${errorText}`;
        })
        .join("\n");
    }

    throw new Error(message || `HTTP ${response.status}`);
  }

  return responseData;
}

// Normalize list API responses.
// Supports both normal arrays and paginated DRF responses.

function normalizeList(response) {
  if (Array.isArray(response)) {
    return response;
  }

  if (Array.isArray(response?.results)) {
    return response.results;
  }

  if (Array.isArray(response?.data)) {
    return response.data;
  }

  return [];
}

// DEPARTMENT API

// Fetch departments for the Project creation form.
export async function getDepartments() {
  const response = await apiRequest("/project/departments/");
  return normalizeList(response);
}

// PROJECT API

// Fetch existing projects.

export async function getProjects() {
  const response = await apiRequest("/project/projects/");
  return normalizeList(response);
}

// Create a new project using the existing backend API.
export async function createProject(projectData) {
  return apiRequest("/project/projects/", {
    method: "POST",
    body: JSON.stringify(projectData),
  });
}

// Update an existing project.
export async function updateProject(projectId, projectData) {
  return apiRequest(`/project/projects/${projectId}/`, {
    method: "PATCH",
    body: JSON.stringify(projectData),
  });
}

// Fetch details of a specific project.
export async function getProjectDetails(projectId) {
  return apiRequest(`/project/projects/${projectId}/`);
}
// TASK API

// Fetch all tasks from the existing backend API.
export async function getTasks() {
  const response = await apiRequest("/project/tasks/");
  return normalizeList(response);
}

// Fetch tasks belonging to a specific user.
export async function getUserTasks(userId) {
  const response = await apiRequest(`/project/tasks/user/${userId}/`);
  return normalizeList(response);
}

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(message, status, fields = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

export function toUiProject(project) {
  return {
    ...project,
    id: project.id,
    projectName: project.name,
    description: project.description ?? "",
  };
}

async function request(path, { signal, method = "GET", body } = {}) {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    throw new ApiError("Session expired. Please log in again.", 401);
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw error;
    }

    throw new ApiError(
      "Cannot connect to the Django server. Check that it is running.",
      0,
    );
  }

  const data =
    response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    let message = data?.detail || data?.message;

    if (!message && data && typeof data === "object") {
      message = Object.entries(data)
        .map(([field, errors]) => {
          const text = Array.isArray(errors)
            ? errors.join(", ")
            : String(errors);

          return `${field}: ${text}`;
        })
        .join(" | ");
    }

    throw new ApiError(
      message || `Request failed (${response.status}).`,
      response.status,
      data || {},
    );
  }

  return data;
}

async function fetchAll(path, signal) {
  const items = [];
  const visited = new Set();

  let next = new URL(path, `${API_BASE_URL}/`).href;

  const origin = new URL(API_BASE_URL).origin;

  while (next) {
    const current = new URL(next);

    if (current.origin !== origin) {
      throw new Error("Unexpected API pagination host.");
    }

    if (visited.has(current.href) || visited.size >= 100) {
      throw new Error("Pagination loop or excessive pages.");
    }

    visited.add(current.href);

    const page = await request(`${current.pathname}${current.search}`, {
      signal,
    });

    if (Array.isArray(page)) {
      items.push(...page);
      break;
    }

    if (!page || !Array.isArray(page.results)) {
      throw new Error("Unexpected API response format.");
    }

    items.push(...page.results);

    next = page.next ? new URL(page.next, current.href).href : null;
  }

  return items;
}

export function getDepartments(signal) {
  return fetchAll("/project/departments/", signal);
}

export function getProjects(signal) {
  return fetchAll("/project/projects/", signal);
}

export function createProject(payload) {
  return request("/project/projects/", {
    method: "POST",
    body: payload,
  });
}

export function updateProject(id, payload) {
  return request(`/project/projects/${encodeURIComponent(id)}/`, {
    method: "PATCH",
    body: payload,
  });
}

export function deleteProject(id) {
  return request(`/project/projects/${encodeURIComponent(id)}/`, {
    method: "DELETE",
  });
}

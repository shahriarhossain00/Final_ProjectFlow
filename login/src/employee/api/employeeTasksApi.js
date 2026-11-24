import { resolvePaginationUrl } from "../../services/pagination";

const API_BASE_URL = (
  import.meta.env.DEV
    ? import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
    : window.location.origin
).replace(/\/$/, "");

// Fetch all tasks assigned to the specified employee.
export async function getEmployeeTasks(userId, signal) {
  const accessToken = localStorage.getItem("accessToken");

  if (!accessToken) {
    throw new Error("Session expired. Please log in again.");
  }

  const id = Number(userId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid employee ID.");
  }

  const apiOrigin = new URL(API_BASE_URL).origin;

  let nextUrl = new URL(`/project/tasks/user/${id}/`, API_BASE_URL).href;

  const tasks = [];
  const visitedUrls = new Set();

  while (nextUrl) {
    const url = new URL(nextUrl);

    // Prevent requests to unexpected external hosts.
    if (url.origin !== apiOrigin) {
      throw new Error("Unexpected pagination host.");
    }

    // Prevent infinite pagination loops.
    if (visitedUrls.has(url.href) || visitedUrls.size >= 100) {
      throw new Error("Invalid pagination response.");
    }

    visitedUrls.add(url.href);

    let response;

    try {
      response = await fetch(url.href, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
        signal,
      });
    } catch (error) {
      if (error.name === "AbortError") {
        throw error;
      }

      throw new Error("Cannot connect to the server.", {
        cause: error,
      });
    }

    const data = await response.json().catch(() => null);

    if (response.status === 401) {
      throw new Error("Session expired. Please log in again.");
    }

    if (response.status === 403) {
      throw new Error("You do not have permission to access these tasks.");
    }

    if (response.status === 404) {
      throw new Error("Requested tasks were not found.");
    }

    if (!response.ok) {
      throw new Error(
        typeof data?.detail === "string"
          ? data.detail
          : `Failed to load tasks (${response.status}).`,
      );
    }

    // Support non-paginated responses.
    if (Array.isArray(data)) {
      tasks.push(...data);
      break;
    }

    // Support Django REST Framework pagination.
    if (!Array.isArray(data?.results)) {
      throw new Error("Unexpected task response format.");
    }

    tasks.push(...data.results);

    // Preserve the configured API origin and Netlify proxy.
    nextUrl = resolvePaginationUrl(data.next, url.href, API_BASE_URL);
  }

  return tasks;
}

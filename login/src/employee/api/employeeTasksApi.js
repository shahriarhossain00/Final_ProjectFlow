const API_BASE_URL = (
  import.meta.env.DEV
    ? import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
    : window.location.origin
).replace(/\/$/, "");

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

  let nextUrl = `${API_BASE_URL}/project/tasks/user/${id}/`;

  const tasks = [];
  const visitedUrls = new Set();

  while (nextUrl) {
    const url = new URL(nextUrl, API_BASE_URL);

    if (url.origin !== apiOrigin) {
      throw new Error("Unexpected pagination host.");
    }

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

    if (!response.ok) {
      throw new Error(
        data?.detail || `Failed to load tasks (${response.status}).`,
      );
    }

    if (Array.isArray(data)) {
      tasks.push(...data);
      break;
    }

    if (!Array.isArray(data?.results)) {
      throw new Error("Unexpected task response format.");
    }

    tasks.push(...data.results);

    nextUrl = data.next ? new URL(data.next, url.href).href : null;
  }

  return tasks;
}

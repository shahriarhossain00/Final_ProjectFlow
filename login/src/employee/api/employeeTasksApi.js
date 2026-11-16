const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
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

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/project/tasks/user/${id}/`, {
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

  // Support plain arrays and paginated DRF responses.
  const tasks = Array.isArray(data) ? data : data?.results;

  if (!Array.isArray(tasks)) {
    throw new Error("Unexpected task response format.");
  }

  return tasks;
}

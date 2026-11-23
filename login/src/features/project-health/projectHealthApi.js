const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export async function getProjectHealth(projectId) {
  if (!Number.isSafeInteger(Number(projectId)) || Number(projectId) <= 0) {
    throw new Error("Invalid project ID.");
  }

  if (!API_BASE_URL) {
    throw new Error("API base URL is not configured.");
  }

  const token = localStorage.getItem("accessToken");

  if (!token) {
    throw new Error("Please log in to view project health.");
  }

  const response = await fetch(
    `${API_BASE_URL.replace(/\/+$/, "")}/project/projects/${projectId}/health/`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );

  let data = null;

  try {
    data = await response.json();
  } catch {
    if (response.ok) {
      throw new Error("Invalid response from the server.");
    }
  }

  if (!response.ok) {
    const messages = {
      401: "Your session has expired. Please log in again.",
      403: "You do not have permission to view this project's health report.",
      404: "Project or health report not found.",
      503: "The AI health analysis service is temporarily unavailable.",
    };

    throw new Error(
      messages[response.status] ||
        data?.detail ||
        `Failed to load project health (${response.status}).`,
    );
  }

  if (
    !data ||
    typeof data.health?.score !== "number" ||
    typeof data.health?.level !== "string" ||
    typeof data.analysis !== "string"
  ) {
    throw new Error("Unexpected project health response format.");
  }

  return data;
}

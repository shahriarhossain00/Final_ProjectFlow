const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

export async function createTaskWithFile(taskData) {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    throw new Error("Please login again.");
  }

  const formData = new FormData();

  formData.append("project", String(taskData.project));
  formData.append("title", taskData.title.trim());
  formData.append("description", taskData.description || "");
  formData.append("assigned_to", String(taskData.assigned_to));
  formData.append("status", taskData.status || "Not Started");

  if (taskData.start_date) {
    formData.append("start_date", taskData.start_date);
  }

  if (taskData.finish_date) {
    formData.append("finish_date", taskData.finish_date);
  }

  if (taskData.task_file) {
    formData.append("task_file", taskData.task_file);
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/project/tasks/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  } catch {
    throw new Error("Cannot connect to backend server.");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const details =
      data && typeof data === "object"
        ? Object.entries(data)
            .map(([key, value]) => {
              const message = Array.isArray(value)
                ? value.join(", ")
                : String(value);

              return `${key}: ${message}`;
            })
            .join(" | ")
        : "";

    throw new Error(details || `Failed to create task (${response.status}).`);
  }

  return data;
}

const API_BASE_URL = (
  import.meta.env.DEV
    ? import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
    : window.location.origin
).replace(/\/$/, "");

export async function submitTaskWork({
  taskId,
  message = "",
  url = "",
  file = null,
}) {
  const accessToken = localStorage.getItem("accessToken");

  if (!accessToken) {
    throw new Error("Session expired. Please login again.");
  }

  const id = Number(taskId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid task ID.");
  }

  const trimmedMessage = message.trim();
  const trimmedUrl = url.trim();

  // Require at least one submission content
  if (!trimmedMessage && !trimmedUrl && !file) {
    throw new Error("Please provide a message, URL, or file.");
  }

  // Validate URL
  if (trimmedUrl) {
    try {
      const parsedUrl = new URL(trimmedUrl);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid URL protocol.");
      }
    } catch {
      throw new Error(
        "Please enter a valid URL starting with http:// or https://.",
      );
    }
  }

  // Prepare multipart form data
  const formData = new FormData();

  formData.append("task", String(id));
  formData.append("message", trimmedMessage);
  formData.append("url", trimmedUrl);

  if (file) {
    formData.append("file", file);
  }

  let response;

  try {
    response = await fetch(`${API_BASE_URL}/project/tasks/submissions/`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });
  } catch (error) {
    throw new Error("Cannot connect to the backend server.", { cause: error });
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    let errorMessage;

    if (response.status === 400) {
      errorMessage = "Invalid submission data.";
    } else if (response.status === 401) {
      errorMessage = "Session expired. Please login again.";
    } else if (response.status === 403) {
      errorMessage = "You are not allowed to submit work for this task.";
    } else if (response.status === 404) {
      errorMessage = "Task not found.";
    } else {
      errorMessage = `Submission failed (${response.status}).`;
    }

    // Display Django validation errors
    if (data && typeof data === "object") {
      const details = Object.entries(data)
        .map(([field, errors]) => {
          const text = Array.isArray(errors)
            ? errors.join(", ")
            : String(errors);

          return `${field}: ${text}`;
        })
        .join(" | ");

      if (details) {
        errorMessage = details;
      }
    }

    const error = new Error(errorMessage);
    error.status = response.status;
    error.fields = data;

    throw error;
  }

  return data;
}

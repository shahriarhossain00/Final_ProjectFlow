const API_BASE_URL = (
  import.meta.env.DEV
    ? import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
    : window.location.origin
).replace(/\/$/, "");

const TASK_STATUSES = ["Not Started", "In Progress", "Completed", "On Hold"];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

const ALLOWED_EXTENSIONS = [
  "pdf",
  "doc",
  "docx",
  "zip",
  "png",
  "jpg",
  "jpeg",
  "txt",
];

// Structured error for task creation requests.
class TaskFileApiError extends Error {
  constructor(message, status = 0, fields = {}) {
    super(message);

    this.name = "TaskFileApiError";
    this.status = status;
    this.fields = fields;
  }
}

// Validate numeric resource IDs.
function isValidId(value) {
  const id = Number(value);

  return Number.isSafeInteger(id) && id > 0;
}

// Validate task data before sending the request.
function validateTaskData(taskData) {
  const errors = {};

  if (!isValidId(taskData?.project)) {
    errors.project = "Invalid project ID.";
  }

  const title = String(taskData?.title ?? "").trim();

  if (!title) {
    errors.title = "Task title is required.";
  } else if (title.length > 150) {
    errors.title = "Task title cannot exceed 150 characters.";
  }

  if (!isValidId(taskData?.assigned_to)) {
    errors.assigned_to = "Please select a valid employee.";
  }

  const status = taskData?.status || "Not Started";

  if (!TASK_STATUSES.includes(status)) {
    errors.status = "Invalid task status.";
  }

  if (
    taskData?.start_date &&
    taskData?.finish_date &&
    taskData.finish_date < taskData.start_date
  ) {
    errors.finish_date = "Finish date cannot be earlier than start date.";
  }

  // Validate optional task attachment.
  if (taskData?.task_file) {
    const file = taskData.task_file;

    if (!(file instanceof File)) {
      errors.task_file = "Invalid attachment.";
    } else {
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (file.size > MAX_FILE_SIZE) {
        errors.task_file = "File must not exceed 10 MB.";
      } else if (!ALLOWED_EXTENSIONS.includes(extension)) {
        errors.task_file = "Unsupported attachment file type.";
      }
    }
  }

  if (Object.keys(errors).length > 0) {
    throw new TaskFileApiError(
      "Please correct the highlighted fields.",
      400,
      errors,
    );
  }
}

// Create a task with an optional file attachment.
export async function createTaskWithFile(taskData) {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    throw new TaskFileApiError("Session expired. Please log in again.", 401);
  }

  validateTaskData(taskData);

  const formData = new FormData();

  formData.append("project", String(Number(taskData.project)));

  formData.append("title", taskData.title.trim());

  formData.append("description", taskData.description || "");

  formData.append("assigned_to", String(Number(taskData.assigned_to)));

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
        Accept: "application/json",
      },
      body: formData,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      throw error;
    }

    throw new TaskFileApiError("Cannot connect to the backend server.");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const fields = data && typeof data === "object" ? data : {};

    let message;

    switch (response.status) {
      case 401:
        message = "Session expired. Please log in again.";
        break;

      case 403:
        message = "You do not have permission to assign tasks.";
        break;

      case 404:
        message = "Project or employee not found.";
        break;

      case 413:
        message = "The attachment is too large.";
        break;

      case 429:
        message = "Too many requests. Please try again later.";
        break;

      default:
        if (typeof data?.detail === "string") {
          message = data.detail;
        } else if (typeof data?.message === "string") {
          message = data.message;
        } else if (response.status === 400) {
          message = "Please check the task information.";
        } else {
          message = `Failed to create task (${response.status}).`;
        }
    }

    throw new TaskFileApiError(message, response.status, fields);
  }

  return data;
}

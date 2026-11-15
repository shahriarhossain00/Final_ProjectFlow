import { useEffect, useRef, useState } from "react";
import "./TaskList.css";
import "./TaskAssignmentForm.css";

import { createTaskWithFile } from "../services/taskFileApi";
import { getEmployees, getTaskProject } from "../services/taskApi";

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

const INITIAL_FORM = {
  title: "",
  description: "",
  assigned_to: "",
  status: "Not Started",
  start_date: "",
  finish_date: "",
};

function TaskAssignmentForm({ projectId, onSuccess, onCancel }) {
  const [project, setProject] = useState(null);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [loadError, setLoadError] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState("");

  const [taskFile, setTaskFile] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const submittingRef = useRef(false);
  const fileInputRef = useRef(null);

  const selectedProjectId = Number(projectId);

  const validProjectId =
    Number.isSafeInteger(selectedProjectId) && selectedProjectId > 0;

  useEffect(() => {
    if (!validProjectId) {
      return;
    }

    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setLoadError("");

      try {
        const [projectData, employeeData] = await Promise.all([
          getTaskProject(projectId, controller.signal),
          getEmployees(controller.signal),
        ]);

        if (controller.signal.aborted) return;

        setProject(projectData);
        setEmployees(employeeData);
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error("Task Form Loading Error:", err);

        setLoadError(err.message || "Failed to load form data.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => controller.abort();
  }, [projectId, validProjectId]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setFieldErrors((previous) => ({
      ...previous,
      [name]: undefined,
    }));

    setError("");
    setSuccess("");
  };

  const handleFileChange = (event) => {
    const selectedFile = event.target.files?.[0] || null;

    setError("");
    setSuccess("");

    setFieldErrors((previous) => ({
      ...previous,
      task_file: undefined,
    }));

    if (!selectedFile) {
      setTaskFile(null);
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      setTaskFile(null);

      event.target.value = "";

      setFieldErrors((previous) => ({
        ...previous,
        task_file: "File must be smaller than 10 MB.",
      }));

      return;
    }

    // Validate file extension
    const extension = selectedFile.name.split(".").pop()?.toLowerCase();

    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      setTaskFile(null);

      event.target.value = "";

      setFieldErrors((previous) => ({
        ...previous,
        task_file:
          "Only PDF, DOC, DOCX, ZIP, PNG, JPG, JPEG and TXT files are allowed.",
      }));

      return;
    }

    setTaskFile(selectedFile);
  };

  const handleRemoveFile = () => {
    setTaskFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setFieldErrors((previous) => ({
      ...previous,
      task_file: undefined,
    }));
  };

  const validateForm = () => {
    const errors = {};

    if (!validProjectId) {
      errors.project = "Invalid project ID.";
    }

    if (!form.title.trim()) {
      errors.title = "Task title is required.";
    }

    if (!form.assigned_to) {
      errors.assigned_to = "Please select an employee.";
    } else {
      const employeeId = Number(form.assigned_to);

      if (
        !Number.isSafeInteger(employeeId) ||
        employeeId <= 0 ||
        !employees.some((employee) => Number(employee.id) === employeeId)
      ) {
        errors.assigned_to = "Please select a valid employee.";
      }
    }

    if (!TASK_STATUSES.includes(form.status)) {
      errors.status = "Please select a valid status.";
    }

    if (
      form.start_date &&
      form.finish_date &&
      form.finish_date < form.start_date
    ) {
      errors.finish_date = "Finish date cannot be earlier than start date.";
    }

    if (taskFile) {
      const extension = taskFile.name.split(".").pop()?.toLowerCase();

      if (taskFile.size > MAX_FILE_SIZE) {
        errors.task_file = "File must be smaller than 10 MB.";
      } else if (!ALLOWED_EXTENSIONS.includes(extension)) {
        errors.task_file = "Invalid file type.";
      }
    }

    setFieldErrors(errors);

    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submittingRef.current || loading || loadError || !project) {
      return;
    }

    setError("");
    setSuccess("");
    setFieldErrors({});

    if (!validateForm()) return;

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      project: selectedProjectId,
      assigned_to: Number(form.assigned_to),
      status: form.status,
      task_file: taskFile,
    };

    if (form.start_date) {
      payload.start_date = form.start_date;
    }

    if (form.finish_date) {
      payload.finish_date = form.finish_date;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      // Send task data and file using FormData
      const savedTask = await createTaskWithFile(payload);

      console.log("Created Task With File:", savedTask);

      setFieldErrors({});
      setSuccess("Task created and assigned successfully.");

      // Reset form
      setForm({ ...INITIAL_FORM });
      setTaskFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      // Notify parent component
      if (typeof onSuccess === "function") {
        await onSuccess(savedTask);
      }
    } catch (err) {
      console.error("Create Task Error:", err);

      if (err.fields && typeof err.fields === "object") {
        const errors = {};

        Object.entries(err.fields).forEach(([field, messages]) => {
          errors[field] = Array.isArray(messages)
            ? messages.join(", ")
            : String(messages);
        });

        setFieldErrors(errors);
      }

      if (err.status === 401) {
        setError("Session expired. Please login again.");
      } else if (err.status === 403) {
        setError("You do not have permission to assign tasks to this project.");
      } else if (err.status === 404) {
        setError("Project or employee not found.");
      } else {
        setError(err.message || "Failed to create task.");
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (!validProjectId) {
    return (
      <p className="form-error" role="alert">
        Invalid project selected.
      </p>
    );
  }

  if (loading) {
    return <p role="status">Loading project and employees...</p>;
  }

  if (loadError) {
    return (
      <div className="task-list-page task-assignment-page">
        <p className="form-error" role="alert">
          {loadError}
        </p>

        {onCancel && (
          <button type="button" onClick={onCancel}>
            Back to Tasks
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="task-list-page task-assignment-page">
      <h2>Create & Assign Task</h2>

      <p className="task-list-subtitle">
        Create a task and assign it to an employee.
      </p>

      <div className="task-project-card">
        <form onSubmit={handleSubmit}>
          {/* Selected Project */}
          <div className="task-control-group">
            <label htmlFor="task-project">Selected Project</label>

            <input
              id="task-project"
              type="text"
              value={project?.name || `Project #${selectedProjectId}`}
              readOnly
            />

            {fieldErrors.project && (
              <p className="form-error">{fieldErrors.project}</p>
            )}
          </div>

          {/* Task Title */}
          <div className="task-control-group">
            <label htmlFor="task-title">Task Title *</label>

            <input
              id="task-title"
              name="title"
              type="text"
              placeholder="Enter task title"
              value={form.title}
              maxLength={150}
              required
              disabled={submitting}
              onChange={handleChange}
            />

            {fieldErrors.title && (
              <p className="form-error">{fieldErrors.title}</p>
            )}
          </div>

          {/* Description */}
          <div className="task-control-group">
            <label htmlFor="task-description">Description</label>

            <textarea
              id="task-description"
              name="description"
              placeholder="Describe the task..."
              rows={4}
              value={form.description}
              disabled={submitting}
              onChange={handleChange}
            />

            {fieldErrors.description && (
              <p className="form-error">{fieldErrors.description}</p>
            )}
          </div>

          {/* Two Column Form Grid */}
          <div className="task-form-grid">
            {/* Employee Dropdown */}
            <div className="task-control-group">
              <label htmlFor="task-employee">Assign To *</label>

              <select
                id="task-employee"
                name="assigned_to"
                value={form.assigned_to}
                required
                disabled={submitting || employees.length === 0}
                onChange={handleChange}
              >
                <option value="">Select an employee</option>

                {employees.map((employee) => {
                  const fullName = [employee.first_name, employee.last_name]
                    .filter(Boolean)
                    .join(" ")
                    .trim();

                  return (
                    <option key={employee.id} value={employee.id}>
                      {fullName ||
                        employee.username ||
                        `Employee #${employee.id}`}
                    </option>
                  );
                })}
              </select>

              {employees.length === 0 && (
                <p className="form-error">
                  No employees available for assignment.
                </p>
              )}

              {fieldErrors.assigned_to && (
                <p className="form-error">{fieldErrors.assigned_to}</p>
              )}
            </div>

            {/* Task Status */}
            <div className="task-control-group">
              <label htmlFor="task-status">Status *</label>

              <select
                id="task-status"
                name="status"
                value={form.status}
                required
                disabled={submitting}
                onChange={handleChange}
              >
                {TASK_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>

              {fieldErrors.status && (
                <p className="form-error">{fieldErrors.status}</p>
              )}
            </div>

            {/* Start Date */}
            <div className="task-control-group">
              <label htmlFor="task-start-date">Start Date</label>

              <input
                id="task-start-date"
                name="start_date"
                type="date"
                value={form.start_date}
                disabled={submitting}
                onChange={handleChange}
              />

              {fieldErrors.start_date && (
                <p className="form-error">{fieldErrors.start_date}</p>
              )}
            </div>

            {/* Finish Date */}
            <div className="task-control-group">
              <label htmlFor="task-finish-date">Finish Date</label>

              <input
                id="task-finish-date"
                name="finish_date"
                type="date"
                min={form.start_date || undefined}
                value={form.finish_date}
                disabled={submitting}
                onChange={handleChange}
              />

              {fieldErrors.finish_date && (
                <p className="form-error">{fieldErrors.finish_date}</p>
              )}
            </div>
          </div>

          {/* Task Attachment */}
          <div className="task-control-group" style={{ marginTop: "18px" }}>
            <label htmlFor="task-file">Task Attachment (Optional)</label>

            <input
              id="task-file"
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.zip,.png,.jpg,.jpeg,.txt"
              disabled={submitting}
              onChange={handleFileChange}
            />

            <small
              style={{
                display: "block",
                color: "#64748b",
                marginTop: "8px",
              }}
            >
              Allowed: PDF, Word, ZIP, PNG, JPG and TXT. Maximum 10 MB.
            </small>

            {taskFile && (
              <div
                style={{
                  marginTop: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    color: "#2563eb",
                    overflowWrap: "anywhere",
                  }}
                >
                  Selected: {taskFile.name}
                </span>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleRemoveFile}
                  style={{
                    background: "#fee2e2",
                    color: "#b91c1c",
                    border: "none",
                    borderRadius: "6px",
                    padding: "6px 12px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  Remove
                </button>
              </div>
            )}

            {fieldErrors.task_file && (
              <p className="form-error">{fieldErrors.task_file}</p>
            )}
          </div>

          {/* General Errors */}
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          {fieldErrors.non_field_errors && (
            <p className="form-error" role="alert">
              {fieldErrors.non_field_errors}
            </p>
          )}

          {/* Success */}
          {success && (
            <p className="form-success" role="status">
              {success}
            </p>
          )}

          {/* Buttons */}
          <div className="task-modal-actions">
            {onCancel && (
              <button
                type="button"
                className="task-cancel-btn"
                disabled={submitting}
                onClick={onCancel}
              >
                Cancel
              </button>
            )}

            <button
              type="submit"
              className="task-save-btn"
              disabled={submitting || employees.length === 0}
            >
              {submitting ? "Creating Task..." : "Create & Assign Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskAssignmentForm;

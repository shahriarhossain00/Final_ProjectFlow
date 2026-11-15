import { useRef, useState } from "react";
import { submitTaskWork } from "./taskSubmissionApi";
import "./TaskSubmissionForm.css";

function TaskSubmissionForm({ task, onSuccess, onCancel }) {
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fileInputRef = useRef(null);
  const submittingRef = useRef(false);

  const taskId = Number(task?.id);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (submittingRef.current) return;

    setError("");
    setSuccess("");

    if (!Number.isSafeInteger(taskId) || taskId <= 0) {
      setError("Invalid task selected.");
      return;
    }

    if (!message.trim() && !url.trim() && !file) {
      setError("Please provide a message, URL, or file.");
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const response = await submitTaskWork({
        taskId,
        message,
        url,
        file,
      });

      console.log("Task Submission Response:", response);

      setSuccess("Work submitted successfully!");

      setMessage("");
      setUrl("");
      setFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (typeof onSuccess === "function") {
        await onSuccess(response);
      }
    } catch (err) {
      console.error("Task Submission Error:", err);

      setError(err.message || "Failed to submit work.");
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  return (
    <div className="task-submission-page">
      <div className="task-submission-heading">
        <h2>Submit Your Work</h2>
        <p>Upload your completed work for the assigned task.</p>
      </div>

      <div className="task-submission-card">
        <div className="task-submission-info">
          <span className="task-submission-label">Selected Task</span>

          <h3>{task?.title || "Untitled Task"}</h3>

          <p>Task ID: {taskId}</p>

          {task?.project_title && <p>Project: {task.project_title}</p>}
        </div>

        <form onSubmit={handleSubmit}>
          {/* Message */}
          <div className="task-submission-field">
            <label htmlFor="submission-message">Submission Message</label>

            <textarea
              id="submission-message"
              placeholder="Describe the work you completed..."
              value={message}
              rows={5}
              disabled={submitting}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>

          {/* URL */}
          <div className="task-submission-field">
            <label htmlFor="submission-url">Project / GitHub URL</label>

            <input
              id="submission-url"
              type="url"
              placeholder="https://github.com/..."
              value={url}
              disabled={submitting}
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>

          {/* File Upload */}
          <div className="task-submission-field">
            <label htmlFor="submission-file">Upload File</label>

            <input
              id="submission-file"
              ref={fileInputRef}
              type="file"
              disabled={submitting}
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />

            {file && (
              <p className="task-submission-file-name">Selected: {file.name}</p>
            )}

            <small>
              Upload a file containing your completed work. Supported file types
              and size depend on the backend.
            </small>
          </div>

          <p className="task-submission-note">
            Provide at least one: Message, URL, or File.
          </p>

          {/* Error */}
          {error && (
            <p className="task-submission-error" role="alert">
              {error}
            </p>
          )}

          {/* Success */}
          {success && (
            <p className="task-submission-success" role="status">
              {success}
            </p>
          )}

          {/* Buttons */}
          <div className="task-submission-actions">
            <button
              type="button"
              className="task-submission-cancel"
              disabled={submitting}
              onClick={onCancel}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="task-submission-submit"
              disabled={submitting}
            >
              {submitting ? "Submitting..." : "Submit Work"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TaskSubmissionForm;

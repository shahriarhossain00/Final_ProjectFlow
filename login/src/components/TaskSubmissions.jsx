import { useEffect, useState } from "react";

import {
  getTaskSubmissions,
  getSubmissionFileUrl,
} from "../services/taskSubmissionsApi";

import { getEmployees, getTasks } from "../services/taskApi";

function getId(value) {
  if (value && typeof value === "object") {
    return value.id;
  }

  return value;
}

function getEmployeeName(employee) {
  if (!employee) return null;

  const fullName = [employee.first_name, employee.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || employee.username || null;
}

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleString();
}

function TaskSubmissions() {
  const [submissions, setSubmissions] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      try {
        const [submissionData, taskData, employeeData] = await Promise.all([
          getTaskSubmissions(controller.signal),
          getTasks(controller.signal),
          getEmployees(controller.signal),
        ]);

        if (controller.signal.aborted) return;

        setSubmissions(submissionData);
        setTasks(taskData);
        setEmployees(employeeData);
        setError("");

        console.log("Task Submissions API Response:", submissionData);
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error("Task Submissions Error:", err);

        setError(err.message || "Failed to load task submissions.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => controller.abort();
  }, [refreshKey]);

  const handleRefresh = () => {
    setLoading(true);
    setError("");
    setRefreshKey((previous) => previous + 1);
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "12px 0 30px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
          flexWrap: "wrap",
          marginBottom: "24px",
        }}
      >
        <div>
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: "26px",
              color: "#142440",
            }}
          >
            Task Submissions
          </h2>

          <p
            style={{
              margin: 0,
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            Review work submitted by your employees.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          style={{
            padding: "10px 18px",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            cursor: loading ? "wait" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loading && <p role="status">Loading submissions...</p>}

      {error && (
        <p
          role="alert"
          style={{
            padding: "12px",
            background: "#fef2f2",
            borderRadius: "8px",
            color: "#b91c1c",
          }}
        >
          {error}
        </p>
      )}

      {!loading && !error && submissions.length === 0 && (
        <div
          style={{
            padding: "45px 20px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          <h3>No Submissions Yet</h3>
          <p style={{ color: "#64748b" }}>
            Employee submissions will appear here.
          </p>
        </div>
      )}

      {!loading && !error && submissions.length > 0 && (
        <div
          style={{
            display: "grid",
            gap: "16px",
          }}
        >
          {submissions.map((submission) => {
            const taskId = getId(submission.task);
            const employeeId = getId(submission.submitted_by);

            const task = tasks.find(
              (item) => String(item.id) === String(taskId),
            );

            const employee = employees.find(
              (item) => String(item.id) === String(employeeId),
            );

            const employeeName =
              getEmployeeName(employee) ||
              (submission.submitted_by &&
              typeof submission.submitted_by === "object"
                ? submission.submitted_by.username
                : null) ||
              (employeeId ? `Employee #${employeeId}` : "Unknown Employee");

            const taskTitle =
              task?.title ||
              (submission.task && typeof submission.task === "object"
                ? submission.task.title
                : null) ||
              `Task #${taskId ?? "Unknown"}`;

            const fileUrl = getSubmissionFileUrl(submission.file);

            const submittedAt =
              submission.submitted_at ??
              submission.created_at ??
              submission.created_on ??
              null;

            return (
              <article
                key={submission.id}
                style={{
                  padding: "22px",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderTop: "3px solid #2563eb",
                  borderRadius: "12px",
                  boxShadow: "0 4px 18px rgba(15,23,42,0.04)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <h3
                      style={{
                        margin: "0 0 8px",
                        color: "#1e3a8a",
                        fontSize: "18px",
                      }}
                    >
                      {taskTitle}
                    </h3>

                    <p
                      style={{
                        margin: 0,
                        color: "#475569",
                        fontSize: "13px",
                      }}
                    >
                      Submitted By: <strong>{employeeName}</strong>
                    </p>
                  </div>

                  <span
                    style={{
                      background: "#dbeafe",
                      color: "#1d4ed8",
                      borderRadius: "20px",
                      padding: "6px 12px",
                      fontSize: "12px",
                      fontWeight: 700,
                    }}
                  >
                    Submission #{submission.id}
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gap: "14px",
                    marginTop: "20px",
                    paddingTop: "18px",
                    borderTop: "1px solid #e2e8f0",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: "13px" }}>Message</strong>

                    <p
                      style={{
                        color: "#475569",
                        fontSize: "14px",
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {submission.message || "No message"}
                    </p>
                  </div>

                  <div>
                    <strong style={{ fontSize: "13px" }}>Project URL</strong>

                    <p style={{ margin: "7px 0" }}>
                      {submission.url &&
                      /^https?:\/\//i.test(submission.url) ? (
                        <a
                          href={submission.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#2563eb",
                            overflowWrap: "anywhere",
                          }}
                        >
                          Open Submitted URL
                        </a>
                      ) : (
                        <span
                          style={{
                            color: "#94a3b8",
                            fontSize: "13px",
                          }}
                        >
                          No URL
                        </span>
                      )}
                    </p>
                  </div>

                  <div>
                    <strong style={{ fontSize: "13px" }}>Uploaded File</strong>

                    <p style={{ margin: "7px 0" }}>
                      {fileUrl ? (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            color: "#2563eb",
                            fontWeight: 600,
                          }}
                        >
                          View Submitted File
                        </a>
                      ) : (
                        <span
                          style={{
                            color: "#94a3b8",
                            fontSize: "13px",
                          }}
                        >
                          No file uploaded
                        </span>
                      )}
                    </p>
                  </div>

                  <div>
                    <strong style={{ fontSize: "13px" }}>Submitted At</strong>

                    <p
                      style={{
                        margin: "7px 0",
                        color: "#64748b",
                        fontSize: "13px",
                      }}
                    >
                      {formatDate(submittedAt)}
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TaskSubmissions;

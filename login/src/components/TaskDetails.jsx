import { useEffect, useMemo, useState } from "react";
import "./TaskDetails.css";

import { getTasks, getEmployees } from "../services/taskApi";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

function getProjectId(task) {
  if (task.project && typeof task.project === "object") {
    return task.project.id;
  }

  return task.projectId ?? task.project;
}

function getAssignedEmployeeId(task) {
  if (task.assigned_to && typeof task.assigned_to === "object") {
    return task.assigned_to.id;
  }

  return task.assigned_to ?? task.assignedMemberId;
}

function getEmployeeName(employee) {
  if (!employee) return null;

  const fullName = [employee.first_name, employee.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return (
    fullName || employee.username || employee.name || `Employee #${employee.id}`
  );
}

function getStatusStyle(status) {
  const value = String(status || "").toLowerCase();

  if (value === "in progress" || value === "ongoing") {
    return {
      backgroundColor: "#fef3c7",
      color: "#92400e",
    };
  }

  if (value === "completed" || value === "done") {
    return {
      backgroundColor: "#dcfce7",
      color: "#166534",
    };
  }

  if (value === "not started" || value === "pending") {
    return {
      backgroundColor: "#fee2e2",
      color: "#b91c1c",
    };
  }

  return {
    backgroundColor: "#e2e8f0",
    color: "#475569",
  };
}

function getAttachmentUrl(file) {
  if (!file || typeof file !== "string") {
    return null;
  }

  try {
    const url = new URL(file, `${API_BASE_URL}/`);
    const backendOrigin = new URL(API_BASE_URL).origin;

    if (
      url.origin !== backendOrigin ||
      !["http:", "https:"].includes(url.protocol)
    ) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function TaskDetails({ projects = [] }) {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch latest tasks and employees from Django
  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      try {
        const [taskData, employeeData] = await Promise.all([
          getTasks(controller.signal),
          getEmployees(controller.signal),
        ]);

        if (controller.signal.aborted) return;

        setTasks(taskData);
        setEmployees(employeeData);
        setError("");
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error("Task Details Loading Error:", err);

        setError(err.message || "Failed to load task details.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => controller.abort();
  }, [refreshKey]);

  // Match employees by Django User ID
  const employeeMap = useMemo(() => {
    return new Map(
      employees.map((employee) => [String(employee.id), employee]),
    );
  }, [employees]);

  // Group tasks by project
  const tasksByProject = useMemo(() => {
    const grouped = new Map();

    for (const task of tasks) {
      const projectId = getProjectId(task);

      if (projectId == null) continue;

      const key = String(projectId);

      if (!grouped.has(key)) {
        grouped.set(key, []);
      }

      grouped.get(key).push(task);
    }

    return grouped;
  }, [tasks]);

  const handleRefresh = () => {
    setLoading(true);
    setError("");
    setRefreshKey((previous) => previous + 1);
  };

  return (
    <div className="task-details-page">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2>Task Details</h2>

          <p className="task-details-subtitle">
            View tasks, assigned employees and progress.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          style={{
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            borderRadius: "8px",
            padding: "10px 18px",
            cursor: loading ? "wait" : "pointer",
            fontWeight: 600,
          }}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>

      {loading && <p role="status">Loading task details...</p>}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className="task-details-container">
          {projects.length === 0 ? (
            <p>No projects available.</p>
          ) : (
            projects.map((project) => {
              const projectTasks = tasksByProject.get(String(project.id)) || [];

              return (
                <div className="task-details-card" key={project.id}>
                  {/* Project Header */}
                  <div className="details-card-header">
                    <div>
                      <h3>{project.projectName}</h3>

                      <p>{project.description || "No description added"}</p>
                    </div>

                    <span className="details-task-count">
                      {projectTasks.length} Tasks
                    </span>
                  </div>

                  {/* Project Tasks */}
                  <div className="task-details-list">
                    {projectTasks.length === 0 ? (
                      <p className="details-empty">No tasks added yet.</p>
                    ) : (
                      projectTasks.map((task, index) => {
                        const employeeId = getAssignedEmployeeId(task);

                        const employee =
                          employeeId == null
                            ? null
                            : employeeMap.get(String(employeeId));

                        const assignedName =
                          employeeId == null
                            ? "Unassigned"
                            : getEmployeeName(employee) ||
                              `Employee #${employeeId}`;

                        const attachmentUrl = getAttachmentUrl(task.task_file);

                        return (
                          <div
                            className="task-details-item"
                            key={task.id}
                            style={{
                              alignItems: "flex-start",
                            }}
                          >
                            <div
                              className="details-task-info"
                              style={{
                                flex: 1,
                                minWidth: 0,
                              }}
                            >
                              <strong>
                                {index + 1}. {task.title || "Untitled Task"}
                              </strong>

                              <p>
                                <strong>Task ID:</strong> {task.id}
                              </p>

                              <p>
                                <strong>Assigned To:</strong> {assignedName}
                              </p>

                              <p>
                                <strong>Description:</strong>{" "}
                                {task.description || "No description added"}
                              </p>

                              <p>
                                <strong>Start Date:</strong>{" "}
                                {task.start_date || "—"}
                              </p>

                              <p>
                                <strong>Finish Date:</strong>{" "}
                                {task.finish_date || "—"}
                              </p>

                              <p>
                                <strong>Attachment:</strong>{" "}
                                {attachmentUrl ? (
                                  <a
                                    href={attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      color: "#2563eb",
                                      fontWeight: 600,
                                      overflowWrap: "anywhere",
                                    }}
                                  >
                                    View / Download File
                                  </a>
                                ) : task.task_file ? (
                                  "Attachment link unavailable"
                                ) : (
                                  "No attachment"
                                )}
                              </p>
                            </div>

                            {/* Task Status */}
                            <span
                              className={`details-status ${
                                String(task.status || "")
                                  .toLowerCase()
                                  .replace(/\s+/g, "-") || "unselected"
                              }`}
                              style={{
                                ...getStatusStyle(task.status),
                                padding: "6px 12px",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: 700,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {task.status || "Not Started"}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default TaskDetails;

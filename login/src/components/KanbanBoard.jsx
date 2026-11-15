import { useEffect, useMemo, useState } from "react";
import "./KanbanBoard.css";

import { getTasks, getEmployees } from "../services/taskApi";

const columns = [
  {
    id: "todo",
    title: "To Do",
    statuses: ["Not Started", "Pending"],
  },
  {
    id: "progress",
    title: "In Progress",
    statuses: ["In Progress", "Ongoing"],
  },
  {
    id: "done",
    title: "Done",
    statuses: ["Completed", "Done"],
  },
  {
    id: "hold",
    title: "On Hold",
    statuses: ["On Hold"],
  },
];

function getProjectId(task) {
  if (task.project && typeof task.project === "object") {
    return task.project.id;
  }

  return task.projectId ?? task.project;
}

function getEmployeeId(task) {
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

function getStatusColors(status) {
  const value = (status || "").toLowerCase();

  if (value === "in progress" || value === "ongoing") {
    return {
      backgroundColor: "#fef3c7",
      color: "#92400e",
    };
  }

  if (value === "not started" || value === "pending") {
    return {
      backgroundColor: "#fee2e2",
      color: "#b91c1c",
    };
  }

  if (value === "completed" || value === "done") {
    return {
      backgroundColor: "#dcfce7",
      color: "#166534",
    };
  }

  return {
    backgroundColor: "#e2e8f0",
    color: "#475569",
  };
}

function KanbanBoard({ projects }) {
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [refreshKey, setRefreshKey] = useState(0);

  // Load real tasks and employees from Django
  useEffect(() => {
    const controller = new AbortController();

    async function loadKanbanData() {
      try {
        const [taskData, employeeData] = await Promise.all([
          getTasks(controller.signal),
          getEmployees(controller.signal),
        ]);

        if (controller.signal.aborted) return;

        setTasks(taskData);
        setEmployees(employeeData);
        setError("");

        console.log("Kanban Backend Tasks:", taskData);
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error("Kanban Loading Error:", err);

        setError(err.message || "Failed to load Kanban Board.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadKanbanData();

    return () => controller.abort();
  }, [refreshKey]);

  // Find selected project
  const selectedProject =
    projects.find(
      (project) => String(project.id) === String(selectedProjectId),
    ) || projects[0];

  // Filter tasks by selected project ID
  const projectTasks = useMemo(() => {
    if (!selectedProject) return [];

    return tasks.filter(
      (task) => String(getProjectId(task)) === String(selectedProject.id),
    );
  }, [tasks, selectedProject]);

  // Find employee assigned to a task
  const getAssignedEmployee = (task) => {
    const employeeId = getEmployeeId(task);

    if (employeeId == null || employeeId === "") {
      return null;
    }

    return (
      employees.find(
        (employee) => String(employee.id) === String(employeeId),
      ) || null
    );
  };

  // Filter tasks for each Kanban column
  const getTasksByStatus = (statuses) => {
    return projectTasks.filter((task) =>
      statuses.some(
        (status) =>
          status.toLowerCase() === String(task.status || "").toLowerCase(),
      ),
    );
  };

  return (
    <div className="kanban-page">
      <div className="kanban-heading">
        <h2>Kanban Board</h2>

        <p>Track project tasks and their progress.</p>
      </div>

      {/* Project Selection */}
      <div className="kanban-project-selector">
        <label htmlFor="kanban-project">Select Project</label>

        <select
          id="kanban-project"
          value={selectedProject?.id ?? ""}
          onChange={(event) => setSelectedProjectId(event.target.value)}
          disabled={projects.length === 0}
        >
          {projects.length === 0 ? (
            <option value="">No Projects Available</option>
          ) : (
            projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.projectName}
              </option>
            ))
          )}
        </select>
      </div>

      {/* Loading */}
      {loading && <p role="status">Loading tasks from backend...</p>}

      {/* Error */}
      {error && (
        <div role="alert">
          <p style={{ color: "#dc2626" }}>{error}</p>

          <button
            type="button"
            onClick={() => {
              setLoading(true);
              setError("");
              setRefreshKey((previous) => previous + 1);
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Empty Projects */}
      {!loading && !error && !selectedProject && (
        <div className="kanban-empty-project">
          <h3>No Projects Available</h3>

          <p>Create a project first to view its Kanban Board.</p>
        </div>
      )}

      {/* Kanban Board */}
      {!loading && !error && selectedProject && (
        <>
          <div className="kanban-project-info">
            <div>
              <h3>{selectedProject.projectName}</h3>

              <p>{selectedProject.description || "No description added"}</p>
            </div>

            <span className="kanban-total-tasks">
              {projectTasks.length} Total Tasks
            </span>
          </div>

          <div className="kanban-board">
            {columns.map((column) => {
              const columnTasks = getTasksByStatus(column.statuses);

              return (
                <div
                  className={`kanban-column kanban-${column.id}`}
                  key={column.id}
                >
                  <div className="kanban-column-header">
                    <h3>{column.title}</h3>

                    <span className="kanban-count">{columnTasks.length}</span>
                  </div>

                  <div className="kanban-column-tasks">
                    {columnTasks.length === 0 ? (
                      <p className="kanban-empty">No tasks here.</p>
                    ) : (
                      columnTasks.map((task) => {
                        const employee = getAssignedEmployee(task);

                        const employeeId = getEmployeeId(task);

                        const assignedName =
                          getEmployeeName(employee) ||
                          (employeeId
                            ? `Employee #${employeeId}`
                            : "Unassigned");

                        return (
                          <div className="kanban-task-card" key={task.id}>
                            <h4>{task.title}</h4>

                            <div className="kanban-task-member">
                              <span>Assigned To</span>

                              <strong>{assignedName}</strong>

                              {employeeId && (
                                <small>Employee ID: {employeeId}</small>
                              )}
                            </div>

                            <div className="kanban-task-footer">
                              <span
                                className={`kanban-status ${
                                  task.status
                                    ?.toLowerCase()
                                    .replace(/\s+/g, "-") || "unselected"
                                }`}
                                style={{
                                  ...getStatusColors(task.status),
                                  padding: "6px 12px",
                                  borderRadius: "20px",
                                  fontWeight: 700,
                                  fontSize: "12px",
                                }}
                              >
                                {task.status || "Unknown"}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default KanbanBoard;

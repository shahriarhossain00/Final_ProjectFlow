import { useEffect, useState } from "react";
import "./TaskList.css";

import TaskAssignmentForm from "../TaskAssignmentForm/TaskAssignmentForm";

import {
  getTasks,
  getEmployees,
  updateTask,
  deleteTask,
} from "../../services/taskApi";

const TASK_STATUSES = ["Not Started", "In Progress", "Completed", "On Hold"];

// Convert Django task fields to existing frontend format
function normalizeTask(task) {
  return {
    ...task,
    projectId:
      typeof task.project === "object"
        ? Number(task.project?.id)
        : Number(task.project),
    assignedMemberId:
      task.assigned_to == null
        ? ""
        : String(
            typeof task.assigned_to === "object"
              ? task.assigned_to.id
              : task.assigned_to,
          ),
  };
}

function getEmployeeName(employee) {
  if (!employee) return "Unassigned";

  const fullName = [employee.first_name, employee.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || employee.username || "Unknown";
}

function TaskList({ projects, setTasks }) {
  const [taskList, setTaskList] = useState([]);
  const [employees, setEmployees] = useState([]);

  const [loading, setLoading] = useState(true);
  const [busyTaskId, setBusyTaskId] = useState(null);

  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const [editingTask, setEditingTask] = useState(null);
  const [editedTaskName, setEditedTaskName] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load tasks and employees from Django
  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      try {
        const [tasksData, employeesData] = await Promise.all([
          getTasks(controller.signal),
          getEmployees(controller.signal),
        ]);

        if (controller.signal.aborted) return;

        const formattedTasks = tasksData.map(normalizeTask);

        setTaskList(formattedTasks);
        setTasks(formattedTasks);
        setEmployees(employeesData);

        console.log("Backend Tasks:", tasksData);
        console.log("Backend Employees:", employeesData);
      } catch (err) {
        if (controller.signal.aborted) return;

        setError(err.message || "Failed to load tasks.");
        console.error("Task List Error:", err);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => controller.abort();
  }, [setTasks]);

  // Refresh tasks after creating a task
  const refreshTasks = async () => {
    const data = await getTasks();
    const formattedTasks = data.map(normalizeTask);

    setTaskList(formattedTasks);
    setTasks(formattedTasks);

    return formattedTasks;
  };

  // Open task assignment form
  const handleOpenTaskForm = (projectId) => {
    setSelectedProjectId(projectId);
    setMessage("");
    setError("");
  };

  // Successful task creation
  const handleTaskCreated = async () => {
    try {
      await refreshTasks();

      setSelectedProjectId(null);
      setError("");

      setMessage("Task created and assigned successfully.");
    } catch (err) {
      setSelectedProjectId(null);
      setError(
        `Task was created, but refreshing the list failed: ${err.message}`,
      );
    }
  };

  // Update task locally after successful API response
  const replaceTask = (savedTask) => {
    const formattedTask = normalizeTask(savedTask);

    setTaskList((previous) =>
      previous.map((task) =>
        Number(task.id) === Number(formattedTask.id) ? formattedTask : task,
      ),
    );

    setTasks((previous) =>
      previous.map((task) =>
        Number(task.id) === Number(formattedTask.id) ? formattedTask : task,
      ),
    );
  };

  // Change task status using Django
  const handleStatusChange = async (task, status) => {
    if (busyTaskId !== null) return;

    setBusyTaskId(task.id);
    setError("");
    setMessage("");

    try {
      const savedTask = await updateTask(task.id, {
        status,
      });

      replaceTask(savedTask);

      setMessage("Task status updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update task status.");
    } finally {
      setBusyTaskId(null);
    }
  };

  // Assign or reassign task using Django
  const handleAssignmentChange = async (task, employeeId) => {
    if (busyTaskId !== null) return;

    if (!employeeId) {
      setError("Unassigning a task is not enabled in this form.");
      return;
    }

    const employeeExists = employees.some(
      (employee) => Number(employee.id) === Number(employeeId),
    );

    if (!employeeExists) {
      setError("Please select a valid employee.");
      return;
    }

    setBusyTaskId(task.id);
    setError("");
    setMessage("");

    try {
      const savedTask = await updateTask(task.id, {
        assigned_to: Number(employeeId),
      });

      replaceTask(savedTask);

      setMessage("Task assigned successfully.");
    } catch (err) {
      setError(err.message || "Failed to assign task.");
    } finally {
      setBusyTaskId(null);
    }
  };

  // Open Edit modal
  const handleEdit = (task) => {
    setEditingTask(task);
    setEditedTaskName(task.title);
    setMessage("");
    setError("");
  };

  // Save edited task title to Django
  const handleUpdateTask = async (event) => {
    event.preventDefault();

    if (!editingTask || busyTaskId !== null) return;

    const title = editedTaskName.trim();

    if (!title) {
      setError("Please enter a task name.");
      return;
    }

    setBusyTaskId(editingTask.id);
    setError("");
    setMessage("");

    try {
      const savedTask = await updateTask(editingTask.id, {
        title,
      });

      replaceTask(savedTask);

      setEditingTask(null);
      setEditedTaskName("");

      setMessage("Task updated successfully.");
    } catch (err) {
      setError(err.message || "Failed to update task.");
    } finally {
      setBusyTaskId(null);
    }
  };

  // Delete task from Django
  const handleDeleteTask = async (taskId) => {
    if (busyTaskId !== null) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete this task?",
    );

    if (!confirmed) return;

    setBusyTaskId(taskId);
    setError("");
    setMessage("");

    try {
      await deleteTask(taskId);

      setTaskList((previous) =>
        previous.filter((task) => Number(task.id) !== Number(taskId)),
      );

      setTasks((previous) =>
        previous.filter((task) => Number(task.id) !== Number(taskId)),
      );

      setMessage("Task deleted successfully.");
    } catch (err) {
      setError(err.message || "Failed to delete task.");
    } finally {
      setBusyTaskId(null);
    }
  };

  // Show task assignment form
  if (selectedProjectId !== null) {
    return (
      <TaskAssignmentForm
        projectId={selectedProjectId}
        onSuccess={handleTaskCreated}
        onCancel={() => setSelectedProjectId(null)}
      />
    );
  }

  return (
    <div className="task-list-page">
      <h2>Task Management</h2>

      <p className="task-list-subtitle">
        Add, assign and manage project tasks.
      </p>

      <p className="task-project-count">Total Projects: {projects.length}</p>

      {loading && <p role="status">Loading tasks and employees...</p>}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      {message && (
        <p className="form-success" role="status">
          {message}
        </p>
      )}

      {!loading && (
        <div className="task-projects">
          {projects.length === 0 ? (
            <p>No projects available. Create a project first.</p>
          ) : (
            projects.map((project) => {
              const projectTasks = taskList.filter(
                (task) => Number(task.projectId) === Number(project.id),
              );

              return (
                <div className="task-project-card" key={project.id}>
                  <div className="task-project-header">
                    <div>
                      <h3>{project.projectName}</h3>

                      <p>{project.description || "No description added"}</p>
                    </div>

                    <span className="task-count-badge">
                      {projectTasks.length} Tasks
                    </span>
                  </div>

                  {/* Add Task */}
                  <div className="task-input">
                    <button
                      type="button"
                      disabled={Boolean(error) && taskList.length === 0}
                      onClick={() => handleOpenTaskForm(project.id)}
                    >
                      + Add Task
                    </button>
                  </div>

                  {/* Task List */}
                  <div className="task-items-list">
                    {projectTasks.length === 0 ? (
                      <p className="task-empty">No tasks added yet.</p>
                    ) : (
                      projectTasks.map((task) => {
                        const assignedEmployee = employees.find(
                          (employee) =>
                            Number(employee.id) ===
                            Number(task.assignedMemberId),
                        );

                        const isBusy = busyTaskId !== null;

                        return (
                          <div key={task.id} className="task-item">
                            <div className="task-title-row">
                              <h4>{task.title}</h4>

                              <div className="task-action-buttons">
                                <button
                                  type="button"
                                  className="task-edit-btn"
                                  disabled={isBusy}
                                  onClick={() => handleEdit(task)}
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  className="task-delete-btn"
                                  disabled={isBusy}
                                  onClick={() => handleDeleteTask(task.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>

                            <div className="task-controls">
                              {/* Employee Assignment */}
                              <div className="task-control-group">
                                <label htmlFor={`assign-${task.id}`}>
                                  Assign To
                                </label>

                                <select
                                  id={`assign-${task.id}`}
                                  value={task.assignedMemberId}
                                  disabled={isBusy}
                                  onChange={(event) =>
                                    handleAssignmentChange(
                                      task,
                                      event.target.value,
                                    )
                                  }
                                >
                                  <option value="">Unassigned</option>

                                  {employees.map((employee) => (
                                    <option
                                      key={employee.id}
                                      value={employee.id}
                                    >
                                      {getEmployeeName(employee)}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Task Status */}
                              <div className="task-control-group">
                                <label htmlFor={`status-${task.id}`}>
                                  Status
                                </label>

                                <select
                                  id={`status-${task.id}`}
                                  value={task.status || "Not Started"}
                                  disabled={isBusy}
                                  onChange={(event) =>
                                    handleStatusChange(task, event.target.value)
                                  }
                                >
                                  {TASK_STATUSES.map((status) => (
                                    <option key={status} value={status}>
                                      {status}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            {/* Task Footer */}
                            <div className="task-footer">
                              <span>
                                Assigned: {getEmployeeName(assignedEmployee)}
                              </span>

                              <span
                                className={`task-status ${
                                  task.status
                                    ?.toLowerCase()
                                    .replace(/\s+/g, "-") || "unselected"
                                }`}
                              >
                                {task.status || "Not Started"}
                              </span>
                            </div>
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

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="task-modal-overlay">
          <form
            className="task-modal"
            onSubmit={handleUpdateTask}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-task-title"
          >
            <h3 id="edit-task-title">Edit Task</h3>

            <label htmlFor="edit-task-name">Task Name</label>

            <input
              id="edit-task-name"
              type="text"
              value={editedTaskName}
              maxLength={150}
              required
              disabled={busyTaskId !== null}
              onChange={(event) => setEditedTaskName(event.target.value)}
            />

            <div className="task-modal-actions">
              <button
                type="button"
                className="task-cancel-btn"
                disabled={busyTaskId !== null}
                onClick={() => {
                  setEditingTask(null);
                  setError("");
                }}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="task-save-btn"
                disabled={busyTaskId !== null}
              >
                {busyTaskId !== null ? "Saving..." : "Save Changes"}
              </button>
            </div>

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}

export default TaskList;

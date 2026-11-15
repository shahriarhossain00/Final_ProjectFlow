import { useEffect, useState } from "react";
import { getEmployeeTasks } from "./employeeTasksApi";
import TaskSubmissionForm from "./TaskSubmissionForm";
import "./EmployeeMyProjects.css";

function getAssignedUserId(task) {
  if (task.assigned_to && typeof task.assigned_to === "object") {
    return task.assigned_to.id;
  }

  return task.assigned_to;
}

function getProjectId(task) {
  if (task.project && typeof task.project === "object") {
    return task.project.id;
  }

  return task.project;
}

function getStatusStyle(status) {
  const value = (status || "").toLowerCase();

  if (value === "in progress" || value === "ongoing") {
    return {
      background: "#fef3c7",
      color: "#92400e",
    };
  }

  if (value === "not started" || value === "pending") {
    return {
      background: "#fee2e2",
      color: "#b91c1c",
    };
  }

  if (value === "completed" || value === "done") {
    return {
      background: "#dcfce7",
      color: "#166534",
    };
  }

  return {
    background: "#e2e8f0",
    color: "#475569",
  };
}

function EmployeeMyTasks({ user }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedTask, setSelectedTask] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadTasks() {
      if (!user?.id) {
        setError("Employee ID not found.");
        setLoading(false);
        return;
      }

      try {
        const data = await getEmployeeTasks(user.id, controller.signal);

        if (controller.signal.aborted) return;

        const myTasks = data.filter(
          (task) => Number(getAssignedUserId(task)) === Number(user.id),
        );

        setTasks(myTasks);
        setError("");

        console.log("Employee Assigned Tasks:", myTasks);
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error("Failed to load employee tasks:", err);

        setError(err.message || "Failed to load tasks.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadTasks();

    return () => controller.abort();
  }, [user?.id]);

  const handleOpenSubmission = (task) => {
    setSelectedTask(task);
    setSuccessMessage("");
    setError("");
  };

  const handleSubmissionSuccess = async () => {
    setSelectedTask(null);

    setSuccessMessage("Work submitted successfully!");

    // Refresh assigned tasks after submission
    try {
      const data = await getEmployeeTasks(user.id);

      const myTasks = data.filter(
        (task) => Number(getAssignedUserId(task)) === Number(user.id),
      );

      setTasks(myTasks);
    } catch (err) {
      console.error("Failed to refresh tasks:", err);

      setError("Work was submitted, but refreshing tasks failed.");
    }
  };

  if (selectedTask) {
    return (
      <TaskSubmissionForm
        task={selectedTask}
        onSuccess={handleSubmissionSuccess}
        onCancel={() => setSelectedTask(null)}
      />
    );
  }

  return (
    <div className="employee-my-projects">
      <div className="employee-my-projects-heading">
        <h2>My Tasks</h2>

        <p>Tasks assigned to {user?.username || "Employee"}</p>
      </div>

      {loading && <p role="status">Loading your assigned tasks...</p>}

      {error && (
        <p className="employee-projects-error" role="alert">
          {error}
        </p>
      )}

      {successMessage && (
        <p
          className="form-success"
          role="status"
          style={{
            padding: "12px 16px",
            marginBottom: "16px",
            borderRadius: "8px",
            backgroundColor: "#dcfce7",
            color: "#166534",
          }}
        >
          {successMessage}
        </p>
      )}

      {!loading && !error && tasks.length === 0 && (
        <div className="employee-projects-empty">No assigned tasks found.</div>
      )}

      {!loading && !error && tasks.length > 0 && (
        <div className="employee-projects-table-wrapper">
          <table className="employee-projects-table">
            <thead>
              <tr>
                <th>Task ID</th>
                <th>Task Title</th>
                <th>Project</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>Finish Date</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>{task.id}</td>

                  <td>
                    <strong>{task.title || "Untitled Task"}</strong>
                  </td>

                  <td>
                    {task.project_title ||
                      `Project #${getProjectId(task) ?? "—"}`}
                  </td>

                  <td>
                    <span
                      className="employee-task-status"
                      style={{
                        ...getStatusStyle(task.status),
                        padding: "6px 12px",
                        borderRadius: "20px",
                        fontSize: "12px",
                        fontWeight: 700,
                        display: "inline-block",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {task.status || "Unknown"}
                    </span>
                  </td>

                  <td>{task.start_date || "—"}</td>

                  <td>{task.finish_date || "—"}</td>

                  <td>
                    <button
                      type="button"
                      onClick={() => handleOpenSubmission(task)}
                      style={{
                        background: "#2563eb",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "7px",
                        padding: "9px 14px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      Submit Work
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default EmployeeMyTasks;

import { useEffect, useState } from "react";
import { getEmployeeTasks } from "./employeeTasksApi";
import "./EmployeeMyProjects.css";

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
).replace(/\/$/, "");

// Extract file URL from the task response
function getTaskFile(task) {
  const file = task.task_file;

  if (!file || typeof file !== "string") {
    return null;
  }

  try {
    const url = new URL(file, `${API_BASE_URL}/`);

    const isBackendUrl = url.origin === new URL(API_BASE_URL).origin;

    const isCloudinaryUrl =
      url.protocol === "https:" && url.hostname === "res.cloudinary.com";

    if (!isBackendUrl && !isCloudinaryUrl) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}

function EmployeeMyProjects({ user }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadTasks() {
      try {
        const data = await getEmployeeTasks(user?.id, controller.signal);

        if (!active) return;

        // Log metadata to verify the response fields
        console.log("Employee Tasks API Response:", data);
        console.table(
          data.map((task) => ({
            taskId: task.id,
            title: task.title,
            assignedTo: task.assigned_to,
            taskFile: task.task_file,
          })),
        );

        // Filter tasks assigned to the logged-in employee
        const employeeTasks = data.filter((task) => {
          const assignedUserId =
            typeof task.assigned_to === "object"
              ? task.assigned_to?.id
              : task.assigned_to;

          return Number(assignedUserId) === Number(user?.id);
        });

        setTasks(employeeTasks);
        setError("");
      } catch (err) {
        if (active && err.name !== "AbortError") {
          setError(err.message || "Failed to load tasks.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadTasks();

    return () => {
      active = false;
      controller.abort();
    };
  }, [user?.id]);

  return (
    <div className="employee-my-projects">
      <div className="employee-my-projects-heading">
        <h2>My Projects</h2>

        <p>
          Assigned project tasks for {user?.username || "Employee"} — User ID:{" "}
          {user?.id ?? "N/A"}
        </p>
      </div>

      {loading && <p role="status">Loading assigned tasks...</p>}

      {error && (
        <p className="employee-projects-error" role="alert">
          {error}
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
                <th>Project ID</th>
                <th>Project Title</th>
                <th>Task ID</th>
                <th>Task Title</th>
                <th>Status</th>
                <th>Start Date</th>
                <th>Finish Date</th>
                <th>Attachment</th>
              </tr>
            </thead>

            <tbody>
              {tasks.map((task) => {
                const fileUrl = getTaskFile(task);

                return (
                  <tr key={task.id}>
                    <td>
                      {typeof task.project === "object"
                        ? (task.project?.id ?? "—")
                        : (task.project ?? "—")}
                    </td>

                    {/* Project Title from Django Serializer */}
                    <td>{task.project_title || "—"}</td>

                    <td>{task.id}</td>

                    <td>{task.title || "Untitled"}</td>

                    <td>
                      <span className="employee-task-status">
                        {task.status || "Unknown"}
                      </span>
                    </td>

                    <td>{task.start_date || "—"}</td>

                    <td>{task.finish_date || "—"}</td>

                    <td>
                      {fileUrl ? (
                        <a
                          href={fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="employee-task-file-link"
                        >
                          View File
                        </a>
                      ) : (
                        <span className="employee-task-no-file">No File</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default EmployeeMyProjects;

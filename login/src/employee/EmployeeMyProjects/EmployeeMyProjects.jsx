import { useEffect, useState } from "react";
import { getEmployeeTasks } from "../api/employeeTasksApi";
import ProjectChatbox from "../../components/ProjectChatbox/ProjectChatbox";
import "./EmployeeMyProjects.css";

const API_BASE_URL = (
  import.meta.env.DEV
    ? import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
    : window.location.origin
).replace(/\/$/, "");

// Extract a safe file URL from the task response.
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

// Extract project ID from a task.
function getProjectId(task) {
  if (task.project && typeof task.project === "object") {
    return task.project.id ?? null;
  }

  return task.project ?? null;
}

function EmployeeMyProjects({ user }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Currently opened project chatbox.
  const [selectedProject, setSelectedProject] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;

    async function loadTasks() {
      try {
        const data = await getEmployeeTasks(user?.id, controller.signal);

        if (!active) return;

        console.log("Employee Tasks API Response:", data);

        console.table(
          data.map((task) => ({
            taskId: task.id,
            title: task.title,
            assignedTo: task.assigned_to,
            taskFile: task.task_file,
          })),
        );

        // Only show tasks assigned to the logged-in employee.
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

  // Open the selected project's chatbox.
  function handleOpenChat(task) {
    const projectId = getProjectId(task);

    if (projectId == null || projectId === "") {
      return;
    }

    setSelectedProject({
      id: projectId,
      name: task.project_title || `Project #${projectId}`,
    });
  }

  // Close the currently opened chatbox.
  function handleCloseChat() {
    setSelectedProject(null);
  }

  return (
    <div className="employee-my-projects">
      {/* Page Heading */}
      <div className="employee-my-projects-heading">
        <h2>My Projects</h2>

        <p>
          Assigned project tasks for {user?.username || "Employee"} — User ID:{" "}
          {user?.id ?? "N/A"}
        </p>
      </div>

      {/* Loading State */}
      {loading && <p role="status">Loading assigned tasks...</p>}

      {/* Error State */}
      {error && (
        <p className="employee-projects-error" role="alert">
          {error}
        </p>
      )}

      {/* Empty State */}
      {!loading && !error && tasks.length === 0 && (
        <div className="employee-projects-empty">No assigned tasks found.</div>
      )}

      {/* Employee Tasks Table */}
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
                <th>Chat</th>
              </tr>
            </thead>

            <tbody>
              {tasks.map((task) => {
                const fileUrl = getTaskFile(task);
                const projectId = getProjectId(task);

                const isSelected =
                  selectedProject != null &&
                  String(selectedProject.id) === String(projectId);

                return (
                  <tr key={task.id}>
                    {/* Project ID */}
                    <td>{projectId ?? "—"}</td>

                    {/* Project Title */}
                    <td>{task.project_title || "—"}</td>

                    {/* Task ID */}
                    <td>{task.id}</td>

                    {/* Task Title */}
                    <td>{task.title || "Untitled"}</td>

                    {/* Task Status */}
                    <td>
                      <span className="employee-task-status">
                        {task.status || "Unknown"}
                      </span>
                    </td>

                    {/* Start Date */}
                    <td>{task.start_date || "—"}</td>

                    {/* Finish Date */}
                    <td>{task.finish_date || "—"}</td>

                    {/* Attachment */}
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

                    {/* Project Chat Button */}
                    <td>
                      <button
                        type="button"
                        className={`employee-project-chat-button ${
                          isSelected ? "active" : ""
                        }`}
                        disabled={projectId == null || projectId === ""}
                        onClick={() => handleOpenChat(task)}
                      >
                        {isSelected ? "Chat Open" : "Open Chat"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Selected Project Chatbox */}
      {selectedProject && (
        <section className="employee-project-chat-section">
          <div className="employee-project-chat-heading">
            <div>
              <h3>{selectedProject.name} — Group Chat</h3>

              <p>Communicate with your project team.</p>
            </div>

            <button
              type="button"
              className="employee-project-close-chat"
              onClick={handleCloseChat}
            >
              Close Chat
            </button>
          </div>

          <ProjectChatbox
            key={selectedProject.id}
            projectId={selectedProject.id}
            projectName={selectedProject.name}
            currentUserId={user?.id}
          />
        </section>
      )}
    </div>
  );
}

export default EmployeeMyProjects;

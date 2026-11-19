import { useEffect, useState } from "react";
import "./ManagerDashboard.css";
import ManagerProjects from "../ManagerProjects/ManagerProjects";
import { getProjects } from "../api/managerApi";
import { getTasks } from "../api/managerApi";
// Manager's main workspace.
function ManagerDashboard({ user, onLogout, isLoggingOut }) {
  const [activeSection, setActiveSection] = useState("overview");

  // Store tasks fetched from the backend.
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [taskError, setTaskError] = useState("");

  // Store projects fetched from the backend.
  const [projects, setProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectError, setProjectError] = useState("");

  // Fetch projects when the dashboard loads.
  useEffect(() => {
    const loadProjects = async () => {
      try {
        setIsLoadingProjects(true);
        setProjectError("");

        const projectData = await getProjects();
        setProjects(projectData);
      } catch (error) {
        console.error("Failed to load manager projects:", error);
        setProjectError(error.message || "Failed to load projects.");
      } finally {
        setIsLoadingProjects(false);
      }
    };

    loadProjects();
  }, []);

  // Fetch tasks when the dashboard loads.
  useEffect(() => {
    const loadTasks = async () => {
      try {
        setIsLoadingTasks(true);
        setTaskError("");

        const taskData = await getTasks();
        console.log(
          "Task fields:",
          taskData.map((task) => Object.keys(task)),
        );

        console.table(
          taskData.map((task) => ({
            title: task.title,
            assigned_to: task.assigned_to,
            project_title: task.project_title,
            status: task.status,
          })),
        );
        setTasks(taskData);
      } catch (error) {
        console.error("Failed to load manager tasks:", error);
        setTaskError(error.message || "Failed to load tasks.");
      } finally {
        setIsLoadingTasks(false);
      }
    };

    loadTasks();
  }, []);
  // Navigation items available to the Manager.
  const navigationItems = [
    { id: "overview", label: "Overview" },
    { id: "projects", label: "My Projects" },
    { id: "tasks", label: "My Tasks" },
  ];

  return (
    <div className="manager-layout">
      {/* Sidebar navigation */}
      <aside className="manager-sidebar">
        <div className="manager-brand">
          <div className="manager-brand-icon">PF</div>
          <div>
            <h2>ProjectFlow</h2>
            <span>Manager Workspace</span>
          </div>
        </div>

        {/* Navigation menu */}
        <nav className="manager-navigation">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              type="button"
              className={
                activeSection === item.id
                  ? "manager-nav-item active"
                  : "manager-nav-item"
              }
              onClick={() => setActiveSection(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* User information and logout */}
        <div className="manager-sidebar-footer">
          <div className="manager-user-info">
            <div className="manager-avatar">
              {user?.username?.charAt(0).toUpperCase() || "M"}
            </div>

            <div className="manager-user-text">
              <strong>{user?.username || "Manager"}</strong>
              <span>Manager</span>
            </div>
          </div>

          <button
            type="button"
            className="manager-logout-button"
            onClick={onLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>

      {/* Main dashboard content */}
      <main className="manager-main">
        <header className="manager-header">
          <div>
            <p className="manager-eyebrow">Manager Workspace</p>
            <h1>
              {activeSection === "overview"
                ? "Dashboard"
                : activeSection === "projects"
                  ? "My Projects"
                  : "My Tasks"}
            </h1>
          </div>

          <div className="manager-header-user">Welcome, {user?.username}</div>
        </header>

        {/* Overview section */}
        {activeSection === "overview" && (
          <section className="manager-overview">
            <div className="manager-welcome-card">
              <span className="manager-welcome-label">PROJECT MANAGEMENT</span>

              <h2>Welcome to your workspace</h2>

              <p>
                Create projects, organize tasks, and manage your team from one
                place.
              </p>

              <button
                type="button"
                className="manager-primary-button"
                onClick={() => setActiveSection("projects")}
              >
                Create or view projects
              </button>
            </div>

            {/* Dashboard statistics */}
            <div className="manager-stat-grid">
              <div className="manager-stat-card">
                <span>My Projects</span>

                <strong>
                  {isLoadingProjects
                    ? "..."
                    : projectError
                      ? "—"
                      : projects.length}
                </strong>

                <small>Projects available in the API</small>
              </div>

              <div className="manager-stat-card">
                <span>My Tasks</span>
                <strong>
                  {isLoadingTasks ? "..." : taskError ? "—" : tasks.length}
                </strong>
                <small>Tasks across your projects</small>
              </div>

              <div className="manager-stat-card">
                <span>Team Members</span>
                <strong>
                  {isLoadingTasks
                    ? "..."
                    : taskError
                      ? "—"
                      : new Set(
                          tasks
                            .map((task) =>
                              typeof task.assigned_to === "object"
                                ? task.assigned_to?.id
                                : task.assigned_to,
                            )
                            .filter(Boolean),
                        ).size}
                </strong>
                <small>Unique members assigned to tasks</small>
              </div>
            </div>

            {/* Recent projects */}
            <div className="manager-content-card">
              <div className="manager-section-heading">
                <h2>My Projects</h2>

                <button
                  type="button"
                  onClick={() => setActiveSection("projects")}
                >
                  View all
                </button>
              </div>

              {isLoadingProjects ? (
                <p>Loading projects...</p>
              ) : projectError ? (
                <p className="manager-error-message">{projectError}</p>
              ) : projects.length === 0 ? (
                <p>No projects found. Create your first project.</p>
              ) : (
                <div className="manager-overview-project-list">
                  {projects.slice(0, 3).map((project) => (
                    <div
                      className="manager-overview-project-item"
                      key={project.id}
                    >
                      <div>
                        <h3>
                          {project.name || project.title || "Untitled Project"}
                        </h3>

                        <p>
                          {project.description || "No description available"}
                        </p>
                      </div>

                      <span className="manager-project-priority">
                        {project.priority || "No priority"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick actions */}
            <div className="manager-quick-actions">
              <h2>Quick Actions</h2>

              <button
                type="button"
                onClick={() => setActiveSection("projects")}
              >
                + Create Project
              </button>

              <button type="button" onClick={() => setActiveSection("tasks")}>
                + Create Task
              </button>
            </div>
          </section>
        )}

        {/* Manager project management page */}
        {activeSection === "projects" && <ManagerProjects user={user} />}

        {/* Manager task list */}
        {activeSection === "tasks" && (
          <section className="manager-content-card">
            <div className="manager-section-heading">
              <h2>My Tasks</h2>
              <span>{tasks.length} Tasks</span>
            </div>

            {isLoadingTasks ? (
              <p>Loading tasks...</p>
            ) : taskError ? (
              <p className="manager-error-message">{taskError}</p>
            ) : tasks.length === 0 ? (
              <p>No tasks found.</p>
            ) : (
              <div className="manager-overview-project-list">
                {tasks.map((task) => (
                  <div
                    className="manager-overview-project-item"
                    key={task.id || task.task_id}
                  >
                    <div>
                      <h3>{task.title || task.name || "Untitled Task"}</h3>

                      <p>{task.description || "No description available"}</p>

                      <p>Project: {task.project_title || "Unknown Project"}</p>

                      <p>
                        Assigned to:{" "}
                        {typeof task.assigned_to === "object"
                          ? task.assigned_to?.username ||
                            task.assigned_to?.name ||
                            "Unknown"
                          : task.assigned_to_name ||
                            task.assigned_to ||
                            "Unknown"}
                      </p>
                    </div>

                    <span className="manager-project-priority">
                      {task.status || "No status"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

export default ManagerDashboard;

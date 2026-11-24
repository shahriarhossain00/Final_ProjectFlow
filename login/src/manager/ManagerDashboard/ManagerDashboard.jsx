import { useEffect, useState } from "react";
import "./ManagerDashboard.css";

import ManagerProjects from "../ManagerProjects/ManagerProjects";
import { getMyManagedProjects, getUserTasks } from "../api/managerApi";
import SearchAndFilter from "../../components/SearchAndFilter/SearchAndFilter";
import NotificationBell from "../../features/notifications/NotificationBell";
import TaskAssignmentForm from "../../components/TaskAssignmentForm/TaskAssignmentForm";

function ManagerDashboard({ user, onLogout, isLoggingOut }) {
  const [activeSection, setActiveSection] = useState("overview");

  // Task state
  const [tasks, setTasks] = useState([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [taskError, setTaskError] = useState("");
  const [taskRefresh, setTaskRefresh] = useState(0);

  // Project state
  const [projects, setProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [projectError, setProjectError] = useState("");

  // Task creation state
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Fetch managed projects.
  useEffect(() => {
    const controller = new AbortController();

    const loadProjects = async () => {
      try {
        setIsLoadingProjects(true);
        setProjectError("");

        const projectData = await getMyManagedProjects(controller.signal);

        if (!controller.signal.aborted) {
          setProjects(projectData);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to load manager projects:", error);
          setProjects([]);
          setProjectError(error.message || "Failed to load projects.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingProjects(false);
        }
      }
    };

    loadProjects();

    return () => controller.abort();
  }, [user?.id, activeSection]);

  // Fetch tasks assigned to the current manager.
  useEffect(() => {
    const controller = new AbortController();

    const loadTasks = async () => {
      try {
        setIsLoadingTasks(true);
        setTaskError("");

        const managerId = Number(user?.id);

        if (!Number.isSafeInteger(managerId) || managerId <= 0) {
          throw new Error("Invalid manager ID.");
        }

        const taskData = await getUserTasks(managerId, controller.signal);

        if (!controller.signal.aborted) {
          setTasks(taskData);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setTasks([]);
          setTaskError(error.message || "Failed to load tasks.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingTasks(false);
        }
      }
    };

    loadTasks();

    return () => controller.abort();
  }, [user?.id, activeSection, taskRefresh]);

  // Navigation items
  const navigationItems = [
    { id: "overview", label: "Overview" },
    { id: "projects", label: "My Projects" },
    { id: "tasks", label: "My Tasks" },
    { id: "search-filter", label: "Search & Filter" },
  ];

  const activeTitle =
    navigationItems.find((item) => item.id === activeSection)?.label ||
    "Dashboard";

  const completedTasksCount = tasks.filter(
    (task) => String(task.status ?? "").toLowerCase() === "completed",
  ).length;

  // Open task creation form.
  const handleOpenCreateTask = () => {
    setSelectedProjectId("");
    setShowCreateTask(true);
    setActiveSection("tasks");
  };

  // Close task creation form.
  const handleCloseCreateTask = () => {
    setShowCreateTask(false);
    setSelectedProjectId("");
  };

  // Refresh tasks after successful creation.
  const handleTaskCreated = () => {
    handleCloseCreateTask();
    setTaskRefresh((previous) => previous + 1);
  };

  // Handle sidebar navigation.
  const handleNavigation = (section) => {
    if (section !== "tasks") {
      handleCloseCreateTask();
    }

    setActiveSection(section);
  };

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
              aria-current={activeSection === item.id ? "page" : undefined}
              onClick={() => handleNavigation(item.id)}
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

            <h1>{activeSection === "overview" ? "Dashboard" : activeTitle}</h1>
          </div>

          <div className="manager-header-actions">
            <NotificationBell />

            <div className="manager-header-user">
              Welcome, {user?.username || "Manager"}
            </div>
          </div>
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
                onClick={() => handleNavigation("projects")}
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

                <small>Projects managed by you</small>
              </div>

              <div className="manager-stat-card">
                <span>My Tasks</span>

                <strong>
                  {isLoadingTasks ? "..." : taskError ? "—" : tasks.length}
                </strong>

                <small>Tasks assigned to you</small>
              </div>

              <div className="manager-stat-card">
                <span>Completed Tasks</span>

                <strong>
                  {isLoadingTasks
                    ? "..."
                    : taskError
                      ? "—"
                      : completedTasksCount}
                </strong>

                <small>Your completed tasks</small>
              </div>
            </div>

            {/* Recent projects */}
            <div className="manager-content-card">
              <div className="manager-section-heading">
                <h2>My Projects</h2>

                <button
                  type="button"
                  onClick={() => handleNavigation("projects")}
                >
                  View all
                </button>
              </div>

              {isLoadingProjects ? (
                <p>Loading projects...</p>
              ) : projectError ? (
                <p className="manager-error-message">{projectError}</p>
              ) : projects.length === 0 ? (
                <p>No managed projects found.</p>
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
                onClick={() => handleNavigation("projects")}
              >
                + Create Project
              </button>

              <button type="button" onClick={handleOpenCreateTask}>
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

              <span>
                {isLoadingTasks
                  ? "Loading..."
                  : taskError
                    ? "Unavailable"
                    : `${tasks.length} Tasks`}
              </span>

              <button
                type="button"
                onClick={() => setTaskRefresh((previous) => previous + 1)}
                disabled={isLoadingTasks}
              >
                Refresh
              </button>

              <button
                type="button"
                onClick={
                  showCreateTask ? handleCloseCreateTask : handleOpenCreateTask
                }
              >
                {showCreateTask ? "Cancel" : "+ Create Task"}
              </button>
            </div>

            {/* Task creation form */}
            {showCreateTask && (
              <div className="manager-content-card">
                <h3>Create & Assign Task</h3>

                <div className="task-control-group">
                  <label htmlFor="manager-task-project">Select Project *</label>

                  <select
                    id="manager-task-project"
                    value={selectedProjectId}
                    onChange={(event) =>
                      setSelectedProjectId(event.target.value)
                    }
                    disabled={isLoadingProjects || Boolean(projectError)}
                  >
                    <option value="">Select a project</option>

                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name || project.title || "Untitled Project"}
                      </option>
                    ))}
                  </select>
                </div>

                {isLoadingProjects && <p>Loading projects...</p>}

                {projectError && (
                  <p className="manager-error-message">{projectError}</p>
                )}

                {!isLoadingProjects &&
                  !projectError &&
                  projects.length === 0 && (
                    <p>No managed projects available.</p>
                  )}

                {!isLoadingProjects &&
                  !projectError &&
                  selectedProjectId &&
                  projects.some(
                    (project) => String(project.id) === selectedProjectId,
                  ) && (
                    <TaskAssignmentForm
                      key={selectedProjectId}
                      projectId={Number(selectedProjectId)}
                      onSuccess={handleTaskCreated}
                      onCancel={handleCloseCreateTask}
                    />
                  )}
              </div>
            )}

            {/* Assigned task results */}
            {isLoadingTasks ? (
              <p>Loading tasks...</p>
            ) : taskError ? (
              <p className="manager-error-message">{taskError}</p>
            ) : tasks.length === 0 ? (
              <p>No tasks assigned to you yet.</p>
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

                      <p>
                        Project:{" "}
                        {task.project_title ||
                          task.project?.name ||
                          task.project?.title ||
                          "Unknown Project"}
                      </p>

                      <p>
                        Assigned to:{" "}
                        {typeof task.assigned_to === "object"
                          ? task.assigned_to?.username ||
                            task.assigned_to?.name ||
                            task.assigned_to_name ||
                            user?.username ||
                            "Unknown"
                          : task.assigned_to_name ||
                            user?.username ||
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

        {/* Manager Search & Filter */}
        {activeSection === "search-filter" && (
          <SearchAndFilter role="Manager" userId={user?.id} />
        )}
      </main>
    </div>
  );
}

export default ManagerDashboard;

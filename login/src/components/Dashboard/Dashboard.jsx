import SearchAndFilter from "../SearchAndFilter/SearchAndFilter";
import { useEffect, useState } from "react";
import "./Dashboard.css";

import KanbanBoard from "../KanbanBoard/KanbanBoard";
import CreateProject from "../CreateProject/CreateProject";
import TaskList from "../TaskList/TaskList";
import TaskDetails from "../TaskDetails/TaskDetails";
import AllMembers from "../AllMembers/AllMembers";
import ProjectMembers from "../ProjectMembers/ProjectMembers";
import TaskSubmissions from "../TaskSubmissions/TaskSubmissions";

import { getProjects, toUiProject } from "../../services/projectApi";
import { getTasks, getEmployees } from "../../services/taskApi";
import ProjectHealth from "../../features/project-health/ProjectHealth";
import { getProjectHealth } from "../../features/project-health/projectHealthApi";

const navigation = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "all-members", label: "All Members", icon: "♙" },
  { id: "create-project", label: "Create Project", icon: "▣" },
  { id: "project-members", label: "Project Members", icon: "♧" },
  { id: "tasks", label: "Tasks", icon: "☑" },
  { id: "search-filter", label: "Search & Filter", icon: "⌕" },
  { id: "kanban", label: "Kanban Board", icon: "▥" },
  { id: "task-details", label: "Task Details", icon: "☷" },
  {
    id: "task-submissions",
    label: "Task Submissions",
    icon: "▤",
  },
  { id: "settings", label: "Settings", icon: "⚙" },
];

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

  return fullName || employee.username || employee.name || null;
}

function getTaskAssigneeName(task, employees) {
  const assignedId = getAssignedEmployeeId(task);

  if (assignedId == null || assignedId === "") {
    return "Unassigned";
  }

  const employee = employees.find(
    (item) => String(item.id) === String(assignedId),
  );

  const assignedUser =
    typeof task.assigned_to === "object" ? task.assigned_to : null;

  return (
    task.assigned_to_name ||
    getEmployeeName(employee) ||
    getEmployeeName(assignedUser) ||
    `User #${assignedId}`
  );
}

function normalizeTask(task) {
  const projectId = getProjectId(task);
  const employeeId = getAssignedEmployeeId(task);

  return {
    ...task,
    projectId,
    assignedMemberId: employeeId == null ? "" : String(employeeId),
  };
}

function getStatusColors(status) {
  const value = String(status || "").toLowerCase();

  if (["in progress", "ongoing"].includes(value)) {
    return {
      background: "#fef3c7",
      color: "#92400e",
    };
  }

  if (["not started", "pending"].includes(value)) {
    return {
      background: "#fee2e2",
      color: "#b91c1c",
    };
  }

  if (["completed", "done"].includes(value)) {
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

function Dashboard({ onLogout }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");

  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  const [healthReports, setHealthReports] = useState({});
  const [healthLoading, setHealthLoading] = useState({});
  const [healthErrors, setHealthErrors] = useState({});
  const [selectedHealthProject, setSelectedHealthProject] = useState(null);

  // Load projects from the backend
  useEffect(() => {
    if (activePage !== "dashboard") return;

    const controller = new AbortController();

    async function loadProjects() {
      setProjectsLoading(true);
      setProjectsError("");

      try {
        const data = await getProjects(controller.signal);

        if (controller.signal.aborted) return;

        setProjects(data.map(toUiProject));
      } catch (error) {
        if (controller.signal.aborted) return;

        console.error("Project Fetch Error:", error);

        setProjectsError(error.message || "Failed to load projects.");
      } finally {
        if (!controller.signal.aborted) {
          setProjectsLoading(false);
        }
      }
    }

    loadProjects();

    return () => {
      controller.abort();
      setProjectsLoading(false);
    };
  }, [activePage]);

  // Load dashboard tasks and employees
  useEffect(() => {
    if (activePage !== "dashboard") return;

    const controller = new AbortController();

    async function loadDashboard() {
      setDashboardLoading(true);
      setDashboardError("");

      try {
        const [taskData, employeeData] = await Promise.all([
          getTasks(controller.signal),
          getEmployees(controller.signal),
        ]);

        if (controller.signal.aborted) return;

        setTasks(taskData.map(normalizeTask));
        setEmployees(employeeData);
      } catch (error) {
        if (controller.signal.aborted) return;

        console.error("Dashboard Fetch Error:", error);

        setDashboardError(error.message || "Failed to load dashboard.");
      } finally {
        if (!controller.signal.aborted) {
          setDashboardLoading(false);
        }
      }
    }

    loadDashboard();

    return () => controller.abort();
  }, [activePage]);

  // Close mobile sidebar using Escape
  useEffect(() => {
    if (!isSidebarOpen) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsSidebarOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isSidebarOpen]);

  // Navigate between dashboard pages
  const handleNavigate = (page) => {
    if (page === "dashboard" && activePage !== "dashboard") {
      setDashboardLoading(true);
      setProjectsLoading(true);
    }

    setActivePage(page);
    setIsSidebarOpen(false);
  };

  // Add a successfully created backend project
  const handleAddProject = (newProject) => {
    setProjects((previous) => {
      const exists = previous.some(
        (project) => String(project.id) === String(newProject.id),
      );

      if (exists) {
        return previous.map((project) =>
          String(project.id) === String(newProject.id)
            ? { ...project, ...newProject }
            : project,
        );
      }

      return [...previous, newProject];
    });
  };

  // Update an existing backend project
  const handleUpdateProject = (updatedProject) => {
    setProjects((previous) =>
      previous.map((project) =>
        String(project.id) === String(updatedProject.id)
          ? { ...project, ...updatedProject }
          : project,
      ),
    );
  };

  // Remove a project from local state after successful backend deletion
  const handleDeleteProject = (projectId) => {
    const id = String(projectId);

    setProjects((previous) =>
      previous.filter((project) => String(project.id) !== id),
    );

    setTasks((previous) =>
      previous.filter((task) => String(getProjectId(task)) !== id),
    );

    setHealthReports((previous) => {
      const next = { ...previous };

      delete next[id];

      return next;
    });

    setHealthLoading((previous) => {
      const next = { ...previous };

      delete next[id];

      return next;
    });

    setHealthErrors((previous) => {
      const next = { ...previous };

      delete next[id];

      return next;
    });

    setSelectedHealthProject((previous) =>
      previous && String(previous.id) === id ? null : previous,
    );

    return true;
  };

  // Get unique users assigned to tasks in a project
  const getProjectAssignees = (projectId) => {
    const assigneeMap = new Map();

    for (const task of tasks) {
      if (String(getProjectId(task)) !== String(projectId)) {
        continue;
      }

      const assignedId = getAssignedEmployeeId(task);

      if (assignedId == null || assignedId === "") {
        continue;
      }

      const id = String(assignedId);

      if (assigneeMap.has(id)) continue;

      assigneeMap.set(id, {
        id,
        name: getTaskAssigneeName(task, employees),
        role: "Task Assignee",
      });
    }

    return Array.from(assigneeMap.values());
  };

  // Analyze project health
  async function handleAnalyzeHealth(project) {
    if (project?.id == null) return;

    const projectId = String(project.id);

    if (healthLoading[projectId]) return;

    setHealthLoading((previous) => ({
      ...previous,
      [projectId]: true,
    }));

    setHealthErrors((previous) => ({
      ...previous,
      [projectId]: "",
    }));

    try {
      const report = await getProjectHealth(project.id);

      setHealthReports((previous) => ({
        ...previous,
        [projectId]: report,
      }));
    } catch (error) {
      setHealthErrors((previous) => ({
        ...previous,
        [projectId]: error.message || "Unable to analyze project health.",
      }));
    } finally {
      setHealthLoading((previous) => ({
        ...previous,
        [projectId]: false,
      }));
    }
  }

  // Open full project health analysis
  function handleViewHealth(project) {
    if (project?.id == null) return;

    setSelectedHealthProject({
      id: project.id,
      name: project.projectName || project.name || `Project #${project.id}`,
    });
  }

  const totalCompletedTasks = tasks.filter((task) =>
    ["completed", "done"].includes(String(task.status || "").toLowerCase()),
  ).length;

  const analyzedReports = projects
    .map((project) => healthReports[String(project.id)])
    .filter(Boolean);

  const healthyCount = analyzedReports.filter(
    (report) => String(report.health?.level || "").toLowerCase() === "healthy",
  ).length;

  const atRiskCount = analyzedReports.filter(
    (report) => String(report.health?.level || "").toLowerCase() === "at risk",
  ).length;

  const activeTitle =
    navigation.find((item) => item.id === activePage)?.label || "Dashboard";

  return (
    <div className="dashboard-container">
      {isSidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside
        id="admin-sidebar"
        className={`sidebar ${isSidebarOpen ? "sidebar-open" : ""}`}
      >
        <div className="sidebar-brand">
          <div className="brand-logo">PM</div>

          <div className="brand-text">
            <h2>ProjectFlow</h2>
            <span>Admin Workspace</span>
          </div>

          <button
            type="button"
            className="sidebar-close"
            aria-label="Close sidebar"
            onClick={() => setIsSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        <p className="sidebar-label">WORKSPACE</p>

        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sidebar-link ${
                activePage === item.id ? "nav-active" : ""
              }`}
              aria-current={activePage === item.id ? "page" : undefined}
              onClick={() => handleNavigate(item.id)}
            >
              <span className="sidebar-icon" aria-hidden="true">
                {item.icon}
              </span>

              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-profile">
            <div className="profile-avatar">A</div>

            <div>
              <strong>Admin</strong>
              <small>Administrator</small>
            </div>
          </div>

          <button type="button" className="logout-btn" onClick={onLogout}>
            <span aria-hidden="true">↪</span>
            Logout
          </button>
        </div>
      </aside>

      <main>
        <header className="navbar">
          <div className="navbar-left">
            <button
              type="button"
              className="hamburger-btn"
              aria-label="Open navigation"
              aria-controls="admin-sidebar"
              aria-expanded={isSidebarOpen}
              onClick={() => setIsSidebarOpen(true)}
            >
              <span />
              <span />
              <span />
            </button>

            <div>
              <h2>{activeTitle}</h2>
              <p>Project Management Workspace</p>
            </div>
          </div>

          <div className="navbar-right">
            <span className="navbar-avatar">A</span>
            <span>Admin</span>
          </div>
        </header>

        <section className="dashboard-content">
          {activePage === "search-filter" && <SearchAndFilter />}

          {activePage === "dashboard" && (
            <div className="dashboard-overview">
              <div className="dashboard-heading">
                <h1>Welcome to your Dashboard!</h1>
                <p>Overview of projects, members and tasks</p>
              </div>

              {(dashboardLoading || projectsLoading) && (
                <p role="status">Loading dashboard data...</p>
              )}

              {dashboardError && (
                <p className="form-error" role="alert">
                  {dashboardError}
                </p>
              )}

              {projectsError && (
                <p className="form-error" role="alert">
                  {projectsError}
                </p>
              )}

              {!dashboardLoading &&
                !dashboardError &&
                !projectsLoading &&
                !projectsError && (
                  <>
                    <div className="overview-stats">
                      <div className="stat-card">
                        <span>Total Projects</span>
                        <strong>{projects.length}</strong>
                      </div>

                      <div className="stat-card">
                        <span>Total Members</span>
                        <strong>{employees.length}</strong>
                      </div>

                      <div className="stat-card">
                        <span>Total Tasks</span>
                        <strong>{tasks.length}</strong>
                      </div>

                      <div className="stat-card">
                        <span>Completed Tasks</span>
                        <strong>{totalCompletedTasks}</strong>
                      </div>
                    </div>

                    <section className="admin-health-overview">
                      <div className="admin-health-heading">
                        <div>
                          <h2>Project Health Overview</h2>

                          <p>
                            AI-powered health analysis for individual projects
                          </p>
                        </div>
                      </div>

                      <div className="admin-health-stats">
                        <div className="admin-health-stat">
                          <span>Analyzed Projects</span>
                          <strong>{analyzedReports.length}</strong>
                        </div>

                        <div className="admin-health-stat">
                          <span>Healthy</span>
                          <strong>{healthyCount}</strong>
                        </div>

                        <div className="admin-health-stat">
                          <span>At Risk</span>
                          <strong>{atRiskCount}</strong>
                        </div>
                      </div>

                      <p className="admin-health-note">
                        Health results are generated on demand. Projects without
                        an analysis are not included in these counts.
                      </p>
                    </section>

                    <div className="summary-cards">
                      {projects.length === 0 ? (
                        <p>No projects available yet.</p>
                      ) : (
                        projects.map((project) => {
                          const projectTasks = tasks.filter(
                            (task) =>
                              String(getProjectId(task)) === String(project.id),
                          );

                          const projectAssignees = getProjectAssignees(
                            project.id,
                          );

                          const projectId = String(project.id);

                          const healthReport = healthReports[projectId];

                          const isHealthLoading = Boolean(
                            healthLoading[projectId],
                          );

                          const healthError = healthErrors[projectId];

                          const healthLevel = healthReport?.health?.level;

                          const healthScore = healthReport?.health?.score;

                          const healthClass =
                            String(healthLevel).toLowerCase() === "healthy"
                              ? "healthy"
                              : String(healthLevel).toLowerCase() === "at risk"
                                ? "at-risk"
                                : "unknown";

                          return (
                            <div className="summary-card" key={project.id}>
                              <h3>{project.projectName}</h3>

                              <p>
                                {project.description || "No description added"}
                              </p>

                              <div className="admin-project-health">
                                <div className="admin-project-health-top">
                                  <strong>Project Health</strong>

                                  {healthReport ? (
                                    <span
                                      className={`admin-health-badge ${healthClass}`}
                                    >
                                      {healthLevel}
                                    </span>
                                  ) : (
                                    <span className="admin-health-badge unknown">
                                      Not analyzed
                                    </span>
                                  )}
                                </div>

                                {healthReport && (
                                  <>
                                    <div className="admin-project-health-score">
                                      <span>Health Score</span>

                                      <strong>{healthScore}/100</strong>
                                    </div>

                                    <div className="admin-health-progress">
                                      <div
                                        className={`admin-health-progress-fill ${healthClass}`}
                                        style={{
                                          width: `${Math.min(
                                            100,
                                            Math.max(0, healthScore),
                                          )}%`,
                                        }}
                                      />
                                    </div>
                                  </>
                                )}

                                {healthError && (
                                  <p
                                    className="admin-health-error"
                                    role="alert"
                                  >
                                    {healthError}
                                  </p>
                                )}

                                <div className="admin-health-actions">
                                  <button
                                    type="button"
                                    className="admin-health-analyze-btn"
                                    onClick={() => handleAnalyzeHealth(project)}
                                    disabled={isHealthLoading}
                                  >
                                    {isHealthLoading
                                      ? "Analyzing..."
                                      : healthReport
                                        ? "Refresh Health"
                                        : "Analyze Health"}
                                  </button>

                                  {healthReport && (
                                    <button
                                      type="button"
                                      className="admin-health-view-btn"
                                      onClick={() => handleViewHealth(project)}
                                    >
                                      View Full Analysis
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div className="overview-section">
                                <h4>
                                  Assigned Members ({projectAssignees.length})
                                </h4>

                                {projectAssignees.length === 0 ? (
                                  <p>No members assigned.</p>
                                ) : (
                                  projectAssignees.map((member) => (
                                    <div
                                      className="overview-member"
                                      key={member.id}
                                    >
                                      <span>{member.name}</span>
                                      <span>{member.role}</span>
                                    </div>
                                  ))
                                )}
                              </div>

                              <div className="overview-section">
                                <h4>Tasks ({projectTasks.length})</h4>

                                {projectTasks.length === 0 ? (
                                  <p>No tasks added yet.</p>
                                ) : (
                                  projectTasks.map((task) => {
                                    const assignedName = getTaskAssigneeName(
                                      task,
                                      employees,
                                    );

                                    return (
                                      <div
                                        className="overview-task"
                                        key={task.id}
                                      >
                                        <div>
                                          <strong>{task.title}</strong>

                                          <small>
                                            Assigned to: {assignedName}
                                          </small>
                                        </div>

                                        <span
                                          className="details-status"
                                          style={{
                                            ...getStatusColors(task.status),
                                            padding: "6px 10px",
                                            borderRadius: "20px",
                                            fontWeight: 700,
                                            fontSize: "12px",
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

                    {selectedHealthProject && (
                      <div
                        className="admin-health-modal-overlay"
                        role="presentation"
                        onMouseDown={(event) => {
                          if (event.target === event.currentTarget) {
                            setSelectedHealthProject(null);
                          }
                        }}
                      >
                        <div
                          className="admin-health-modal"
                          role="dialog"
                          aria-modal="true"
                          aria-label={`${selectedHealthProject.name} Project Health Report`}
                        >
                          <ProjectHealth
                            key={selectedHealthProject.id}
                            projectId={selectedHealthProject.id}
                            projectName={selectedHealthProject.name}
                            initialReport={
                              healthReports[String(selectedHealthProject.id)]
                            }
                            onClose={() => setSelectedHealthProject(null)}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
            </div>
          )}

          {activePage === "all-members" && <AllMembers />}

          {activePage === "create-project" && (
            <>
              {projectsLoading && (
                <p role="status">Loading projects from backend...</p>
              )}

              {projectsError && (
                <p className="form-error" role="alert">
                  {projectsError}
                </p>
              )}

              <CreateProject
                projects={projects}
                onSaveProject={handleAddProject}
                onUpdateProject={handleUpdateProject}
                onDeleteProject={handleDeleteProject}
              />
            </>
          )}

          {activePage === "project-members" && (
            <ProjectMembers projects={projects} />
          )}

          {activePage === "tasks" && (
            <TaskList projects={projects} tasks={tasks} setTasks={setTasks} />
          )}

          {activePage === "kanban" && <KanbanBoard projects={projects} />}

          {activePage === "task-details" && (
            <TaskDetails projects={projects} tasks={tasks} />
          )}

          {activePage === "task-submissions" && <TaskSubmissions />}

          {activePage === "settings" && (
            <div className="empty-page">
              <h2>Settings</h2>
              <p>Settings will be available later.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;

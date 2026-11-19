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

function getSavedArray(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

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

  return (
    fullName || employee.username || employee.name || `Employee #${employee.id}`
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

  // Backend projects
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectsError, setProjectsError] = useState("");

  // Backend tasks and employees
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  // Existing local members and memberships
  const [members, setMembers] = useState(() => getSavedArray("allMembers"));

  const [memberships, setMemberships] = useState(() =>
    getSavedArray("projectMemberships"),
  );

  // Fetch projects from Django
  useEffect(() => {
    const controller = new AbortController();

    async function loadProjects() {
      try {
        const data = await getProjects(controller.signal);

        if (controller.signal.aborted) return;

        setProjects(data.map(toUiProject));
        setProjectsError("");
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

    return () => controller.abort();
  }, []);

  // Fetch tasks and employees when Dashboard opens
  useEffect(() => {
    if (activePage !== "dashboard") {
      return undefined;
    }

    const controller = new AbortController();

    async function loadDashboard() {
      try {
        const [taskData, employeeData] = await Promise.all([
          getTasks(controller.signal),
          getEmployees(controller.signal),
        ]);

        if (controller.signal.aborted) return;

        setTasks(taskData.map(normalizeTask));
        setEmployees(employeeData);
        setDashboardError("");
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

  // LocalStorage: Existing members
  useEffect(() => {
    localStorage.setItem("allMembers", JSON.stringify(members));
  }, [members]);

  // LocalStorage: Existing memberships
  useEffect(() => {
    localStorage.setItem("projectMemberships", JSON.stringify(memberships));
  }, [memberships]);

  // Keep local task-dependent screens compatible
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  // Close mobile sidebar with Escape
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

  // Navigation
  const handleNavigate = (page) => {
    if (page === "dashboard" && activePage !== "dashboard") {
      setDashboardLoading(true);
    }

    setActivePage(page);
    setIsSidebarOpen(false);
  };

  // Project CRUD callbacks
  const handleAddProject = (newProject) => {
    setProjects((previous) => [...previous, newProject]);
  };

  const handleUpdateProject = (updatedProject) => {
    setProjects((previous) =>
      previous.map((project) =>
        String(project.id) === String(updatedProject.id)
          ? { ...project, ...updatedProject }
          : project,
      ),
    );
  };

  const handleDeleteProject = (projectId, targetProjectId = "") => {
    const exists = projects.some(
      (project) => String(project.id) === String(projectId),
    );

    if (!exists) return false;

    if (
      targetProjectId &&
      (String(targetProjectId) === String(projectId) ||
        !projects.some(
          (project) => String(project.id) === String(targetProjectId),
        ))
    ) {
      return false;
    }

    setProjects((previous) =>
      previous.filter((project) => String(project.id) !== String(projectId)),
    );

    setTasks((previous) =>
      previous.filter(
        (task) => String(getProjectId(task)) !== String(projectId),
      ),
    );

    setMemberships((previous) => {
      const remaining = previous.filter(
        (item) => String(item.projectId) !== String(projectId),
      );

      if (!targetProjectId) {
        return remaining;
      }

      const transferring = previous
        .filter((item) => String(item.projectId) === String(projectId))
        .filter(
          (item) =>
            !remaining.some(
              (existing) => String(existing.memberId) === String(item.memberId),
            ),
        )
        .map((item) => ({
          ...item,
          projectId: targetProjectId,
        }));

      return [...remaining, ...transferring];
    });

    return true;
  };

  // Existing local member functionality
  const handleAddMember = (newMember) => {
    setMembers((previous) => [...previous, newMember]);
  };

  const handleAddMembership = (memberId, projectId) => {
    const memberExists = members.some(
      (member) => String(member.id) === String(memberId),
    );

    const projectExists = projects.some(
      (project) => String(project.id) === String(projectId),
    );

    const alreadyAssigned = memberships.some(
      (item) => String(item.memberId) === String(memberId),
    );

    if (!memberExists || !projectExists || alreadyAssigned) {
      return false;
    }

    setMemberships((previous) => [...previous, { memberId, projectId }]);

    return true;
  };

  const handleRemoveMembership = (
    memberId,
    projectId,
    replacementMemberId = "",
  ) => {
    const currentMembership = memberships.some(
      (item) =>
        String(item.memberId) === String(memberId) &&
        String(item.projectId) === String(projectId),
    );

    if (!currentMembership) return false;

    if (replacementMemberId) {
      const replacementExists = members.some(
        (member) => String(member.id) === String(replacementMemberId),
      );

      const replacementAssigned = members.some(
        (item) =>
          String(item.id) === String(replacementMemberId) &&
          memberships.some(
            (membership) => String(membership.memberId) === String(item.id),
          ),
      );

      if (
        !replacementExists ||
        replacementAssigned ||
        String(replacementMemberId) === String(memberId)
      ) {
        return false;
      }
    }

    setMemberships((previous) => {
      const remaining = previous.filter(
        (item) =>
          !(
            String(item.memberId) === String(memberId) &&
            String(item.projectId) === String(projectId)
          ),
      );

      if (!replacementMemberId) {
        return remaining;
      }

      return [
        ...remaining,
        {
          memberId: replacementMemberId,
          projectId,
        },
      ];
    });

    return true;
  };

  // Get task-assigned employees for a project
  const getProjectAssignees = (projectId) => {
    const projectTasks = tasks.filter(
      (task) => String(getProjectId(task)) === String(projectId),
    );

    const employeeIds = [
      ...new Set(
        projectTasks
          .map(getAssignedEmployeeId)
          .filter((id) => id !== null && id !== undefined && id !== "")
          .map(String),
      ),
    ];

    return employeeIds.map((employeeId) => {
      const employee = employees.find((item) => String(item.id) === employeeId);

      return {
        id: employeeId,
        name: getEmployeeName(employee) || `Employee #${employeeId}`,
        role: "Task Assignee",
      };
    });
  };

  // Completed task count
  const totalCompletedTasks = tasks.filter((task) =>
    ["completed", "done"].includes(String(task.status || "").toLowerCase()),
  ).length;

  const activeTitle =
    navigation.find((item) => item.id === activePage)?.label || "Dashboard";

  return (
    <div className="dashboard-container">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close navigation"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
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

      {/* Main Content */}
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
          {/* Search & Filter */}
          {activePage === "search-filter" && <SearchAndFilter />}

          {/* Dashboard Overview */}
          {activePage === "dashboard" && (
            <div className="dashboard-overview">
              <div className="dashboard-heading">
                <h1>Welcome to your Dashboard!</h1>
                <p>Overview of projects, members and tasks</p>
              </div>

              {dashboardLoading && (
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

              {!dashboardLoading && !dashboardError && (
                <>
                  {/* Statistics */}
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

                  {/* Project Summary Cards */}
                  <div className="summary-cards">
                    {projects.length === 0 ? (
                      <p>
                        {projectsLoading
                          ? "Loading projects..."
                          : "No projects available yet."}
                      </p>
                    ) : (
                      projects.map((project) => {
                        const projectTasks = tasks.filter(
                          (task) =>
                            String(getProjectId(task)) === String(project.id),
                        );

                        const projectAssignees = getProjectAssignees(
                          project.id,
                        );

                        return (
                          <div className="summary-card" key={project.id}>
                            <h3>{project.projectName}</h3>

                            <p>
                              {project.description || "No description added"}
                            </p>

                            {/* Assigned Employees */}
                            <div className="overview-section">
                              <h4>
                                Assigned Employees ({projectAssignees.length})
                              </h4>

                              {projectAssignees.length === 0 ? (
                                <p>No employees assigned.</p>
                              ) : (
                                projectAssignees.map((employee) => (
                                  <div
                                    className="overview-member"
                                    key={employee.id}
                                  >
                                    <span>{employee.name}</span>
                                    <span>{employee.role}</span>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Project Tasks */}
                            <div className="overview-section">
                              <h4>Tasks ({projectTasks.length})</h4>

                              {projectTasks.length === 0 ? (
                                <p>No tasks added yet.</p>
                              ) : (
                                projectTasks.map((task) => {
                                  const assignedId =
                                    getAssignedEmployeeId(task);

                                  const assignedEmployee = employees.find(
                                    (employee) =>
                                      String(employee.id) ===
                                      String(assignedId),
                                  );

                                  const assignedName =
                                    assignedId == null || assignedId === ""
                                      ? "Unassigned"
                                      : getEmployeeName(assignedEmployee) ||
                                        `Employee #${assignedId}`;

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
                </>
              )}
            </div>
          )}

          {/* All Members */}
          {activePage === "all-members" && (
            <AllMembers members={members} onAddMember={handleAddMember} />
          )}

          {/* Create Project */}
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
                memberships={memberships}
                tasks={tasks}
                onSaveProject={handleAddProject}
                onUpdateProject={handleUpdateProject}
                onDeleteProject={handleDeleteProject}
              />
            </>
          )}

          {/* Project Members */}
          {activePage === "project-members" && (
            <ProjectMembers
              projects={projects}
              members={members}
              memberships={memberships}
              tasks={tasks}
              onAddMembership={handleAddMembership}
              onRemoveMembership={handleRemoveMembership}
            />
          )}

          {/* Tasks */}
          {activePage === "tasks" && (
            <TaskList
              projects={projects}
              tasks={tasks}
              setTasks={setTasks}
              members={members}
              memberships={memberships}
            />
          )}

          {/* Kanban Board */}
          {activePage === "kanban" && (
            <KanbanBoard
              projects={projects}
              tasks={tasks}
              members={members}
              memberships={memberships}
            />
          )}

          {/* Task Details */}
          {activePage === "task-details" && (
            <TaskDetails
              projects={projects}
              tasks={tasks}
              members={members}
              memberships={memberships}
            />
          )}

          {/* Task Submissions */}
          {activePage === "task-submissions" && <TaskSubmissions />}

          {/* Settings */}
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

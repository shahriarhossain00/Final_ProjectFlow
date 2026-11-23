import { useEffect, useMemo, useState } from "react";

import EmployeeProfile from "../EmployeeProfile/EmployeeProfile";
import EmployeeMyProjects from "../EmployeeMyProjects/EmployeeMyProjects";
import EmployeeMyTasks from "../EmployeeMyTasks/EmployeeMyTasks";
import SearchAndFilter from "../../components/SearchAndFilter/SearchAndFilter";

import { getEmployeeProfile } from "../api/employeeProfileApi";
import { getEmployeeTasks } from "../api/employeeTasksApi";

import "./EmployeeDashboard.css";

import NotificationBell from "../../features/notifications/NotificationBell";

const API_BASE_URL = (
  import.meta.env.DEV
    ? import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"
    : window.location.origin
).replace(/\/$/, "");

function getProfilePictureUrl(picture) {
  if (!picture || typeof picture !== "string") {
    return null;
  }

  try {
    const imageUrl = new URL(picture, `${API_BASE_URL}/`);
    const apiOrigin = new URL(API_BASE_URL).origin;

    const isBackendImage = imageUrl.origin === apiOrigin;

    const isCloudinaryImage =
      imageUrl.protocol === "https:" &&
      imageUrl.hostname === "res.cloudinary.com";

    if (
      !["http:", "https:"].includes(imageUrl.protocol) ||
      (!isBackendImage && !isCloudinaryImage)
    ) {
      return null;
    }

    return imageUrl.href;
  } catch {
    return null;
  }
}

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

function getProjectName(task) {
  return (
    task.project_title ||
    (typeof task.project === "object" ? task.project?.name : null) ||
    `Project #${getProjectId(task)}`
  );
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

function EmployeeDashboard({
  user,
  onLogout,
  isLoggingOut,
  onPasswordChanged,
}) {
  const [activePage, setActivePage] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  const [profilePicture, setProfilePicture] = useState(null);
  const [pictureError, setPictureError] = useState(false);

  const [assignedTasks, setAssignedTasks] = useState([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState("");

  const navigation = [
    { id: "dashboard", label: "Dashboard" },
    { id: "projects", label: "My Projects" },
    { id: "tasks", label: "My Tasks" },
    { id: "search-filter", label: "Search & Filter" },
    { id: "profile", label: "My Profile" },
  ];

  const employeeName = user?.username || "Employee";
  const employeeId = user?.id ?? "N/A";
  const employeeInitial = employeeName.charAt(0).toUpperCase();

  // Load profile picture.
  useEffect(() => {
    let active = true;

    async function loadProfilePicture() {
      try {
        const accessToken = localStorage.getItem("accessToken");

        if (!accessToken) return;

        const data = await getEmployeeProfile(accessToken);

        if (!active) return;

        setProfilePicture(getProfilePictureUrl(data?.profile_picture));
      } catch (error) {
        if (active) {
          console.error("Profile picture error:", error);
        }
      }
    }

    loadProfilePicture();

    return () => {
      active = false;
    };
  }, [user?.id]);

  // Load assigned tasks whenever Dashboard is opened.
  useEffect(() => {
    if (activePage !== "dashboard") {
      return undefined;
    }

    const controller = new AbortController();

    async function loadDashboardData() {
      setDashboardLoading(true);
      setDashboardError("");

      try {
        const data = await getEmployeeTasks(user?.id, controller.signal);

        if (controller.signal.aborted) return;

        const myTasks = data.filter(
          (task) => Number(getAssignedUserId(task)) === Number(user?.id),
        );

        setAssignedTasks(myTasks);
      } catch (error) {
        if (controller.signal.aborted) return;

        console.error("Dashboard API Error:", error);

        setDashboardError(error.message || "Failed to load dashboard.");
      } finally {
        if (!controller.signal.aborted) {
          setDashboardLoading(false);
        }
      }
    }

    loadDashboardData();

    return () => controller.abort();
  }, [user?.id, activePage]);

  // Build unique projects from assigned tasks.
  const assignedProjects = useMemo(() => {
    const projectMap = new Map();

    assignedTasks.forEach((task) => {
      const projectId = getProjectId(task);

      if (projectId == null) return;

      const key = String(projectId);

      if (!projectMap.has(key)) {
        projectMap.set(key, {
          id: projectId,
          name: getProjectName(task),
          taskCount: 0,
        });
      }

      const project = projectMap.get(key);
      project.taskCount += 1;
    });

    return Array.from(projectMap.values());
  }, [assignedTasks]);

  const totalProjects = assignedProjects.length;
  const totalTasks = assignedTasks.length;

  const completedTasks = assignedTasks.filter(
    (task) => task.status === "Completed" || task.status === "Done",
  ).length;

  const handleNavigate = (page) => {
    if (page === "dashboard" && activePage !== "dashboard") {
      setDashboardLoading(true);
    }

    setActivePage(page);
    setMenuOpen(false);
  };

  const pageTitle =
    navigation.find((item) => item.id === activePage)?.label || "Dashboard";

  const renderAvatar = (className) => (
    <span className={className}>
      {profilePicture && !pictureError ? (
        <img
          src={profilePicture}
          alt={`${employeeName}'s profile`}
          className="employee-avatar-image"
          onError={() => setPictureError(true)}
        />
      ) : (
        employeeInitial
      )}
    </span>
  );

  const statusBadge = (status) => (
    <span
      style={{
        ...getStatusStyle(status),
        padding: "5px 10px",
        borderRadius: "20px",
        fontSize: "12px",
        fontWeight: 700,
        whiteSpace: "nowrap",
      }}
    >
      {status || "Unknown"}
    </span>
  );

  return (
    <div className="employee-layout">
      {/* Mobile Overlay */}
      {menuOpen && (
        <button
          type="button"
          className="employee-overlay"
          aria-label="Close menu"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        id="employee-sidebar"
        className={`employee-sidebar ${
          menuOpen ? "employee-sidebar-open" : ""
        }`}
      >
        <div className="employee-sidebar-brand">
          <div className="employee-logo">PF</div>

          <div>
            <h2>ProjectFlow</h2>
            <span>Employee Workspace</span>
          </div>

          <button
            type="button"
            className="employee-close-menu"
            onClick={() => setMenuOpen(false)}
            aria-label="Close sidebar"
          >
            ×
          </button>
        </div>

        <p className="employee-nav-label">MY WORKSPACE</p>

        <nav aria-label="Employee navigation">
          {navigation.map((item) => (
            <button
              key={item.id}
              type="button"
              className={activePage === item.id ? "employee-nav-active" : ""}
              aria-current={activePage === item.id ? "page" : undefined}
              onClick={() => handleNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="employee-sidebar-bottom">
          <div className="employee-sidebar-user">
            {renderAvatar("employee-avatar")}

            <div>
              <strong>{employeeName}</strong>
              <small>Employee ID: {employeeId}</small>
            </div>
          </div>

          <button
            type="button"
            className="employee-logout"
            onClick={onLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="employee-main">
        {/* Navbar */}
        <header className="employee-navbar">
          <div className="employee-navbar-left">
            <button
              type="button"
              className="employee-hamburger"
              aria-label="Open navigation"
              aria-controls="employee-sidebar"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
            >
              ☰
            </button>

            <div>
              <h2>{pageTitle}</h2>
              <p>Employee Workspace</p>
            </div>
          </div>

          <div className="employee-navbar-actions">
            <NotificationBell />

            <div className="employee-navbar-user">
              {renderAvatar("employee-top-avatar")}

              <div className="employee-header-profile">
                <strong className="employee-header-username">
                  {employeeName}
                </strong>

                <span className="employee-header-id">
                  Employee #{employeeId}
                </span>
              </div>
            </div>
          </div>
        </header>

        <section className="employee-content">
          {/* Dashboard Overview */}
          {activePage === "dashboard" && (
            <>
              <div className="employee-welcome">
                <h1>Welcome, {employeeName}!</h1>

                <p>View your assigned projects and tasks in one place.</p>
              </div>

              {dashboardLoading && (
                <p role="status">Loading your dashboard...</p>
              )}

              {dashboardError && (
                <p role="alert" style={{ color: "#dc2626" }}>
                  {dashboardError}
                </p>
              )}

              {!dashboardLoading && !dashboardError && (
                <>
                  {/* Statistics */}
                  <div className="employee-stats">
                    <div className="employee-stat-card">
                      <span>My Projects</span>
                      <strong>{totalProjects}</strong>
                    </div>

                    <div className="employee-stat-card">
                      <span>My Tasks</span>
                      <strong>{totalTasks}</strong>
                    </div>
                  </div>

                  {/* Project and Task Sections */}
                  <div className="employee-sections">
                    {/* Assigned Projects */}
                    <div className="employee-panel">
                      <h3>My Assigned Projects</h3>

                      {assignedProjects.length === 0 ? (
                        <div className="employee-empty">
                          <div className="employee-empty-icon">▣</div>

                          <h4>No Assigned Projects</h4>

                          <p>Your assigned projects will appear here.</p>
                        </div>
                      ) : (
                        <div>
                          {assignedProjects.map((project) => (
                            <div
                              key={project.id}
                              style={{
                                padding: "14px",
                                marginBottom: "12px",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: "10px",
                              }}
                            >
                              <strong>{project.name}</strong>

                              <p
                                style={{
                                  marginTop: "6px",
                                  color: "#64748b",
                                  fontSize: "13px",
                                }}
                              >
                                {project.taskCount} Assigned Tasks
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Assigned Tasks */}
                    <div className="employee-panel">
                      <h3>My Assigned Tasks</h3>

                      {totalTasks === 0 ? (
                        <div className="employee-empty">
                          <div className="employee-empty-icon">☷</div>

                          <h4>No Assigned Tasks</h4>

                          <p>Your assigned tasks will appear here.</p>
                        </div>
                      ) : (
                        <div>
                          {assignedTasks.slice(0, 5).map((task) => (
                            <div
                              key={task.id}
                              style={{
                                padding: "14px",
                                marginBottom: "12px",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: "10px",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  flexWrap: "wrap",
                                  gap: "8px",
                                }}
                              >
                                <strong>{task.title || "Untitled Task"}</strong>

                                {statusBadge(task.status)}
                              </div>

                              <p
                                style={{
                                  marginTop: "8px",
                                  color: "#64748b",
                                  fontSize: "12px",
                                }}
                              >
                                {getProjectName(task)}
                              </p>
                            </div>
                          ))}

                          {totalTasks > 5 && (
                            <button
                              type="button"
                              onClick={() => handleNavigate("tasks")}
                              style={{
                                border: "none",
                                background: "transparent",
                                color: "#2563eb",
                                cursor: "pointer",
                                fontWeight: 600,
                              }}
                            >
                              View all tasks
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <p
                    style={{
                      marginTop: "18px",
                      color: "#64748b",
                      fontSize: "12px",
                    }}
                  >
                    Completed Tasks: {completedTasks}
                  </p>
                </>
              )}
            </>
          )}

          {/* My Projects */}
          {activePage === "projects" && <EmployeeMyProjects user={user} />}

          {/* My Tasks */}
          {activePage === "tasks" && <EmployeeMyTasks user={user} />}

          {/* Search & Filter */}
          {activePage === "search-filter" && (
            <SearchAndFilter role="Employee" userId={user?.id} />
          )}

          {/* My Profile */}
          {activePage === "profile" && (
            <EmployeeProfile
              user={user}
              onPasswordChanged={onPasswordChanged}
              onProfilePictureUpdated={(picture) => {
                setProfilePicture(getProfilePictureUrl(picture));
                setPictureError(false);
              }}
            />
          )}
        </section>
      </main>
    </div>
  );
}

export default EmployeeDashboard;

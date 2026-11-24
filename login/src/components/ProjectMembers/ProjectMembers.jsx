import { useEffect, useMemo, useState } from "react";
import "./ProjectMembers.css";
import { getEmployees, getTasks } from "../../services/taskApi";

const INITIAL_FILTERS = {
  memberId: "",
  projectId: "",
};

function getTaskProjectId(task) {
  return typeof task.project === "object" ? task.project?.id : task.project;
}

function getAssignedUserId(task) {
  return typeof task.assigned_to === "object"
    ? task.assigned_to?.id
    : task.assigned_to;
}

function getProjectName(project) {
  return project.projectName || project.name || `Project #${project.id}`;
}

function SearchIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 7v5h-5" />
      <path d="M4 17v-5h5" />
      <path d="M6 8a7 7 0 0 1 12-2l2 6" />
      <path d="M4 12l2 6a7 7 0 0 0 12-2" />
    </svg>
  );
}

function ProjectMembers({ projects = [] }) {
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(INITIAL_FILTERS);

  const [backendTasks, setBackendTasks] = useState([]);
  const [members, setMembers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  // Load real members and task assignments
  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError("");

      try {
        const [taskData, memberData] = await Promise.all([
          getTasks(controller.signal),
          getEmployees(controller.signal),
        ]);

        if (controller.signal.aborted) return;

        setBackendTasks(taskData);
        setMembers(memberData);
      } catch (err) {
        if (controller.signal.aborted) return;

        setBackendTasks([]);
        setMembers([]);

        setError(err.message || "Failed to load project members.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => controller.abort();
  }, [refreshKey]);

  // Build a unified list using backend user IDs
  const allMembers = useMemo(() => {
    const memberMap = new Map();

    for (const member of members) {
      if (member.id == null) continue;

      const id = String(member.id);

      memberMap.set(id, {
        id,
        username: member.username || "",
        role: member.role || member.profile?.role || "",
      });
    }

    // Include task assignees missing from the employee list
    for (const task of backendTasks) {
      const assignedId = getAssignedUserId(task);

      if (assignedId == null) continue;

      const id = String(assignedId);

      const assignedUser =
        typeof task.assigned_to === "object" ? task.assigned_to : null;

      const existing = memberMap.get(id);

      memberMap.set(id, {
        id,
        username:
          existing?.username ||
          task.assigned_to_name ||
          assignedUser?.username ||
          "",
        role:
          existing?.role ||
          assignedUser?.role ||
          assignedUser?.profile?.role ||
          "",
      });
    }

    return Array.from(memberMap.values())
      .map((member) => ({
        ...member,
        username: member.username || `User #${member.id}`,
      }))
      .sort((a, b) => a.username.localeCompare(b.username));
  }, [members, backendTasks]);

  const membersById = useMemo(() => {
    return new Map(allMembers.map((member) => [member.id, member]));
  }, [allMembers]);

  // Group actual task assignees by project
  const assignedMembersByProject = useMemo(() => {
    const projectMap = new Map();

    for (const task of backendTasks) {
      const projectId = getTaskProjectId(task);
      const assignedId = getAssignedUserId(task);

      if (projectId == null || assignedId == null) {
        continue;
      }

      const projectKey = String(projectId);
      const memberKey = String(assignedId);

      if (!projectMap.has(projectKey)) {
        projectMap.set(projectKey, new Map());
      }

      const projectMembers = projectMap.get(projectKey);

      if (!projectMembers.has(memberKey)) {
        const member = membersById.get(memberKey);

        projectMembers.set(memberKey, {
          id: memberKey,
          username:
            member?.username || task.assigned_to_name || `User #${memberKey}`,
          role: member?.role || "",
          taskCount: 0,
          completedTasks: 0,
        });
      }

      const assignedMember = projectMembers.get(memberKey);

      assignedMember.taskCount += 1;

      if (String(task.status || "").toLowerCase() === "completed") {
        assignedMember.completedTasks += 1;
      }
    }

    return projectMap;
  }, [backendTasks, membersById]);

  // Apply filters only after clicking Search
  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const projectId = String(project.id);

      if (appliedFilters.projectId && projectId !== appliedFilters.projectId) {
        return false;
      }

      if (appliedFilters.memberId) {
        return Boolean(
          assignedMembersByProject.get(projectId)?.has(appliedFilters.memberId),
        );
      }

      return true;
    });
  }, [projects, appliedFilters, assignedMembersByProject]);

  const handleSearch = (event) => {
    event.preventDefault();

    setAppliedFilters({ ...filters });
  };

  const handleResetFilters = () => {
    setFilters({ ...INITIAL_FILTERS });
    setAppliedFilters({ ...INITIAL_FILTERS });
  };

  const handleRefresh = () => {
    setRefreshKey((previous) => previous + 1);
  };

  const hasFilters = Boolean(
    filters.memberId ||
    filters.projectId ||
    appliedFilters.memberId ||
    appliedFilters.projectId,
  );

  return (
    <div className="project-members-page">
      <h2>Project Members</h2>

      <p className="page-subtitle">
        View real project task assignees from the backend.
      </p>

      {/* Project member search */}
      <form className="project-member-form" onSubmit={handleSearch}>
        <div className="pm-filter-header">
          <h3>Filter Project Members</h3>

          <button
            type="button"
            className={`pm-refresh-btn ${loading ? "pm-refreshing" : ""}`}
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh member and task data"
            aria-label="Refresh member and task data"
          >
            <RefreshIcon />
          </button>
        </div>

        <p className="form-hint">
          Search members and their assigned projects. To assign a new task, use
          Tasks → Add Task.
        </p>

        <label htmlFor="select-member">Select Member</label>

        <select
          id="select-member"
          value={filters.memberId}
          disabled={loading || Boolean(error)}
          onChange={(event) =>
            setFilters((previous) => ({
              ...previous,
              memberId: event.target.value,
            }))
          }
        >
          <option value="">All Members</option>

          {allMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.username}
              {member.role ? ` - ${member.role}` : ""}
            </option>
          ))}
        </select>

        <label htmlFor="select-project">Select Project</label>

        <select
          id="select-project"
          value={filters.projectId}
          disabled={loading || Boolean(error)}
          onChange={(event) =>
            setFilters((previous) => ({
              ...previous,
              projectId: event.target.value,
            }))
          }
        >
          <option value="">All Projects</option>

          {projects.map((project) => (
            <option key={project.id} value={String(project.id)}>
              {getProjectName(project)}
            </option>
          ))}
        </select>

        <div className="pm-filter-actions">
          <button
            type="submit"
            className="pm-search-btn"
            disabled={loading || Boolean(error)}
          >
            <SearchIcon />
            Search
          </button>

          <button
            type="button"
            className="pm-reset-btn"
            onClick={handleResetFilters}
            disabled={loading || !hasFilters}
          >
            <ResetIcon />
            Reset
          </button>
        </div>
      </form>

      {/* Loading state */}
      {loading && (
        <div className="pm-loading-state" role="status">
          <span className="pm-spinner" />
          Loading project members...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="pm-error-state" role="alert">
          <p>{error}</p>

          <button
            type="button"
            className="pm-retry-btn"
            onClick={handleRefresh}
          >
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && (
        <>
          <p className="pm-result-count" role="status">
            Showing <strong>{filteredProjects.length}</strong> of{" "}
            <strong>{projects.length}</strong> projects
          </p>

          {filteredProjects.length === 0 && (
            <div className="pm-empty-state">
              <p>No matching projects found.</p>

              <small>Try changing the selected member or project.</small>
            </div>
          )}

          {/* Project cards */}
          <div className="project-members-list">
            {filteredProjects.map((project) => {
              const projectId = String(project.id);

              const assignedMembers = Array.from(
                assignedMembersByProject.get(projectId)?.values() ?? [],
              );

              const visibleMembers = appliedFilters.memberId
                ? assignedMembers.filter(
                    (member) => member.id === appliedFilters.memberId,
                  )
                : assignedMembers;

              return (
                <div className="project-members-card" key={project.id}>
                  <div className="pm-card-header">
                    <h3>{getProjectName(project)}</h3>

                    <span>
                      {visibleMembers.length}{" "}
                      {visibleMembers.length === 1 ? "Assignee" : "Assignees"}
                    </span>
                  </div>

                  <h4 className="pm-section-title">Assigned Members</h4>

                  {visibleMembers.length === 0 ? (
                    <div className="pm-empty-state">
                      <p>No task assignees found.</p>

                      <small>Assign a task from the Tasks section.</small>
                    </div>
                  ) : (
                    visibleMembers.map((member) => (
                      <div className="pm-member-row" key={member.id}>
                        <div className="pm-member-avatar">
                          {member.username.charAt(0).toUpperCase()}
                        </div>

                        <div className="pm-member-info">
                          <strong>{member.username}</strong>

                          {member.role && <small>{member.role}</small>}

                          <small>User ID: {member.id}</small>

                          <div className="pm-member-stats">
                            <span className="pm-task-count">
                              {member.taskCount} Assigned{" "}
                              {member.taskCount === 1 ? "Task" : "Tasks"}
                            </span>

                            <span className="pm-completed-count">
                              {member.completedTasks} Completed
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default ProjectMembers;

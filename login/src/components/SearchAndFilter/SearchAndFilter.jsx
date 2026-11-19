import { useEffect, useMemo, useState } from "react";

import { getProjects } from "../../services/projectApi";
import { getTasks } from "../../services/taskApi";
import { getMyManagedProjects } from "../../manager/api/managerApi";
import { getEmployeeTasks } from "../../employee/api/employeeTasksApi";

import "./SearchAndFilter.css";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  "All Statuses",
  "Not Started",
  "In Progress",
  "Completed",
  "On Hold",
];

function getProjectName(project) {
  return String(project.name ?? project.projectName ?? project.title ?? "");
}

function getTaskTitle(task) {
  return String(task.title ?? task.name ?? "");
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

function getTaskProjectName(task) {
  return (
    task.project_title ||
    (typeof task.project === "object" ? task.project?.name : null) ||
    `Project #${getProjectId(task)}`
  );
}

function buildEmployeeProjects(tasks) {
  const projectMap = new Map();

  tasks.forEach((task) => {
    const projectId = getProjectId(task);

    if (projectId == null) {
      return;
    }

    const key = String(projectId);

    if (!projectMap.has(key)) {
      projectMap.set(key, {
        id: projectId,
        name: getTaskProjectName(task),
        // The employee task API does not supply project status.
        status: null,
      });
    }
  });

  return Array.from(projectMap.values());
}

function matchesFilters(item, type, filters) {
  const name = type === "project" ? getProjectName(item) : getTaskTitle(item);

  const matchesSearch = name
    .toLocaleLowerCase()
    .includes(filters.search.toLocaleLowerCase());

  const matchesStatus =
    filters.status === "All Statuses" ||
    String(item.status ?? "").toLowerCase() === filters.status.toLowerCase();

  return matchesSearch && matchesStatus;
}

export default function SearchAndFilter({ role = "Admin", userId }) {
  const isAdmin = role === "Admin";
  const isManager = role === "Manager";
  const isEmployee = role === "Employee";

  const [search, setSearch] = useState("");
  const [searchIn, setSearchIn] = useState("all");
  const [status, setStatus] = useState("All Statuses");

  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [appliedFilters, setAppliedFilters] = useState(null);

  // Client-side pagination for the filtered search results.
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const controller = new AbortController();

    async function loadData() {
      setLoading(true);
      setError("");
      setProjects([]);
      setTasks([]);
      setAppliedFilters(null);
      setCurrentPage(1);

      try {
        if (isAdmin) {
          const [projectData, taskData] = await Promise.all([
            getProjects(controller.signal),
            getTasks(controller.signal),
          ]);

          if (controller.signal.aborted) return;

          setProjects(projectData);
          setTasks(taskData);
        } else if (isManager) {
          const projectData = await getMyManagedProjects(controller.signal);

          if (controller.signal.aborted) return;

          setProjects(projectData);
        } else if (isEmployee) {
          const employeeId = Number(userId);

          if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
            throw new Error("Invalid employee ID.");
          }

          const taskData = await getEmployeeTasks(
            employeeId,
            controller.signal,
          );

          if (controller.signal.aborted) return;

          // Defense in depth: only show tasks assigned to this user.
          const myTasks = taskData.filter(
            (task) => Number(getAssignedUserId(task)) === employeeId,
          );

          setTasks(myTasks);
          setProjects(buildEmployeeProjects(myTasks));
        } else {
          throw new Error("Unsupported user role.");
        }
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error("Search data fetch error:", err);
        setError(err.message || "Failed to load search data.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => controller.abort();
  }, [isAdmin, isManager, isEmployee, userId]);

  const results = useMemo(() => {
    if (!appliedFilters) {
      return [];
    }

    const matchedProjects =
      appliedFilters.searchIn === "tasks"
        ? []
        : projects
            .filter((project) =>
              matchesFilters(project, "project", appliedFilters),
            )
            .map((project) => ({
              id: `project-${project.id}`,
              type: "Project",
              name: getProjectName(project),
              status: project.status || "Unknown",
            }));

    const matchedTasks =
      isManager || appliedFilters.searchIn === "projects"
        ? []
        : tasks
            .filter((task) => matchesFilters(task, "task", appliedFilters))
            .map((task) => ({
              id: `task-${task.id}`,
              type: "Task",
              name: getTaskTitle(task),
              status: task.status || "Unknown",
            }));

    return [...matchedProjects, ...matchedTasks];
  }, [appliedFilters, projects, tasks, isManager]);

  const totalPages = Math.ceil(results.length / PAGE_SIZE);

  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return results.slice(startIndex, startIndex + PAGE_SIZE);
  }, [results, currentPage]);

  const handleSearch = (event) => {
    event.preventDefault();

    setCurrentPage(1);

    setAppliedFilters({
      search: search.trim(),
      searchIn: isManager ? "projects" : searchIn,
      status,
    });
  };

  const handleReset = () => {
    setSearch("");
    setSearchIn("all");
    setStatus("All Statuses");
    setAppliedFilters(null);
    setCurrentPage(1);
  };

  const handlePreviousPage = () => {
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  };

  const description = isManager
    ? "Find projects managed by you."
    : isEmployee
      ? "Find your assigned tasks and related projects."
      : "Find projects and tasks quickly.";

  return (
    <section className="search-filter-page">
      <div className="search-filter-header">
        <h1>Search & Filter</h1>
        <p>{description}</p>
      </div>

      <form className="search-filter-panel" onSubmit={handleSearch}>
        <div className="search-filter-field search-filter-full">
          <label htmlFor="global-search">Search</label>

          <input
            id="global-search"
            type="search"
            placeholder={
              isManager
                ? "Enter project name..."
                : "Enter project name or task title..."
            }
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="search-filter-field">
          <label htmlFor="search-in">Search In</label>

          <select
            id="search-in"
            value={isManager ? "projects" : searchIn}
            disabled={isManager}
            onChange={(event) => setSearchIn(event.target.value)}
          >
            {!isManager && <option value="all">All</option>}

            <option value="projects">Projects</option>

            {!isManager && <option value="tasks">Tasks</option>}
          </select>
        </div>

        <div className="search-filter-field">
          <label htmlFor="status-filter">Filter by Status</label>

          <select
            id="status-filter"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="search-filter-actions">
          <button
            type="submit"
            className="search-filter-submit"
            disabled={loading || Boolean(error)}
          >
            {loading ? "Loading..." : "Search"}
          </button>

          <button
            type="button"
            className="search-filter-reset"
            onClick={handleReset}
          >
            Clear Filters
          </button>
        </div>
      </form>

      <div className="search-filter-results">
        <h2>Results</h2>

        {loading && <p role="status">Loading search data...</p>}

        {!loading && error && <p role="alert">{error}</p>}

        {!loading && !error && !appliedFilters && (
          <p>Use the filters above and click Search to find results.</p>
        )}

        {!loading && !error && appliedFilters && (
          <>
            <p role="status">
              {results.length} result
              {results.length !== 1 ? "s" : ""} found
            </p>

            {results.length === 0 ? (
              <p>No results found.</p>
            ) : (
              <>
                <div className="search-filter-result-list">
                  {paginatedResults.map((item) => (
                    <div key={item.id} className="search-filter-result-item">
                      <div>
                        <strong>{item.name}</strong>
                        <p>{item.type}</p>
                      </div>

                      <span className="search-filter-status">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexWrap: "wrap",
                      gap: "12px",
                      marginTop: "24px",
                    }}
                  >
                    <button
                      type="button"
                      className="search-filter-reset"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>

                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 600,
                        color: "#334155",
                      }}
                    >
                      Page {currentPage} of {totalPages}
                    </span>

                    <button
                      type="button"
                      className="search-filter-submit"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {isManager && (
        <p className="search-filter-scope-note">
          Task search is currently unavailable for Manager accounts.
        </p>
      )}
    </section>
  );
}

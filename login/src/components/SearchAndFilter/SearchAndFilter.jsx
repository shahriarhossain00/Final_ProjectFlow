import { useEffect, useMemo, useState } from "react";

import { getProjects } from "../../services/projectApi";
import { getTasks } from "../../services/taskApi";

import {
  getMyManagedProjects,
  getUserTasks,
} from "../../manager/api/managerApi";

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

// Normalize project name.
function getProjectName(project) {
  return String(project.name ?? project.projectName ?? project.title ?? "");
}

// Normalize task title.
function getTaskTitle(task) {
  return String(task.title ?? task.name ?? "");
}

// Extract assigned user ID.
function getAssignedUserId(task) {
  if (task.assigned_to && typeof task.assigned_to === "object") {
    return task.assigned_to.id;
  }

  return task.assigned_to;
}

// Extract project ID from a task.
function getProjectId(task) {
  if (task.project && typeof task.project === "object") {
    return task.project.id;
  }

  return task.project;
}

// Extract project name from a task.
function getTaskProjectName(task) {
  return (
    task.project_title ||
    (typeof task.project === "object" ? task.project?.name : null) ||
    `Project #${getProjectId(task)}`
  );
}

// Build related projects from employee tasks.
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
        status: null,
      });
    }
  });

  return Array.from(projectMap.values());
}

// Apply search and status filters.
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

  // Search filter state
  const [search, setSearch] = useState("");
  const [searchIn, setSearchIn] = useState("all");
  const [status, setStatus] = useState("All Statuses");

  // API data state
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [appliedFilters, setAppliedFilters] = useState(null);

  // Pagination and refresh state
  const [currentPage, setCurrentPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch data according to the current user's role.
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
        // Admin: all accessible projects and tasks.
        if (isAdmin) {
          const [projectData, taskData] = await Promise.all([
            getProjects(controller.signal),
            getTasks(controller.signal),
          ]);

          if (controller.signal.aborted) return;

          setProjects(projectData);
          setTasks(taskData);
        }

        // Manager: managed projects and assigned tasks.
        else if (isManager) {
          const managerId = Number(userId);

          if (!Number.isSafeInteger(managerId) || managerId <= 0) {
            throw new Error("Invalid manager ID.");
          }

          const [projectData, taskData] = await Promise.all([
            getMyManagedProjects(controller.signal),
            getUserTasks(managerId, controller.signal),
          ]);

          if (controller.signal.aborted) return;

          setProjects(projectData);
          setTasks(taskData);
        }

        // Employee: assigned tasks and related projects.
        else if (isEmployee) {
          const employeeId = Number(userId);

          if (!Number.isSafeInteger(employeeId) || employeeId <= 0) {
            throw new Error("Invalid employee ID.");
          }

          const taskData = await getEmployeeTasks(
            employeeId,
            controller.signal,
          );

          if (controller.signal.aborted) return;

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
  }, [isAdmin, isManager, isEmployee, userId, refreshKey]);

  // Build filtered search results.
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
      appliedFilters.searchIn === "projects"
        ? []
        : tasks
            .filter((task) => matchesFilters(task, "task", appliedFilters))
            .map((task) => ({
              id: `task-${task.id ?? task.task_id}`,
              type: "Task",
              name: getTaskTitle(task),
              status: task.status || "Unknown",
            }));

    return [...matchedProjects, ...matchedTasks];
  }, [appliedFilters, projects, tasks]);

  // Calculate pagination.
  const totalPages = Math.ceil(results.length / PAGE_SIZE);

  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return results.slice(startIndex, startIndex + PAGE_SIZE);
  }, [results, currentPage]);

  // Apply search filters.
  const handleSearch = (event) => {
    event.preventDefault();

    setCurrentPage(1);

    setAppliedFilters({
      search: search.trim(),
      searchIn,
      status,
    });
  };

  // Reset search filters.
  const handleReset = () => {
    setSearch("");
    setSearchIn("all");
    setStatus("All Statuses");
    setAppliedFilters(null);
    setCurrentPage(1);
  };

  // Retry failed requests.
  const handleRetry = () => {
    setRefreshKey((previous) => previous + 1);
  };

  // Pagination controls.
  const handlePreviousPage = () => {
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  const handleNextPage = () => {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  };

  // Role-specific page description.
  const description = isManager
    ? "Find your managed projects and assigned tasks."
    : isEmployee
      ? "Find your assigned tasks and related projects."
      : "Find projects and tasks quickly.";

  // Dynamic search placeholder.
  const searchPlaceholder =
    searchIn === "projects"
      ? "Enter project name..."
      : searchIn === "tasks"
        ? "Enter task title..."
        : "Enter project name or task title...";

  return (
    <section className="search-filter-page">
      <div className="search-filter-header">
        <h1>Search & Filter</h1>

        <p>{description}</p>
      </div>

      {/* Search form */}
      <form className="search-filter-panel" onSubmit={handleSearch}>
        <div className="search-filter-field search-filter-full">
          <label htmlFor="global-search">Search</label>

          <input
            id="global-search"
            type="search"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {/* Search scope */}
        <div className="search-filter-field">
          <label htmlFor="search-in">Search In</label>

          <select
            id="search-in"
            value={searchIn}
            onChange={(event) => setSearchIn(event.target.value)}
          >
            <option value="all">All</option>

            <option value="projects">Projects</option>

            <option value="tasks">Tasks</option>
          </select>
        </div>

        {/* Status filter */}
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

        {/* Search actions */}
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

      {/* Search results */}
      <div className="search-filter-results">
        <h2>Results</h2>

        {loading && <p role="status">Loading search data...</p>}

        {!loading && error && (
          <div>
            <p role="alert">{error}</p>

            <button
              type="button"
              className="search-filter-reset"
              onClick={handleRetry}
            >
              Retry
            </button>
          </div>
        )}

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
                        <strong>{item.name || "Untitled"}</strong>

                        <p>{item.type}</p>
                      </div>

                      <span className="search-filter-status">
                        {item.status}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
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
    </section>
  );
}

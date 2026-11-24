import { useEffect, useRef, useState } from "react";

import {
  getDepartments,
  getMyManagedProjects,
  createProject,
} from "../api/managerApi";

import ProjectChatbox from "../../components/ProjectChatbox/ProjectChatbox";
import ProjectHealth from "../../features/project-health/ProjectHealth";

import "./ManagerProjects.css";

// Supported project priorities.
const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"];

// Initial project form state.
const INITIAL_FORM = {
  name: "",
  description: "",
  department: "",
  priority: "Medium",
  start_date: "",
  finish_date: "",
};

// Format project dates for display.
function formatDate(dateValue) {
  if (!dateValue) {
    return "Not set";
  }

  const value = String(dateValue);

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value,
  );

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return date.toLocaleDateString();
}

// Manager project management page.
function ManagerProjects({ user }) {
  // API data state.
  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Loading and submission state.
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Error and success state.
  const [loadError, setLoadError] = useState("");
  const [departmentError, setDepartmentError] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Selected project features.
  const [selectedProject, setSelectedProject] = useState(null);

  const [selectedHealthProject, setSelectedHealthProject] = useState(null);

  // Project creation form state.
  const [formData, setFormData] = useState({ ...INITIAL_FORM });

  // Prevent duplicate project submissions.
  const submittingRef = useRef(false);

  // Fetch managed projects and departments.
  useEffect(() => {
    const controller = new AbortController();

    async function loadPageData() {
      setLoading(true);
      setLoadError("");
      setDepartmentError("");

      try {
        const [projectResult, departmentResult] = await Promise.allSettled([
          getMyManagedProjects(controller.signal),
          getDepartments(controller.signal),
        ]);

        if (controller.signal.aborted) {
          return;
        }

        // Handle managed project response.
        if (projectResult.status === "fulfilled") {
          const managedProjects = projectResult.value;

          setProjects(managedProjects);

          // Close chat if its project is no longer accessible.
          setSelectedProject((current) => {
            if (!current) {
              return null;
            }

            return managedProjects.some(
              (project) => String(project.id) === String(current.id),
            )
              ? current
              : null;
          });

          // Close health view if its project is unavailable.
          setSelectedHealthProject((current) => {
            if (!current) {
              return null;
            }

            return managedProjects.some(
              (project) => String(project.id) === String(current.id),
            )
              ? current
              : null;
          });
        } else {
          setProjects([]);
          setSelectedProject(null);
          setSelectedHealthProject(null);

          setLoadError(
            projectResult.reason?.message || "Unable to load managed projects.",
          );
        }

        // Handle department response independently.
        if (departmentResult.status === "fulfilled") {
          setDepartments(departmentResult.value);
        } else {
          setDepartments([]);

          setDepartmentError(
            departmentResult.reason?.message || "Unable to load departments.",
          );
        }
      } catch (err) {
        if (controller.signal.aborted) {
          return;
        }

        setProjects([]);
        setDepartments([]);
        setSelectedProject(null);
        setSelectedHealthProject(null);

        setLoadError(err.message || "Unable to load project data.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadPageData();

    return () => controller.abort();
  }, [user?.id, refreshKey]);

  // Refresh page data.
  function handleRefresh() {
    setRefreshKey((previous) => previous + 1);
  }

  // Update a form field.
  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  }

  // Reset and close the creation form.
  function resetForm() {
    setFormData({ ...INITIAL_FORM });
    setShowForm(false);
    setError("");
  }

  // Open or close the project creation form.
  function handleToggleForm() {
    if (saving) {
      return;
    }

    setError("");
    setSuccess("");

    if (showForm) {
      resetForm();
    } else {
      setShowForm(true);
    }
  }

  // Validate project creation data.
  function validateForm() {
    const projectName = formData.name.trim();
    const departmentId = Number(formData.department);

    if (!projectName) {
      return "Project name is required.";
    }

    if (projectName.length > 200) {
      return "Project name cannot exceed 200 characters.";
    }

    if (
      !Number.isSafeInteger(departmentId) ||
      departmentId <= 0 ||
      !departments.some((department) => Number(department.id) === departmentId)
    ) {
      return "Please select a valid department.";
    }

    if (!PRIORITY_OPTIONS.includes(formData.priority)) {
      return "Please select a valid priority.";
    }

    if (!formData.start_date || !formData.finish_date) {
      return "Start date and due date are required.";
    }

    if (formData.finish_date < formData.start_date) {
      return "Due date cannot be earlier than start date.";
    }

    return "";
  }

  // Create a project using the existing backend API.
  async function handleSubmit(event) {
    event.preventDefault();

    if (submittingRef.current || loading || departmentError) {
      return;
    }

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    submittingRef.current = true;
    setSaving(true);

    try {
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        department: Number(formData.department),
        priority: formData.priority,
        start_date: formData.start_date,
        finish_date: formData.finish_date,
      };

      // Backend identifies the manager using the JWT.
      await createProject(payload);

      resetForm();

      setSuccess("Project created successfully.");

      // Refresh managed projects after creation.
      handleRefresh();
    } catch (err) {
      console.error("Project creation failed:", err);

      setError(err.message || "Unable to create project.");
    } finally {
      submittingRef.current = false;
      setSaving(false);
    }
  }

  // Open a managed project's group chat.
  function handleOpenChat(project) {
    if (
      project?.id == null ||
      !projects.some((item) => String(item.id) === String(project.id))
    ) {
      return;
    }

    setSelectedProject({
      id: project.id,
      name: project.name || `Project #${project.id}`,
    });
  }

  // Close the selected project chat.
  function handleCloseChat() {
    setSelectedProject(null);
  }

  // Open project health analysis.
  function handleOpenHealth(project) {
    if (
      project?.id == null ||
      !projects.some((item) => String(item.id) === String(project.id))
    ) {
      return;
    }

    setSelectedHealthProject({
      id: project.id,
      name: project.name || `Project #${project.id}`,
    });
  }

  // Close project health analysis.
  function handleCloseHealth() {
    setSelectedHealthProject(null);
  }

  return (
    <div className="manager-projects-page">
      {/* Page header */}
      <div className="manager-projects-header">
        <div>
          <p className="manager-projects-eyebrow">WORKSPACE</p>

          <h2>My Projects</h2>

          <p>Organize and manage your projects.</p>
        </div>

        <button
          type="button"
          className="manager-project-create-button"
          onClick={handleToggleForm}
          disabled={saving}
        >
          {showForm ? "Close Form" : "+ Create Project"}
        </button>
      </div>

      {/* Project loading error */}
      {loadError && (
        <div className="manager-project-message error" role="alert">
          <p>{loadError}</p>

          <button
            type="button"
            className="manager-project-cancel-button"
            onClick={handleRefresh}
            disabled={loading || saving}
          >
            Retry
          </button>
        </div>
      )}

      {/* Form submission error */}
      {error && (
        <div className="manager-project-message error" role="alert">
          {error}
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="manager-project-message success" role="status">
          {success}
        </div>
      )}

      {/* Project creation form */}
      {showForm && (
        <section className="manager-project-form-card">
          <div className="manager-project-form-heading">
            <div>
              <h3>Create New Project</h3>

              <p>Enter the project details below.</p>
            </div>
          </div>

          {departmentError && (
            <div className="manager-project-message error" role="alert">
              <p>{departmentError}</p>

              <button
                type="button"
                className="manager-project-cancel-button"
                onClick={handleRefresh}
                disabled={loading || saving}
              >
                Retry
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="manager-project-form-grid">
              {/* Project name */}
              <div className="manager-project-field full-width">
                <label htmlFor="project-name">Project Name *</label>

                <input
                  id="project-name"
                  name="name"
                  type="text"
                  placeholder="Enter project name"
                  value={formData.name}
                  onChange={handleChange}
                  maxLength={200}
                  disabled={saving}
                  required
                />
              </div>

              {/* Project description */}
              <div className="manager-project-field full-width">
                <label htmlFor="project-description">Description</label>

                <textarea
                  id="project-description"
                  name="description"
                  placeholder="Describe the project..."
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  disabled={saving}
                />
              </div>

              {/* Department selection */}
              <div className="manager-project-field">
                <label htmlFor="project-department">Department *</label>

                <select
                  id="project-department"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  disabled={
                    loading ||
                    saving ||
                    Boolean(departmentError) ||
                    departments.length === 0
                  }
                  required
                >
                  <option value="">
                    {loading ? "Loading departments..." : "Select department"}
                  </option>

                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name ||
                        department.department_name ||
                        `Department #${department.id}`}
                    </option>
                  ))}
                </select>

                {!loading && !departmentError && departments.length === 0 && (
                  <p>No departments available.</p>
                )}
              </div>

              {/* Project priority */}
              <div className="manager-project-field">
                <label htmlFor="project-priority">Priority *</label>

                <select
                  id="project-priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  disabled={saving}
                  required
                >
                  {PRIORITY_OPTIONS.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project start date */}
              <div className="manager-project-field">
                <label htmlFor="project-start-date">Start Date *</label>

                <input
                  id="project-start-date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleChange}
                  disabled={saving}
                  required
                />
              </div>

              {/* Project deadline */}
              <div className="manager-project-field">
                <label htmlFor="project-finish-date">Due Date *</label>

                <input
                  id="project-finish-date"
                  name="finish_date"
                  type="date"
                  min={formData.start_date || undefined}
                  value={formData.finish_date}
                  onChange={handleChange}
                  disabled={saving}
                  required
                />
              </div>
            </div>

            {/* Form actions */}
            <div className="manager-project-form-actions">
              <button
                type="button"
                className="manager-project-cancel-button"
                onClick={resetForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="manager-project-submit-button"
                disabled={
                  saving ||
                  loading ||
                  Boolean(departmentError) ||
                  departments.length === 0
                }
              >
                {saving ? "Creating..." : "Create Project"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Managed projects list */}
      <section className="manager-project-list-section">
        <div className="manager-project-list-heading">
          <h3>Project List</h3>

          <span>
            {loading
              ? "Loading..."
              : loadError
                ? "Unavailable"
                : `${projects.length} projects`}
          </span>

          <button
            type="button"
            className="manager-project-cancel-button"
            onClick={handleRefresh}
            disabled={loading || saving}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="manager-project-loading" role="status">
            Loading projects...
          </div>
        ) : loadError ? (
          <div className="manager-project-empty">
            <h3>Unable to load projects</h3>

            <p>Please retry to load your managed projects.</p>
          </div>
        ) : projects.length === 0 ? (
          <div className="manager-project-empty">
            <h3>No managed projects found</h3>

            <p>Create your first project to get started.</p>
          </div>
        ) : (
          <div className="manager-project-grid">
            {projects.map((project) => {
              const isChatSelected =
                selectedProject != null &&
                String(selectedProject.id) === String(project.id);

              const priority = PRIORITY_OPTIONS.includes(project.priority)
                ? project.priority
                : "Medium";

              return (
                <article className="manager-project-card" key={project.id}>
                  {/* Project name and priority */}
                  <div className="manager-project-card-top">
                    <h3>
                      {project.name || project.title || "Untitled Project"}
                    </h3>

                    <span
                      className={`manager-project-priority priority-${priority.toLowerCase()}`}
                    >
                      {project.priority || "Not specified"}
                    </span>
                  </div>

                  {/* Project description */}
                  <p className="manager-project-description">
                    {project.description || "No description available."}
                  </p>

                  {/* Project dates */}
                  <div className="manager-project-dates">
                    <div>
                      <span>Start Date</span>

                      <strong>{formatDate(project.start_date)}</strong>
                    </div>

                    <div>
                      <span>Due Date</span>

                      <strong>{formatDate(project.finish_date)}</strong>
                    </div>
                  </div>

                  {/* Department information */}
                  <div className="manager-project-department">
                    Department:{" "}
                    {project.department_name ||
                      project.department?.name ||
                      (typeof project.department !== "object"
                        ? project.department
                        : null) ||
                      "Not specified"}
                  </div>

                  {/* Project actions */}
                  <div className="manager-project-chat-actions">
                    <button
                      type="button"
                      className={`manager-project-chat-button ${
                        isChatSelected ? "active" : ""
                      }`}
                      onClick={() => handleOpenChat(project)}
                    >
                      {isChatSelected ? "Chat Open" : "Open Chat"}
                    </button>

                    <button
                      type="button"
                      className="manager-project-chat-button"
                      onClick={() => handleOpenHealth(project)}
                    >
                      View Health
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Selected project group chat */}
      {selectedProject && (
        <section className="manager-project-chat-section">
          <div className="manager-project-chat-heading">
            <div>
              <h3>{selectedProject.name} — Group Chat</h3>

              <p>Communicate with your project team.</p>
            </div>

            <button
              type="button"
              className="manager-project-close-chat"
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

      {/* Project health analysis */}
      {selectedHealthProject && (
        <ProjectHealth
          key={selectedHealthProject.id}
          projectId={selectedHealthProject.id}
          projectName={selectedHealthProject.name}
          onClose={handleCloseHealth}
        />
      )}
    </div>
  );
}

export default ManagerProjects;

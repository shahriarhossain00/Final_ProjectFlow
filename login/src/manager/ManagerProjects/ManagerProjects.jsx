import { useEffect, useState } from "react";
import { getDepartments, getProjects, createProject } from "../api/managerApi";
import ProjectChatbox from "../../components/ProjectChatbox/ProjectChatbox";
import "./ManagerProjects.css";

// Available project priority values supported by the backend.
const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Urgent"];

// Format a date for display.
function formatDate(dateValue) {
  if (!dateValue) return "Not set";

  return new Date(`${dateValue}T00:00:00`).toLocaleDateString();
}

// Manager's project management page.
function ManagerProjects({ user }) {
  const [projects, setProjects] = useState([]);
  const [departments, setDepartments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Currently selected project for group chat.
  const [selectedProject, setSelectedProject] = useState(null);

  // Project creation form state.
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    department: "",
    priority: "Medium",
    start_date: "",
    finish_date: "",
  });

  // Load projects and departments when the page opens.
  useEffect(() => {
    loadPageData();
  }, []);

  // Fetch required data from the existing backend APIs.
  async function loadPageData() {
    setLoading(true);
    setError("");

    try {
      const [projectData, departmentData] = await Promise.all([
        getProjects(),
        getDepartments(),
      ]);

      setProjects(projectData);
      setDepartments(departmentData);
    } catch (err) {
      console.error("Failed to load manager projects:", err);
      setError(err.message || "Unable to load project data.");
    } finally {
      setLoading(false);
    }
  }

  // Update one form field.
  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  // Reset the form when the user closes it.
  function resetForm() {
    setFormData({
      name: "",
      description: "",
      department: "",
      priority: "Medium",
      start_date: "",
      finish_date: "",
    });

    setShowForm(false);
    setError("");
  }

  // Validate the project form before submitting it.
  function validateForm() {
    if (!formData.name.trim()) {
      return "Project name is required.";
    }

    if (!formData.department) {
      return "Please select a department.";
    }

    if (!formData.start_date || !formData.finish_date) {
      return "Start date and due date are required.";
    }

    if (formData.finish_date < formData.start_date) {
      return "Due date cannot be earlier than start date.";
    }

    return "";
  }

  // Create the project through the existing backend API.
  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);

    try {
      // Prepare the payload expected by the existing Project API.
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        department: Number(formData.department),
        priority: formData.priority,
        start_date: formData.start_date,
        finish_date: formData.finish_date,
      };

      // Backend identifies the Manager from the JWT token.
      await createProject(payload);

      setSuccess("Project created successfully.");

      resetForm();

      // Refresh project list after creation.
      await loadPageData();
    } catch (err) {
      console.error("Project creation failed:", err);
      setError(err.message || "Unable to create project.");
    } finally {
      setSaving(false);
    }
  }

  // Open a specific project's group chat.
  function handleOpenChat(project) {
    if (project?.id == null) return;

    setSelectedProject({
      id: project.id,
      name: project.name || `Project #${project.id}`,
    });
  }

  // Close the currently opened chat.
  function handleCloseChat() {
    setSelectedProject(null);
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
          onClick={() => {
            setError("");
            setSuccess("");
            setShowForm((previous) => !previous);
          }}
        >
          {showForm ? "Close Form" : "+ Create Project"}
        </button>
      </div>

      {/* API success and error messages */}
      {error && (
        <div className="manager-project-message error" role="alert">
          {error}
        </div>
      )}

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
                  required
                >
                  <option value="">Select department</option>

                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name || department.department_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project priority */}
              <div className="manager-project-field">
                <label htmlFor="project-priority">Priority *</label>

                <select
                  id="project-priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
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
                disabled={saving}
              >
                {saving ? "Creating..." : "Create Project"}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Existing projects list */}
      <section className="manager-project-list-section">
        <div className="manager-project-list-heading">
          <h3>Project List</h3>

          <span>{projects.length} projects</span>
        </div>

        {loading ? (
          <div className="manager-project-loading">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="manager-project-empty">
            <h3>No projects found</h3>

            <p>Create your first project to get started.</p>
          </div>
        ) : (
          <div className="manager-project-grid">
            {projects.map((project) => {
              const isChatSelected =
                selectedProject != null &&
                String(selectedProject.id) === String(project.id);

              return (
                <article className="manager-project-card" key={project.id}>
                  {/* Project name and priority */}
                  <div className="manager-project-card-top">
                    <h3>{project.name}</h3>

                    <span
                      className={`manager-project-priority priority-${(
                        project.priority || "Medium"
                      ).toLowerCase()}`}
                    >
                      {project.priority || "Medium"}
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
                      project.department ||
                      "Not specified"}
                  </div>

                  {/* Project Group Chat Button */}
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
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Selected Project Group Chat */}
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
          {console.log("Manager current user:", user)}
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

export default ManagerProjects;

import { useState, useEffect, useRef } from "react";
import "./CreateProject.css";

import {
  createProject,
  updateProject,
  deleteProject,
  getDepartments,
  toUiProject,
} from "../../services/projectApi";

import { getTasks } from "../../services/taskApi";

const PROJECT_STATUSES = ["Not Started", "In Progress", "Completed", "On Hold"];

const MAX_PROJECT_NAME_LENGTH = 100;

function getProjectId(task) {
  if (task.project && typeof task.project === "object") {
    return task.project.id;
  }

  return task.project ?? task.projectId;
}

function getAssignedUserId(task) {
  if (task.assigned_to && typeof task.assigned_to === "object") {
    return task.assigned_to.id;
  }

  return task.assigned_to ?? task.assignedMemberId;
}

function getErrorMessage(error, fallback) {
  return error?.message || fallback;
}

function CreateProject({
  projects = [],
  onSaveProject,
  onUpdateProject,
  onDeleteProject,
}) {
  // Create Project Form
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");

  const [departments, setDepartments] = useState([]);
  const [departmentId, setDepartmentId] = useState("");

  const [status, setStatus] = useState("Not Started");
  const [startDate, setStartDate] = useState("");
  const [finishDate, setFinishDate] = useState("");

  const [departmentsLoading, setDepartmentsLoading] = useState(true);
  const [departmentsError, setDepartmentsError] = useState("");
  const [departmentRefreshKey, setDepartmentRefreshKey] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [editingBusy, setEditingBusy] = useState(false);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const createLock = useRef(false);
  const editLock = useRef(false);
  const deleteLock = useRef(false);

  // Edit Project Modal
  const [editingProject, setEditingProject] = useState(null);
  const [editedProjectName, setEditedProjectName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);

  // Delete Project Modal
  const [deletingProject, setDeletingProject] = useState(null);
  const [deletingProjectTasks, setDeletingProjectTasks] = useState([]);
  const [deleteDetailsLoading, setDeleteDetailsLoading] = useState(false);
  const [deleteDetailsError, setDeleteDetailsError] = useState("");

  // Messages
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load departments from Django
  useEffect(() => {
    const controller = new AbortController();

    async function loadDepartments() {
      setDepartmentsLoading(true);
      setDepartmentsError("");

      try {
        const data = await getDepartments(controller.signal);

        if (!controller.signal.aborted) {
          setDepartments(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setDepartments([]);

          setDepartmentsError(
            getErrorMessage(err, "Failed to load departments."),
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setDepartmentsLoading(false);
        }
      }
    }

    loadDepartments();

    return () => controller.abort();
  }, [departmentRefreshKey]);

  // Load latest backend tasks before deleting a project
  useEffect(() => {
    if (!deletingProject) return;

    const controller = new AbortController();

    async function loadProjectTasks() {
      setDeleteDetailsLoading(true);
      setDeleteDetailsError("");
      setDeletingProjectTasks([]);

      try {
        const data = await getTasks(controller.signal);

        if (controller.signal.aborted) return;

        const projectTasks = data.filter(
          (task) => String(getProjectId(task)) === String(deletingProject.id),
        );

        setDeletingProjectTasks(projectTasks);
      } catch (err) {
        if (!controller.signal.aborted) {
          setDeleteDetailsError(
            getErrorMessage(err, "Failed to load project task details."),
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setDeleteDetailsLoading(false);
        }
      }
    }

    loadProjectTasks();

    return () => controller.abort();
  }, [deletingProject]);

  // Create Project
  const handleSave = async (event) => {
    event.preventDefault();

    if (createLock.current) return;

    setError("");
    setMessage("");

    const name = projectName.trim();

    if (!name) {
      setError("Please enter a project name.");
      return;
    }

    if (name.length > MAX_PROJECT_NAME_LENGTH) {
      setError("Project name cannot exceed 100 characters.");
      return;
    }

    const validDepartment = departments.some(
      (department) => String(department.id) === String(departmentId),
    );

    if (!departmentId || !validDepartment) {
      setError("Please select a valid department.");
      return;
    }

    if (!PROJECT_STATUSES.includes(status)) {
      setError("Please select a valid project status.");
      return;
    }

    if (startDate && finishDate && finishDate < startDate) {
      setError("Finish date cannot be earlier than start date.");
      return;
    }

    const duplicate = projects.some(
      (project) =>
        project.projectName?.trim().toLowerCase() === name.toLowerCase(),
    );

    if (duplicate) {
      setError("A project with this name already exists.");
      return;
    }

    createLock.current = true;
    setSubmitting(true);

    try {
      const payload = {
        name,
        description: description.trim(),
        department: Number(departmentId),
        status,
        start_date: startDate || null,
        finish_date: finishDate || null,
      };

      const savedProject = await createProject(payload);

      try {
        await onSaveProject(toUiProject(savedProject));
      } catch {
        setError(
          "Project was created on the server, but the local list could not be updated. Refresh the page.",
        );

        return;
      }

      setProjectName("");
      setDescription("");
      setDepartmentId("");
      setStatus("Not Started");
      setStartDate("");
      setFinishDate("");

      setMessage("Project created successfully!");
    } catch (err) {
      setError(getErrorMessage(err, "Could not create project."));
    } finally {
      createLock.current = false;
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleEdit = (project) => {
    setEditingProject(project);
    setEditedProjectName(project.projectName || "");
    setEditedDescription(project.description || "");

    setEditSuccess(false);
    setError("");
    setMessage("");
  };

  // Update Project
  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!editingProject || editSuccess || editLock.current) return;

    setError("");
    setMessage("");

    const name = editedProjectName.trim();

    if (!name) {
      setError("Please enter a project name.");
      return;
    }

    if (name.length > MAX_PROJECT_NAME_LENGTH) {
      setError("Project name cannot exceed 100 characters.");
      return;
    }

    const duplicate = projects.some(
      (project) =>
        project.projectName?.trim().toLowerCase() === name.toLowerCase() &&
        String(project.id) !== String(editingProject.id),
    );

    if (duplicate) {
      setError("A project with this name already exists.");
      return;
    }

    editLock.current = true;
    setEditingBusy(true);

    try {
      const savedProject = await updateProject(editingProject.id, {
        name,
        description: editedDescription.trim(),
      });

      try {
        await onUpdateProject(toUiProject(savedProject));
      } catch {
        setError(
          "Project was updated on the server. Refresh the page to see the latest data.",
        );

        return;
      }

      setEditSuccess(true);
    } catch (err) {
      setError(getErrorMessage(err, "Could not update project."));
    } finally {
      editLock.current = false;
      setEditingBusy(false);
    }
  };

  // Close Edit Modal
  const closeEditModal = () => {
    if (editLock.current) return;

    setEditingProject(null);
    setEditedProjectName("");
    setEditedDescription("");
    setEditSuccess(false);
    setError("");
  };

  // Open Delete Modal
  const openDeleteModal = (project) => {
    setDeletingProjectTasks([]);
    setDeleteDetailsError("");
    setDeleteDetailsLoading(true);
    setDeletingProject(project);
    setError("");
    setMessage("");
  };

  // Close Delete Modal
  const closeDeleteModal = () => {
    if (deleteLock.current) return;

    setDeletingProject(null);
    setDeletingProjectTasks([]);
    setDeleteDetailsError("");
    setDeleteDetailsLoading(false);
    setError("");
  };

  // Delete Project
  const handleConfirmDelete = async () => {
    if (
      !deletingProject ||
      deleteLock.current ||
      deleteDetailsLoading ||
      deleteDetailsError
    ) {
      return;
    }

    setError("");

    deleteLock.current = true;
    setDeletingBusy(true);

    try {
      const projectId = deletingProject.id;

      await deleteProject(projectId);

      try {
        const success = await onDeleteProject(projectId, "");

        if (success === false) {
          throw new Error("Local project update failed.");
        }
      } catch {
        setDeletingProject(null);
        setDeletingProjectTasks([]);

        setError(
          "Project was deleted on the server. Refresh the page to update the project list.",
        );

        return;
      }

      setDeletingProject(null);
      setDeletingProjectTasks([]);

      setMessage("Project deleted successfully!");
    } catch (err) {
      setError(getErrorMessage(err, "Could not delete project."));
    } finally {
      deleteLock.current = false;
      setDeletingBusy(false);
    }
  };

  // Escape Key Handler
  useEffect(() => {
    if (!editingProject && !deletingProject) return;

    const handleEscape = (event) => {
      if (event.key !== "Escape") return;

      if (editingProject && !editLock.current) {
        setEditingProject(null);
        setEditedProjectName("");
        setEditedDescription("");
        setEditSuccess(false);
        setError("");
      }

      if (deletingProject && !deleteLock.current) {
        setDeletingProject(null);
        setDeletingProjectTasks([]);
        setDeleteDetailsError("");
        setDeleteDetailsLoading(false);
        setError("");
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [editingProject, deletingProject]);

  // Count unique users assigned to project tasks
  const deletingMemberCount = new Set(
    deletingProjectTasks
      .map(getAssignedUserId)
      .filter((id) => id != null && id !== "")
      .map(String),
  ).size;

  const deletingTaskCount = deletingProjectTasks.length;

  return (
    <div className="create-project-page">
      <h2>Project Management</h2>

      <p className="project-page-subtitle">Create and manage your projects.</p>

      {/* Create Project Form */}
      <form className="create-project-form" onSubmit={handleSave}>
        <h3>Create Project</h3>

        <label htmlFor="projectName">Project Name</label>

        <input
          id="projectName"
          type="text"
          placeholder="Enter project name"
          value={projectName}
          maxLength={MAX_PROJECT_NAME_LENGTH}
          required
          disabled={submitting}
          onChange={(event) => setProjectName(event.target.value)}
        />

        <label htmlFor="description">Description</label>

        <textarea
          id="description"
          placeholder="Description about the project"
          rows={4}
          value={description}
          disabled={submitting}
          onChange={(event) => setDescription(event.target.value)}
        />

        <label htmlFor="projectDepartment">Department</label>

        <select
          id="projectDepartment"
          value={departmentId}
          required
          disabled={
            departmentsLoading || submitting || Boolean(departmentsError)
          }
          onChange={(event) => setDepartmentId(event.target.value)}
        >
          <option value="">
            {departmentsLoading
              ? "Loading departments..."
              : "Select department"}
          </option>

          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>

        {departmentsError && (
          <div role="alert">
            <p className="form-error">{departmentsError}</p>

            <button
              type="button"
              className="project-cancel-btn"
              onClick={() =>
                setDepartmentRefreshKey((previous) => previous + 1)
              }
            >
              Retry
            </button>
          </div>
        )}

        <label htmlFor="projectStatus">Status</label>

        <select
          id="projectStatus"
          value={status}
          disabled={submitting}
          onChange={(event) => setStatus(event.target.value)}
        >
          {PROJECT_STATUSES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <label htmlFor="projectStartDate">Start Date (optional)</label>

        <input
          id="projectStartDate"
          type="date"
          value={startDate}
          disabled={submitting}
          onChange={(event) => setStartDate(event.target.value)}
        />

        <label htmlFor="projectFinishDate">Finish Date (optional)</label>

        <input
          id="projectFinishDate"
          type="date"
          min={startDate || undefined}
          value={finishDate}
          disabled={submitting}
          onChange={(event) => setFinishDate(event.target.value)}
        />

        <div className="project-form-actions">
          <button
            type="submit"
            disabled={
              submitting || departmentsLoading || Boolean(departmentsError)
            }
          >
            {submitting ? "Saving..." : "Save Project"}
          </button>
        </div>

        {message && (
          <p className="form-success" role="status">
            {message}
          </p>
        )}

        {error && !editingProject && !deletingProject && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </form>

      {/* All Projects Table */}
      <div className="projects-table-card">
        <h3>All Projects ({projects.length})</h3>

        <div className="projects-table-wrapper">
          <table className="projects-table">
            <thead>
              <tr>
                <th>SL</th>
                <th>Project Name</th>
                <th>Description</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {projects.length === 0 ? (
                <tr>
                  <td colSpan="4">No projects created yet.</td>
                </tr>
              ) : (
                projects.map((project, index) => (
                  <tr key={project.id}>
                    <td>{index + 1}</td>

                    <td>
                      <strong>{project.projectName}</strong>
                    </td>

                    <td>{project.description || "No description"}</td>

                    <td>
                      <div className="project-table-actions">
                        <button
                          type="button"
                          className="project-table-edit"
                          disabled={submitting}
                          onClick={() => handleEdit(project)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="project-table-delete"
                          disabled={submitting}
                          onClick={() => openDeleteModal(project)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Project Modal */}
      {editingProject && (
        <div
          className="project-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeEditModal();
            }
          }}
        >
          <form
            className="project-edit-modal"
            onSubmit={handleUpdate}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-project-title"
          >
            <div className="edit-modal-header">
              <div>
                <h3 id="edit-project-title">
                  {editSuccess ? "Project Updated" : "Edit Project"}
                </h3>

                <p>
                  {editSuccess
                    ? "Your changes have been saved."
                    : "Update your project information"}
                </p>
              </div>

              <button
                type="button"
                className="edit-modal-close"
                aria-label="Close edit modal"
                disabled={editingBusy}
                onClick={closeEditModal}
              >
                ×
              </button>
            </div>

            {!editSuccess ? (
              <>
                <div className="edit-modal-body">
                  <label htmlFor="edit-project-name">Project Name</label>

                  <input
                    id="edit-project-name"
                    type="text"
                    value={editedProjectName}
                    maxLength={MAX_PROJECT_NAME_LENGTH}
                    required
                    autoFocus
                    disabled={editingBusy}
                    onChange={(event) =>
                      setEditedProjectName(event.target.value)
                    }
                  />

                  <label htmlFor="edit-project-description">Description</label>

                  <textarea
                    id="edit-project-description"
                    rows={5}
                    value={editedDescription}
                    disabled={editingBusy}
                    onChange={(event) =>
                      setEditedDescription(event.target.value)
                    }
                  />

                  {error && (
                    <p className="form-error" role="alert">
                      {error}
                    </p>
                  )}
                </div>

                <div className="edit-modal-footer">
                  <button
                    type="button"
                    className="edit-modal-cancel"
                    onClick={closeEditModal}
                    disabled={editingBusy}
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="edit-modal-save"
                    disabled={editingBusy}
                  >
                    {editingBusy ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </>
            ) : (
              <div className="edit-success-section">
                <p className="edit-success-message" role="status">
                  ✓ Project updated successfully!
                </p>

                <button
                  type="button"
                  className="back-to-project-btn"
                  onClick={closeEditModal}
                >
                  Back to Create Project
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Delete Project Modal */}
      {deletingProject && (
        <div className="project-modal-overlay">
          <div
            className="project-delete-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-project-title"
          >
            <h3 id="delete-project-title">Delete Project</h3>

            <p>
              Are you sure you want to delete{" "}
              <strong>{deletingProject.projectName}</strong>?
            </p>

            {deleteDetailsLoading && (
              <p role="status">Loading project task details...</p>
            )}

            {deleteDetailsError && (
              <p className="form-error" role="alert">
                {deleteDetailsError} Close this dialog and try again.
              </p>
            )}

            {!deleteDetailsLoading && !deleteDetailsError && (
              <>
                <p className="delete-warning">
                  This action will permanently delete the project, its{" "}
                  {deletingTaskCount} task(s), associated chat messages, task
                  submissions and related notifications. This action cannot be
                  undone.
                </p>

                <p>
                  Total Tasks: <strong>{deletingTaskCount}</strong>
                </p>

                <p>
                  Assigned Members: <strong>{deletingMemberCount}</strong>
                </p>

                <p>
                  Member accounts will not be deleted. Their tasks belonging to
                  this project will be removed.
                </p>
              </>
            )}

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}

            <div className="project-delete-actions">
              <button
                type="button"
                className="project-cancel-btn"
                disabled={deletingBusy}
                onClick={closeDeleteModal}
              >
                Cancel
              </button>

              <button
                type="button"
                className="confirm-delete-btn"
                onClick={handleConfirmDelete}
                disabled={
                  deletingBusy ||
                  deleteDetailsLoading ||
                  Boolean(deleteDetailsError)
                }
              >
                {deletingBusy
                  ? "Deleting..."
                  : deleteDetailsLoading
                    ? "Loading..."
                    : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateProject;

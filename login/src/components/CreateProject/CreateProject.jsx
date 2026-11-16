import { useState, useEffect } from "react";
import "./CreateProject.css";

import {
  createProject,
  updateProject,
  deleteProject,
  getDepartments,
  toUiProject,
} from "../../services/projectApi";

function CreateProject({
  projects,
  memberships,
  tasks,
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

  const [submitting, setSubmitting] = useState(false);
  const [editingBusy, setEditingBusy] = useState(false);
  const [deletingBusy, setDeletingBusy] = useState(false);

  // Edit Project Modal
  const [editingProject, setEditingProject] = useState(null);
  const [editedProjectName, setEditedProjectName] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);

  // Delete Project Modal
  const [deletingProject, setDeletingProject] = useState(null);
  const [transferProjectId, setTransferProjectId] = useState("");

  // Messages
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Load departments from Django
  useEffect(() => {
    const controller = new AbortController();

    async function loadDepartments() {
      try {
        const data = await getDepartments(controller.signal);

        if (!controller.signal.aborted) {
          setDepartments(data);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          setDepartmentsError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setDepartmentsLoading(false);
        }
      }
    }

    loadDepartments();

    return () => controller.abort();
  }, []);

  // Create Project
  const handleSave = async (event) => {
    event.preventDefault();

    if (submitting) return;

    setError("");
    setMessage("");

    const name = projectName.trim();

    if (!name) {
      setError("Please enter a project name.");
      return;
    }

    if (!departmentId) {
      setError("Please select a department.");
      return;
    }

    if (startDate && finishDate && finishDate < startDate) {
      setError("Finish date cannot be earlier than start date.");
      return;
    }

    const duplicate = projects.some(
      (project) => project.projectName?.toLowerCase() === name.toLowerCase(),
    );

    if (duplicate) {
      setError("A project with this name already exists.");
      return;
    }

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

      console.log("Create Project Request:", payload);

      const savedProject = await createProject(payload); //project create

      console.log("Create Project Response:", savedProject);

      onSaveProject(toUiProject(savedProject)); 

      setProjectName("");
      setDescription("");
      setDepartmentId("");
      setStatus("Not Started");
      setStartDate("");
      setFinishDate("");

      setMessage("Project created successfully!");
    } catch (err) {
      console.error("Create Project Error:", err);

      setError(err.message || "Could not create project.");
    } finally {
      setSubmitting(false);
    }
  };

  // Open Edit Modal
  const handleEdit = (project) => {
    setEditingProject(project);
    setEditedProjectName(project.projectName);
    setEditedDescription(project.description || "");

    setEditSuccess(false);
    setError("");
    setMessage("");
  };

  // Update Project
  const handleUpdate = async (event) => {
    event.preventDefault();

    if (!editingProject || editSuccess || editingBusy) return;

    setError("");
    setMessage("");

    const name = editedProjectName.trim();

    if (!name) {
      setError("Please enter a project name.");
      return;
    }

    const duplicate = projects.some(
      (project) =>
        project.projectName?.toLowerCase() === name.toLowerCase() &&
        project.id !== editingProject.id,
    );

    if (duplicate) {
      setError("A project with this name already exists.");
      return;
    }

    setEditingBusy(true);

    try {
      //edit
      const savedProject = await updateProject(editingProject.id, {
        name,
        description: editedDescription.trim(),
      });

      onUpdateProject(toUiProject(savedProject));

      setEditSuccess(true);
    } catch (err) {
      console.error("Update Project Error:", err);

      setError(err.message || "Could not update project.");
    } finally {
      setEditingBusy(false);
    }
  };

  // Close Edit Modal
  const closeEditModal = () => {
    if (editingBusy) return;

    setEditingProject(null);
    setEditedProjectName("");
    setEditedDescription("");
    setEditSuccess(false);
    setError("");
  };

  // Open Delete Modal
  const openDeleteModal = (project) => {
    setDeletingProject(project);
    setTransferProjectId("");
    setError("");
    setMessage("");
  };

  // Delete Project
  const handleConfirmDelete = async () => {
    if (!deletingProject || deletingBusy) return;

    setError("");

    if (transferProjectId) {
      setError(
        "Member transfer is not connected to Django yet. Select Keep Members Unassigned or cancel.",
      );
      return;
    }

    setDeletingBusy(true);

    try {
      await deleteProject(deletingProject.id);

      const success = onDeleteProject(deletingProject.id, "");

      if (!success) {
        throw new Error("Project deleted on server. Refresh the project list.");
      }

      setDeletingProject(null);
      setTransferProjectId("");

      setMessage("Project deleted successfully!");
    } catch (err) {
      console.error("Delete Project Error:", err);

      setError(err.message || "Could not delete project.");
    } finally {
      setDeletingBusy(false);
    }
  };

  // Escape Key Handler
  useEffect(() => {
    if (!editingProject && !deletingProject) return;

    const handleEscape = (event) => {
      if (event.key !== "Escape") return;

      if (editingProject && !editingBusy) {
        closeEditModal();
      }

      if (deletingProject && !deletingBusy) {
        setDeletingProject(null);
        setTransferProjectId("");
        setError("");
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [editingProject, deletingProject, editingBusy, deletingBusy]);

  // Count Project Members and Tasks
  const deletingMemberCount = deletingProject
    ? memberships.filter(
        (item) => String(item.projectId) === String(deletingProject.id),
      ).length
    : 0;

  const deletingTaskCount = deletingProject
    ? tasks.filter(
        (task) => String(task.projectId) === String(deletingProject.id),
      ).length
    : 0;

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
          maxLength={120}
          required
          onChange={(event) => setProjectName(event.target.value)}
        />

        <label htmlFor="description">Description</label>

        <textarea
          id="description"
          placeholder="Description about the project"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />

        <label htmlFor="projectDepartment">Department</label>

        <select
          id="projectDepartment"
          value={departmentId}
          required
          disabled={departmentsLoading || submitting}
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
          <p className="form-error" role="alert">
            {departmentsError}
          </p>
        )}

        <label htmlFor="projectStatus">Status</label>

        <select
          id="projectStatus"
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          {["Not Started", "In Progress", "Completed", "On Hold"].map(
            (item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ),
          )}
        </select>

        <label htmlFor="projectStartDate">Start Date (optional)</label>

        <input
          id="projectStartDate"
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />

        <label htmlFor="projectFinishDate">Finish Date (optional)</label>

        <input
          id="projectFinishDate"
          type="date"
          min={startDate || undefined}
          value={finishDate}
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
                          onClick={() => handleEdit(project)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="project-table-delete"
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
                    maxLength={120}
                    autoFocus
                    onChange={(event) =>
                      setEditedProjectName(event.target.value)
                    }
                  />

                  <label htmlFor="edit-project-description">Description</label>

                  <textarea
                    id="edit-project-description"
                    rows={5}
                    value={editedDescription}
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

            <p className="delete-warning">
              This will permanently remove {deletingTaskCount} task(s). Members
              will not be deleted.
            </p>

            <p>
              Current Members: <strong>{deletingMemberCount}</strong>
            </p>

            <label htmlFor="transfer-project">Transfer Members To</label>

            <select
              id="transfer-project"
              value={transferProjectId}
              onChange={(event) => setTransferProjectId(event.target.value)}
            >
              <option value="">Keep Members Unassigned</option>

              {projects
                .filter((project) => project.id !== deletingProject.id)
                .map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.projectName}
                  </option>
                ))}
            </select>

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
                onClick={() => {
                  setDeletingProject(null);
                  setTransferProjectId("");
                  setError("");
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                className="confirm-delete-btn"
                onClick={handleConfirmDelete}
                disabled={deletingBusy}
              >
                {deletingBusy ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CreateProject;

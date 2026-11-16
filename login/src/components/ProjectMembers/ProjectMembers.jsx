import { useEffect, useMemo, useState } from "react";
import "./ProjectMembers.css";
import { getEmployees, getTasks } from "../../services/taskApi";

function getEmployeeName(employee) {
  if (!employee) return "Unknown Employee";

  const fullName = [employee.first_name, employee.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || employee.username || `Employee #${employee.id}`;
}

function getTaskProjectId(task) {
  return typeof task.project === "object" ? task.project?.id : task.project;
}

function getAssignedEmployeeId(task) {
  return typeof task.assigned_to === "object"
    ? task.assigned_to?.id
    : task.assigned_to;
}

function ProjectMembers({
  projects,
  members,
  memberships,
  tasks,
  onAddMembership,
  onRemoveMembership,
}) {
  const [selectedMember, setSelectedMember] = useState("");
  const [selectedProject, setSelectedProject] = useState("");

  const [removingMember, setRemovingMember] = useState(null);
  const [replacementMemberId, setReplacementMemberId] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [backendTasks, setBackendTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const [assignmentError, setAssignmentError] = useState("");

  // Load real task assignments from Django
  useEffect(() => {
    const controller = new AbortController();

    async function loadAssignments() {
      try {
        const [taskData, employeeData] = await Promise.all([
          getTasks(controller.signal),
          getEmployees(controller.signal),
        ]);

        if (controller.signal.aborted) return;

        setBackendTasks(taskData);
        setEmployees(employeeData);
        setAssignmentError("");
      } catch (err) {
        if (controller.signal.aborted) return;

        console.error("Project assignment loading error:", err);

        setAssignmentError(err.message || "Failed to load task assignments.");
      } finally {
        if (!controller.signal.aborted) {
          setLoadingAssignments(false);
        }
      }
    }

    loadAssignments();

    return () => controller.abort();
  }, []);

  // Existing local members who are not assigned
  const availableMembers = members.filter(
    (member) =>
      !memberships.some((item) => String(item.memberId) === String(member.id)),
  );

  // Group real task assignees by project
  const assignedEmployeesByProject = useMemo(() => {
    const projectMap = new Map();

    for (const task of backendTasks) {
      const projectId = getTaskProjectId(task);
      const employeeId = getAssignedEmployeeId(task);

      if (projectId == null || employeeId == null) {
        continue;
      }

      const projectKey = String(projectId);
      const employeeKey = String(employeeId);

      if (!projectMap.has(projectKey)) {
        projectMap.set(projectKey, new Map());
      }

      const employeeMap = projectMap.get(projectKey);

      if (!employeeMap.has(employeeKey)) {
        const employee = employees.find(
          (item) => String(item.id) === employeeKey,
        );

        employeeMap.set(employeeKey, {
          id: employeeId,
          name: employee
            ? getEmployeeName(employee)
            : `Employee #${employeeId}`,
          taskCount: 0,
        });
      }

      employeeMap.get(employeeKey).taskCount += 1;
    }

    return projectMap;
  }, [backendTasks, employees]);

  // Existing local project membership addition
  const handleAdd = (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!selectedMember || !selectedProject) {
      setError("Please select a member and a project.");
      return;
    }

    const member = members.find(
      (item) => String(item.id) === String(selectedMember),
    );

    const project = projects.find(
      (item) => String(item.id) === String(selectedProject),
    );

    if (!member || !project) {
      setError("Selected member or project was not found.");
      return;
    }

    const success = onAddMembership(member.id, project.id);

    if (!success) {
      setError("Unable to assign this member.");
      return;
    }

    setMessage(`${member.name} added to ${project.projectName} locally.`);

    setSelectedMember("");
    setSelectedProject("");
  };

  // Open remove-member modal
  const handleOpenRemove = (member, project) => {
    setRemovingMember({
      memberId: member.id,
      memberName: member.name,
      projectId: project.id,
      projectName: project.projectName,
    });

    setReplacementMemberId("");
    setMessage("");
    setError("");
  };

  // Close remove-member modal
  const handleCloseRemove = () => {
    setRemovingMember(null);
    setReplacementMemberId("");
    setError("");
  };

  // Existing local remove/replace functionality
  const handleConfirmRemove = () => {
    if (!removingMember) return;

    setError("");

    const replacement = members.find(
      (member) => String(member.id) === String(replacementMemberId),
    );

    const success = onRemoveMembership(
      removingMember.memberId,
      removingMember.projectId,
      replacement?.id ?? "",
    );

    if (!success) {
      setError("Unable to remove or replace this member.");
      return;
    }

    if (replacement) {
      setMessage(
        `${removingMember.memberName} was replaced by ${replacement.name} locally.`,
      );
    } else {
      setMessage(`${removingMember.memberName} removed from local membership.`);
    }

    handleCloseRemove();
  };

  // Close modal with Escape
  useEffect(() => {
    if (!removingMember) return;

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        handleCloseRemove();
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [removingMember]);

  const assignedTaskCount = removingMember
    ? tasks.filter(
        (task) =>
          String(task.projectId) === String(removingMember.projectId) &&
          String(task.assignedMemberId) === String(removingMember.memberId),
      ).length
    : 0;

  return (
    <div className="project-members-page">
      <h2>Project Members</h2>

      <p className="page-subtitle">
        View task assignees and manage local project members.
      </p>

      {/* Existing Add Project Member Form */}
      <form className="project-member-form" onSubmit={handleAdd}>
        <h3>Add Project Member</h3>

        <p className="form-hint">
          Manual membership is currently stored locally. Task assignments below
          are loaded from Django.
        </p>

        <label htmlFor="select-member">Select Member</label>

        <select
          id="select-member"
          value={selectedMember}
          onChange={(event) => setSelectedMember(event.target.value)}
        >
          <option value="">Select a member</option>

          {availableMembers.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name} - {member.role}
            </option>
          ))}
        </select>

        <label htmlFor="select-project">Select Project</label>

        <select
          id="select-project"
          value={selectedProject}
          onChange={(event) => setSelectedProject(event.target.value)}
        >
          <option value="">Select a project</option>

          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.projectName}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={availableMembers.length === 0 || projects.length === 0}
        >
          + Add to Project
        </button>

        {members.length === 0 && (
          <p className="form-hint">Add local members from All Members first.</p>
        )}

        {members.length > 0 && availableMembers.length === 0 && (
          <p className="form-hint">All local members are currently assigned.</p>
        )}

        {projects.length === 0 && (
          <p className="form-hint">Create a project first.</p>
        )}
      </form>

      {/* Messages */}
      {message && (
        <p className="form-success project-member-message" role="status">
          {message}
        </p>
      )}

      {error && !removingMember && (
        <p className="form-error project-member-message" role="alert">
          {error}
        </p>
      )}

      {loadingAssignments && <p role="status">Loading assigned employees...</p>}

      {assignmentError && (
        <p className="form-error" role="alert">
          {assignmentError}
        </p>
      )}

      {/* Project Cards */}
      <div className="project-members-list">
        {projects.map((project) => {
          const projectMembers = memberships
            .filter((item) => String(item.projectId) === String(project.id))
            .map((item) =>
              members.find(
                (member) => String(member.id) === String(item.memberId),
              ),
            )
            .filter(Boolean);

          const assignedEmployees = Array.from(
            assignedEmployeesByProject.get(String(project.id))?.values() ?? [],
          );

          return (
            <div className="project-members-card" key={project.id}>
              <div className="pm-card-header">
                <h3>{project.projectName}</h3>

                <span>
                  {loadingAssignments
                    ? "Loading..."
                    : `${assignedEmployees.length} Assignees`}
                </span>
              </div>

              {/* Real Django Task Assignees */}
              <div
                style={{
                  marginBottom: "18px",
                  paddingBottom: "14px",
                  borderBottom: "1px solid #e2e8f0",
                }}
              >
                <h4 style={{ marginBottom: "12px" }}>Assigned Employees</h4>

                {!loadingAssignments &&
                  !assignmentError &&
                  assignedEmployees.length === 0 && (
                    <div className="pm-empty-state">
                      <p>No task assignees found.</p>
                    </div>
                  )}

                {assignedEmployees.map((employee) => (
                  <div className="pm-member-row" key={employee.id}>
                    <div className="pm-member-info">
                      <strong>{employee.name}</strong>

                      <small>Django User ID: {employee.id}</small>

                      <span className="pm-task-count">
                        {employee.taskCount} Assigned Tasks
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Existing Local Members */}
              <h4 style={{ marginBottom: "12px" }}>
                Manual Project Members ({projectMembers.length})
              </h4>

              {projectMembers.length === 0 ? (
                <div className="pm-empty-state">
                  <p>No manual members assigned yet.</p>

                  <small>
                    Manual members are managed separately from Django task
                    assignments.
                  </small>
                </div>
              ) : (
                projectMembers.map((member) => {
                  const memberTaskCount = tasks.filter(
                    (task) =>
                      String(task.projectId) === String(project.id) &&
                      String(task.assignedMemberId) === String(member.id),
                  ).length;

                  return (
                    <div className="pm-member-row" key={member.id}>
                      <div className="pm-member-info">
                        <strong>{member.name}</strong>
                        <small>{member.role}</small>

                        <span className="pm-task-count">
                          {memberTaskCount} Local Tasks
                        </span>
                      </div>

                      <button
                        type="button"
                        className="pm-remove-btn"
                        onClick={() => handleOpenRemove(member, project)}
                      >
                        Remove
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>

      {/* Existing Remove / Replace Modal */}
      {removingMember && (
        <div
          className="pm-modal-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseRemove();
            }
          }}
        >
          <div
            className="pm-remove-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="pm-remove-title"
          >
            <div className="pm-modal-header">
              <div>
                <h3 id="pm-remove-title">Remove Project Member</h3>

                <p>Confirm local member removal or replacement.</p>
              </div>

              <button
                type="button"
                className="pm-modal-close"
                aria-label="Close modal"
                onClick={handleCloseRemove}
              >
                ×
              </button>
            </div>

            <div className="pm-modal-body">
              <p>
                Are you sure you want to remove{" "}
                <strong>{removingMember.memberName}</strong> from{" "}
                <strong>{removingMember.projectName}</strong>?
              </p>

              <div className="pm-warning-box">
                <strong>Local Assigned Tasks: {assignedTaskCount}</strong>

                <p>
                  This action updates local membership only. Django task
                  assignments will not change.
                </p>
              </div>

              <label htmlFor="replacement-member">Replacement Member</label>

              <select
                id="replacement-member"
                value={replacementMemberId}
                onChange={(event) => setReplacementMemberId(event.target.value)}
              >
                <option value="">No One - Keep Local Tasks Unassigned</option>

                {availableMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} - {member.role}
                  </option>
                ))}
              </select>

              {error && (
                <p className="form-error" role="alert">
                  {error}
                </p>
              )}
            </div>

            <div className="pm-modal-footer">
              <button
                type="button"
                className="pm-cancel-btn"
                onClick={handleCloseRemove}
              >
                Cancel
              </button>

              <button
                type="button"
                className="pm-confirm-btn"
                onClick={handleConfirmRemove}
              >
                Confirm Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectMembers;

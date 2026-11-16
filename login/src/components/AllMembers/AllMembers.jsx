import { useState } from "react";
import "./AllMembers.css";

const roles = ["Frontend", "Backend", "UI/UX", "DevOps", "QA", "Cybersecurity"];

function AllMembers({ members, onAddMember }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    const memberName = name.trim();

    if (!memberName || !role) {
      setError("Please enter a name and select a role.");
      return;
    }

    const alreadyExists = members.some(
      (member) => member.name.toLowerCase() === memberName.toLowerCase(),
    );

    if (alreadyExists) {
      setError("A member with this name already exists.");
      return;
    }

    const newMember = {
      id: crypto.randomUUID(),
      name: memberName,
      role,
    };

    onAddMember(newMember);

    setName("");
    setRole("");
    setMessage(`${memberName} added successfully!`);
  };

  return (
    <div className="all-members-page">
      <h2>All Members</h2>
      <p className="page-subtitle">
        Create team members before assigning them to projects.
      </p>

      <form className="member-form" onSubmit={handleSubmit}>
        <h3>Add New Member</h3>

        <label htmlFor="member-name">Member Name</label>
        <input
          id="member-name"
          type="text"
          placeholder="Enter member name"
          value={name}
          maxLength={100}
          onChange={(event) => setName(event.target.value)}
        />

        <label htmlFor="member-role">Role</label>
        <select
          id="member-role"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          <option value="">Select Role</option>

          {roles.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <button type="submit">+ Add Member</button>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        {message && (
          <p className="form-success" role="status">
            {message}
          </p>
        )}
      </form>

      <div className="members-table-card">
        <h3>Team Members ({members.length})</h3>

        <div className="members-table-wrapper">
          <table className="members-table">
            <thead>
              <tr>
                <th>SL</th>
                <th>Name</th>
                <th>Role</th>
              </tr>
            </thead>

            <tbody>
              {members.length === 0 ? (
                <tr>
                  <td colSpan="3">No members added yet.</td>
                </tr>
              ) : (
                members.map((member, index) => (
                  <tr key={member.id}>
                    <td>{index + 1}</td>
                    <td>{member.name}</td>
                    <td>{member.role}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AllMembers;

import { useEffect, useState } from "react";
import { getEmployees } from "../../services/taskApi";
import "./AllMembers.css";

function AllMembers() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadMembers() {
      setLoading(true);
      setError("");

      try {
        const data = await getEmployees(controller.signal);

        if (controller.signal.aborted) return;

        const normalizedMembers = data.map((employee) => ({
          id: employee.id,
          username: employee.username || `User #${employee.id}`,
          role: "Employee",
        }));

        setMembers(normalizedMembers);
      } catch (err) {
        if (controller.signal.aborted) return;

        setMembers([]);
        setError(err.message || "Failed to load members.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadMembers();

    return () => controller.abort();
  }, [refreshKey]);

  const handleRefresh = () => {
    setRefreshKey((previous) => previous + 1);
  };

  return (
    <div className="all-members-page">
      <h2>All Members</h2>

      <p className="page-subtitle">
        View all registered employees from the backend.
      </p>

      <div className="members-table-card">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <h3>
            Team Members ({loading ? "..." : error ? "—" : members.length})
          </h3>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            style={{
              padding: "9px 16px",
              backgroundColor: "#2563eb",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Loading..." : "Refresh Members"}
          </button>
        </div>

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="members-table-wrapper">
          <table className="members-table">
            <thead>
              <tr>
                <th>SL</th>
                <th>Username</th>
                <th>Role</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3" role="status">
                    Loading members from backend...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan="3">Unable to load members. Please try again.</td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan="3">No registered employees found.</td>
                </tr>
              ) : (
                members.map((member, index) => (
                  <tr key={member.id}>
                    <td>{index + 1}</td>
                    <td>{member.username}</td>
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

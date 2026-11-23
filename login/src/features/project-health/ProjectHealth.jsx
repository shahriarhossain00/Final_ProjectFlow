import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import { getProjectHealth } from "./projectHealthApi";
import "./ProjectHealth.css";

function ProjectHealth({
  projectId,
  projectName,
  onClose,
  initialReport = null,
}) {
  const [fetchedReport, setFetchedReport] = useState(null);
  const [error, setError] = useState("");

  const hasInitialReport =
    initialReport != null &&
    String(initialReport.project_id) === String(projectId);

  const hasFetchedReport =
    fetchedReport != null &&
    String(fetchedReport.project_id) === String(projectId);

  const report = hasInitialReport
    ? initialReport
    : hasFetchedReport
      ? fetchedReport
      : null;

  useEffect(() => {
    if (hasInitialReport) return undefined;

    let active = true;

    getProjectHealth(projectId)
      .then((data) => {
        if (active) {
          setFetchedReport(data);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Unable to load project health.");
        }
      });

    return () => {
      active = false;
    };
  }, [projectId, hasInitialReport]);

  const loading = !report && !error;

  const score = report?.health?.score;
  const level = report?.health?.level;

  const normalizedScore =
    typeof score === "number" && Number.isFinite(score)
      ? Math.min(100, Math.max(0, score))
      : 0;

  const normalizedLevel = String(level || "")
    .trim()
    .toLowerCase();

  const riskClass =
    normalizedLevel === "at risk"
      ? "at-risk"
      : normalizedLevel === "healthy"
        ? "healthy"
        : "unknown";

  return (
    <section className="project-health-panel">
      <div className="project-health-header">
        <div>
          <h3>{projectName} — Project Health</h3>
          <p>AI-powered project health analysis</p>
        </div>

        <button
          type="button"
          className="project-health-close"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      {loading && (
        <p className="project-health-loading" role="status">
          Analyzing project health...
        </p>
      )}

      {!loading && error && !report && (
        <div className="project-health-error" role="alert">
          {error}
        </div>
      )}

      {report && (
        <div className="project-health-content">
          <div className="project-health-summary">
            <div className="project-health-score">
              <span>Health Score</span>
              <strong>{score}/100</strong>
            </div>

            <div className="project-health-risk">
              <span>Risk Level</span>
              <strong className={`project-health-badge ${riskClass}`}>
                {level}
              </strong>
            </div>
          </div>

          <div
            className="project-health-progress"
            role="progressbar"
            aria-label="Project health score"
            aria-valuenow={normalizedScore}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`project-health-progress-fill ${riskClass}`}
              style={{ width: `${normalizedScore}%` }}
            />
          </div>

          <div className="project-health-analysis">
            <h4>AI Health Analysis</h4>

            <div className="project-health-analysis-text">
              <ReactMarkdown skipHtml>{report.analysis}</ReactMarkdown>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ProjectHealth;

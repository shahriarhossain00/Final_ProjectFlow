import { useEffect, useRef, useState } from "react";
import { getProjectChatSummary } from "../../services/chatboxApi";
import "./ChatSummaryModal.css";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
export default function ChatSummaryModal({ projectId, onClose }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  const dialogRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog && !dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog?.open) {
        dialog.close();
      }
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const generateSummary = async () => {
      setLoading(true);
      setError("");
      setSummary(null);

      try {
        const data = await getProjectChatSummary(projectId, controller.signal);

        if (!controller.signal.aborted) {
          setSummary(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to generate chat summary.",
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    generateSummary();

    return () => controller.abort();
  }, [projectId, attempt]);

  const handleRetry = () => {
    if (!loading) {
      setAttempt((previous) => previous + 1);
    }
  };

  const summaryContent =
    typeof summary === "string"
      ? summary
      : typeof summary?.summary === "string"
        ? summary.summary
        : JSON.stringify(summary, null, 2);

  return (
    <dialog
      ref={dialogRef}
      className="chat-summary-modal"
      aria-labelledby="chat-summary-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="chat-summary-header">
        <div>
          <h2 id="chat-summary-title">✦ AI Chat Summary</h2>
          <p>Project team conversation overview</p>
        </div>

        <button
          type="button"
          className="chat-summary-close"
          onClick={onClose}
          aria-label="Close summary"
        >
          ×
        </button>
      </div>

      <div className="chat-summary-body" aria-busy={loading}>
        {loading ? (
          <div className="chat-summary-loading" role="status">
            <div className="chat-summary-spinner" />
            <h3>Generating chat summary...</h3>
            <p>AI is analyzing your project conversation.</p>
          </div>
        ) : error ? (
          <div className="chat-summary-error" role="alert">
            <h3>Unable to generate summary</h3>
            <p>{error}</p>
          </div>
        ) : (
          <div className="chat-summary-result">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {summaryContent || "No summary available."}
            </ReactMarkdown>
          </div>
        )}
      </div>

      <div className="chat-summary-footer">
        <span className="chat-summary-disclaimer">
          AI-generated content may contain inaccuracies.
        </span>

        <div className="chat-summary-actions">
          <button
            type="button"
            className="chat-summary-retry"
            onClick={handleRetry}
            disabled={loading}
          >
            {error ? "Try Again" : "Regenerate"}
          </button>

          <button type="button" className="chat-summary-done" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}

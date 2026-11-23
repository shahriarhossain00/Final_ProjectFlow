import { useEffect, useRef, useState } from "react";
import { dismissNotification, getNotifications } from "./notificationApi";
import "./NotificationBell.css";

function formatNotificationTime(value) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString();
}

function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [count, setCount] = useState(0);
  const [nextPage, setNextPage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [dismissingId, setDismissingId] = useState(null);

  const containerRef = useRef(null);
  const requestIdRef = useRef(0);

  async function loadNotifications({ append = false, url = null } = {}) {
    const requestId = ++requestIdRef.current;

    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }

    setError("");

    try {
      const data = await getNotifications(url);

      if (requestId !== requestIdRef.current) return;

      setNotifications((current) => {
        if (!append) return data.results;

        const existingIds = new Set(current.map((item) => item.id));

        return [
          ...current,
          ...data.results.filter((item) => !existingIds.has(item.id)),
        ];
      });

      setCount(data.count);
      setNextPage(data.next);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;

      setError(err.message || "Failed to load notifications.");
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    }
  }

  useEffect(() => {
    let cancelled = false;
    const requestId = ++requestIdRef.current;

    async function fetchInitialNotifications() {
      try {
        const data = await getNotifications();

        if (cancelled || requestId !== requestIdRef.current) return;

        setNotifications(data.results);
        setCount(data.count);
        setNextPage(data.next);
      } catch (err) {
        if (cancelled || requestId !== requestIdRef.current) return;

        setError(err.message || "Failed to load notifications.");
      } finally {
        if (!cancelled && requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    }

    fetchInitialNotifications();

    return () => {
      cancelled = true;
      requestIdRef.current += 1;
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event) {
      if (!containerRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  async function handleDismiss(notificationId) {
    if (dismissingId !== null) return;

    setDismissingId(notificationId);
    setError("");

    try {
      await dismissNotification(notificationId);

      requestIdRef.current += 1;

      setNotifications((current) =>
        current.filter((item) => item.id !== notificationId),
      );

      setCount((current) => Math.max(0, current - 1));
    } catch (err) {
      setError(err.message || "Failed to dismiss notification.");
    } finally {
      setDismissingId(null);
    }
  }

  return (
    <div className="notification-container" ref={containerRef}>
      <button
        type="button"
        className="notification-trigger"
        aria-label={`Notifications${count ? `, ${count} total` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((current) => !current)}
      >
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>

        {count > 0 && (
          <span className="notification-count">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          className="notification-dropdown"
          role="dialog"
          aria-label="Notifications"
        >
          <div className="notification-header">
            <div>
              <h2>Notifications</h2>
              <p>{count} notifications</p>
            </div>

            <button
              type="button"
              className="notification-refresh"
              onClick={() => loadNotifications()}
              disabled={isLoading || isLoadingMore}
            >
              Refresh
            </button>
          </div>

          <div className="notification-list">
            {isLoading ? (
              <p className="notification-state">Loading notifications...</p>
            ) : notifications.length === 0 ? (
              <p className="notification-state">No notifications yet.</p>
            ) : (
              notifications.map((notification) => (
                <article className="notification-item" key={notification.id}>
                  <div className="notification-item-content">
                    <h3>{notification.task_title || "Notification"}</h3>
                    <p>{notification.message || "No message available."}</p>

                    <time dateTime={notification.created_at || undefined}>
                      {formatNotificationTime(notification.created_at)}
                    </time>
                  </div>

                  <button
                    type="button"
                    className="notification-dismiss"
                    onClick={() => handleDismiss(notification.id)}
                    disabled={dismissingId !== null}
                    aria-label={`Dismiss notification ${notification.id}`}
                  >
                    {dismissingId === notification.id
                      ? "Dismissing..."
                      : "Dismiss"}
                  </button>
                </article>
              ))
            )}
          </div>

          {error && (
            <p className="notification-error" role="alert">
              {error}
            </p>
          )}

          {nextPage && !isLoading && (
            <button
              type="button"
              className="notification-load-more"
              onClick={() => loadNotifications({ append: true, url: nextPage })}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "Loading..." : "Load more"}
            </button>
          )}
        </section>
      )}
    </div>
  );
}

export default NotificationBell;

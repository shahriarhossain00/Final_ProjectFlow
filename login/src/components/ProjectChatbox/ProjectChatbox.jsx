import { useCallback, useEffect, useRef, useState } from "react";
import {
  getProjectChatbox,
  sendChatMessage,
  getChatUsers,
} from "../../services/chatboxApi";
import "./ProjectChatbox.css";

export default function ProjectChatbox({
  projectId,
  currentUserId,
  projectName = "Project",
}) {
  const [chatbox, setChatbox] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [chatUsers, setChatUsers] = useState({});

  const bottomRef = useRef(null);
  const sendingRef = useRef(false);

  // Fetch messages for the selected project.
  const loadMessages = useCallback(
    async (signal, silent = false) => {
      if (!projectId) return;

      if (!silent) {
        setLoading(true);
      }

      try {
        const data = await getProjectChatbox(projectId, signal);

        if (signal?.aborted) return;

        setChatbox(data);
        setError("");
      } catch (err) {
        if (signal?.aborted || err?.name === "AbortError") {
          return;
        }

        setError(err.message || "Unable to load messages.");
      } finally {
        if (!signal?.aborted && !silent) {
          setLoading(false);
        }
      }
    },
    [projectId],
  );

  // Load messages and refresh every 5 seconds.
  useEffect(() => {
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      loadMessages(controller.signal);
    }, 0);

    const intervalId = setInterval(() => {
      if (!sendingRef.current) {
        loadMessages(controller.signal, true);
      }
    }, 5000);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, [loadMessages]);

  // Load employee usernames from the existing API.
  useEffect(() => {
    const controller = new AbortController();

    async function loadChatUsers() {
      try {
        const users = await getChatUsers(controller.signal);

        if (controller.signal.aborted) return;

        const userMap = Object.fromEntries(
          users
            .filter((user) => user?.id != null)
            .map((user) => [
              String(user.id),
              user.username || `User #${user.id}`,
            ]),
        );

        setChatUsers(userMap);
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error("Failed to load chat usernames:", err);
        }
      }
    }

    loadChatUsers();

    return () => controller.abort();
  }, []);

  const messages = chatbox?.messages ?? [];

  // Scroll to the latest message.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [messages.length]);

  // Send a new message.
  async function handleSend(event) {
    event.preventDefault();

    const content = message.trim();

    if (!content || !chatbox?.id || sendingRef.current) {
      return;
    }

    sendingRef.current = true;
    setSending(true);
    setError("");

    try {
      await sendChatMessage(chatbox.id, content);

      setMessage("");

      // Refresh immediately after sending.
      await loadMessages(undefined, true);
    } catch (err) {
      setError(err.message || "Failed to send message.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  // Resolve the message sender's user ID.
  function getSenderId(sender) {
    if (sender && typeof sender === "object") {
      return sender.id;
    }

    return sender;
  }

  // Resolve the sender's display name.
  function getSenderName(item, senderId) {
    const directUsername =
      item.sender_username ||
      item.sender_name ||
      (typeof item.sender === "object" ? item.sender?.username : null);

    if (directUsername) {
      return directUsername;
    }

    if (senderId != null) {
      return chatUsers[String(senderId)] || `User #${senderId}`;
    }

    return "Unknown User";
  }

  return (
    <section className="project-chatbox">
      <header className="project-chatbox__header">
        <div>
          <h3>Project Chat</h3>
          <p>{projectName}</p>
        </div>

        <span className="project-chatbox__status">Group Chat</span>
      </header>

      <div
        className="project-chatbox__messages"
        role="log"
        aria-label="Project messages"
      >
        {loading ? (
          <div className="project-chatbox__empty">Loading messages...</div>
        ) : !chatbox ? (
          <div className="project-chatbox__empty">
            {error || "Chatbox unavailable."}
          </div>
        ) : messages.length === 0 ? (
          <div className="project-chatbox__empty">
            No messages yet. Start the conversation!
          </div>
        ) : (
          messages.map((item) => {
            const senderId = getSenderId(item.sender);

            const isMine =
              currentUserId != null &&
              senderId != null &&
              String(senderId) === String(currentUserId);

            const senderName = isMine ? "You" : getSenderName(item, senderId);

            return (
              <div
                key={item.id}
                className={`project-chatbox__message ${
                  isMine ? "mine" : "other"
                }`}
              >
                <span className="project-chatbox__sender">{senderName}</span>

                <div className="project-chatbox__bubble">{item.content}</div>
              </div>
            );
          })
        )}

        <div ref={bottomRef} />
      </div>

      {error && chatbox && (
        <p className="project-chatbox__error" role="alert">
          {error}
        </p>
      )}

      <form className="project-chatbox__form" onSubmit={handleSend}>
        <input
          type="text"
          value={message}
          onChange={(event) => {
            setMessage(event.target.value);
          }}
          placeholder="Write a message..."
          maxLength={2000}
          disabled={!chatbox || sending}
          aria-label="Message"
        />

        <button type="submit" disabled={!chatbox || sending || !message.trim()}>
          {sending ? "Sending..." : "Send"}
        </button>
      </form>
    </section>
  );
}

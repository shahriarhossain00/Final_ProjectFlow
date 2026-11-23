import { useEffect, useRef, useState } from "react";
import "./AIChatbot.css";

const INITIAL_MESSAGES = [
  {
    id: "welcome",
    role: "assistant",
    content:
      "Hello! I'm your ProjectFlow AI Assistant. How can I help you today?",
  },
];

export default function AIChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef(null);
  const timeoutRef = useRef(null);
  const inputRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [isOpen, messages, isLoading]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    inputRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleCloseChat = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleSendMessage = (event) => {
    event.preventDefault();

    const trimmedMessage = input.trim();

    if (!trimmedMessage || isLoading) return;

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmedMessage,
    };

    setMessages((previous) => [...previous, userMessage]);
    setInput("");
    setIsLoading(true);

    timeoutRef.current = window.setTimeout(() => {
      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "This is a demo response. The ProjectFlow AI backend is not connected yet.",
      };

      setMessages((previous) => [...previous, assistantMessage]);
      setIsLoading(false);
      timeoutRef.current = null;
    }, 800);
  };

  const handleClearChat = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    setMessages(INITIAL_MESSAGES);
    setInput("");
    setIsLoading(false);
    inputRef.current?.focus();
  };

  return (
    <div className="ai-chatbot">
      {isOpen && (
        <section
          className="ai-chatbot__window"
          role="dialog"
          aria-label="ProjectFlow AI Assistant"
        >
          <header className="ai-chatbot__header">
            <div className="ai-chatbot__identity">
              <span className="ai-chatbot__avatar" aria-hidden="true">
                ✦
              </span>

              <div>
                <h3>ProjectFlow AI</h3>
                <p>Demo mode — Backend not connected</p>
              </div>
            </div>

            <div className="ai-chatbot__header-actions">
              <button
                type="button"
                className="ai-chatbot__clear"
                onClick={handleClearChat}
                aria-label="Clear chat"
                title="Clear chat"
              >
                ↺
              </button>

              <button
                type="button"
                className="ai-chatbot__close"
                onClick={handleCloseChat}
                aria-label="Close AI chatbot"
              >
                ×
              </button>
            </div>
          </header>

          <div className="ai-chatbot__messages" role="log" aria-live="polite">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`ai-chatbot__message ai-chatbot__message--${message.role}`}
              >
                <div className="ai-chatbot__bubble">{message.content}</div>
              </div>
            ))}

            {isLoading && (
              <div className="ai-chatbot__message ai-chatbot__message--assistant">
                <div
                  className="ai-chatbot__bubble ai-chatbot__typing"
                  role="status"
                  aria-label="Assistant is typing"
                >
                  <span aria-hidden="true" />
                  <span aria-hidden="true" />
                  <span aria-hidden="true" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form className="ai-chatbot__composer" onSubmit={handleSendMessage}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask ProjectFlow AI..."
              aria-label="Ask ProjectFlow AI"
              maxLength={2000}
              disabled={isLoading}
            />

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              aria-label="Send message"
            >
              ➤
            </button>
          </form>
        </section>
      )}

      <button
        ref={triggerRef}
        type="button"
        className="ai-chatbot__trigger"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-label={isOpen ? "Close AI chatbot" : "Open AI chatbot"}
        aria-expanded={isOpen}
      >
        {isOpen ? "×" : "✦"}
      </button>
    </div>
  );
}

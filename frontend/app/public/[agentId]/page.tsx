"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import styles from "../../chat/chat.module.css";

const CHAT_API_URL =
  process.env.NEXT_PUBLIC_CHAT_URL || "http://localhost:8083";
const AGENT_API_URL =
  process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8082";

interface Message {
  role: string;
  content: string;
  createdAt: string;
}

export default function PublicChatPage() {
  const params = useParams();
  const agentId = params?.agentId as string;
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // Fetch agent name
    const fetchAgent = async () => {
      try {
        const response = await fetch(
          `${AGENT_API_URL}/agents/public/${agentId}`,
        );
        if (response.ok) {
          const data = await response.json();
          setAgentName(data.data.name);
        } else {
          setError("Agent not found");
        }
      } catch (err) {
        console.error("Failed to fetch agent:", err);
        setError("Failed to load agent");
      }
    };

    if (agentId) {
      fetchAgent();
    }
  }, [agentId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError("");
    const userMessage = input;

    try {
      // Add user message immediately for better UX
      setMessages((prev) => [
        ...prev,
        {
          role: "user",
          content: userMessage,
          createdAt: new Date().toISOString(),
        },
      ]);

      // Add loading indicator
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "...",
          createdAt: new Date().toISOString(),
        },
      ]);

      setInput("");

      const response = await fetch(`${CHAT_API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId,
          message: userMessage,
          conversationId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();

      // Replace loading indicator with actual response
      setMessages((prev) => [
        ...prev.slice(0, -1), // Remove loading message
        {
          role: "assistant",
          content: data.data.reply,
          createdAt: new Date().toISOString(),
        },
      ]);

      // Set conversation ID for future messages
      setConversationId(data.data.conversationId);
    } catch (err) {
      // Remove loading indicator on error
      setMessages((prev) => prev.slice(0, -1));
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>{agentName || "Chat"}</h1>
        <Link href="/" className={styles.back}>
          Home
        </Link>
      </div>

      <div className={styles.chat}>
        <div className={styles.messages}>
          {messages.length === 0 && (
            <div className={styles.empty}>
              Start a conversation with {agentName || "the agent"}
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={idx} className={`${styles.message} ${styles[msg.role]}`}>
              <div className={styles.content}>{msg.content}</div>
              <div className={styles.time}>
                {new Date(msg.createdAt).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSendMessage} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          <div className={styles.inputGroup}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              disabled={loading}
            />
            <button type="submit" disabled={loading}>
              {loading ? "..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

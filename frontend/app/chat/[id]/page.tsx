"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import styles from "../chat.module.css";

const CHAT_API_URL =
  process.env.NEXT_PUBLIC_CHAT_URL || "http://localhost:8083";
const AGENT_API_URL =
  process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8082";

interface Message {
  role: string;
  content: string;
  createdAt: string;
}

export default function ChatPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const agentId = params?.id as string;
  const conversationIdParam = searchParams?.get("conversation");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(
    conversationIdParam || null,
  );
  const [agentName, setAgentName] = useState("");
  const [error, setError] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(!!conversationIdParam);

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
        }
      } catch (err) {
        console.error("Failed to fetch agent:", err);
      }
    };

    if (agentId) {
      fetchAgent();
    }
  }, [agentId]);

  useEffect(() => {
    // Load existing conversation messages if conversation ID is provided
    const loadConversation = async () => {
      if (!conversationIdParam) {
        setLoadingMessages(false);
        return;
      }

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(
          `${CHAT_API_URL}/conversations/${conversationIdParam}/messages`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          },
        );

        if (response.ok) {
          const data = await response.json();
          const loadedMessages = (data.data || []).map((msg: any) => ({
            role: msg.role,
            content: msg.content,
            createdAt: msg.created_at,
          }));
          setMessages(loadedMessages);
        }
      } catch (err) {
        console.error("Failed to load conversation:", err);
      } finally {
        setLoadingMessages(false);
      }
    };

    loadConversation();
  }, [conversationIdParam]);

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
        <a href="/dashboard" className={styles.back}>
          Back to Dashboard
        </a>
      </div>

      <div className={styles.chat}>
        <div className={styles.messages}>
          {loadingMessages && (
            <div className={styles.empty}>Loading conversation...</div>
          )}
          {!loadingMessages && messages.length === 0 && (
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
              disabled={loading || loadingMessages}
            />
            <button type="submit" disabled={loading || loadingMessages}>
              {loading ? "..." : "Send"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "./conversations.module.css";

const CHAT_API_URL =
  process.env.NEXT_PUBLIC_CHAT_URL || "http://localhost:8083";
const AGENT_API_URL =
  process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8082";

interface Conversation {
  id: string;
  startedAt: string;
  firstMessage?: string;
  messageCount?: number;
}

interface Agent {
  id: string;
  name: string;
}

function ConversationsContent() {
  const searchParams = useSearchParams();
  const agentId = searchParams?.get("id");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError("");
        setLoading(true);

        const token = localStorage.getItem("token");
        if (!token) {
          window.location.href = "/auth/login";
          return;
        }

        if (!agentId || agentId.trim() === "") {
          setError("Agent ID not found");
          setLoading(false);
          return;
        }

        console.log("Fetching conversations for agent:", agentId);

        // Fetch agent details and conversations in parallel
        const [agentResponse, conversationResponse] = await Promise.all([
          fetch(`${AGENT_API_URL}/agents/${agentId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch(`${CHAT_API_URL}/conversations/${agentId}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        console.log("Agent Response:", agentResponse.status);
        console.log("Conversation Response:", conversationResponse.status);

        if (!agentResponse.ok) {
          throw new Error(`Failed to fetch agent (${agentResponse.status})`);
        }

        if (!conversationResponse.ok) {
          throw new Error(
            `Failed to fetch conversations (${conversationResponse.status})`,
          );
        }

        const agentData = await agentResponse.json();
        setAgent(agentData.data);

        const conversationData = await conversationResponse.json();
        setConversations(conversationData.data || []);
        setError("");
      } catch (err) {
        console.error("Error fetching data:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    // Only fetch when: 1) hydrated, 2) agentId is available and not empty
    if (isHydrated && agentId && agentId.trim() !== "") {
      fetchData();
    } else if (isHydrated && !agentId) {
      setLoading(false);
      setError("Agent ID not provided");
    }
  }, [agentId, isHydrated]);

  if (loading) {
    return <div style={{ padding: "2rem" }}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>Conversations</h1>
          {agent && <p className={styles.agentName}>Agent: {agent.name}</p>}
        </div>
        <Link href="/dashboard" className={styles.back}>
          Back to Dashboard
        </Link>
      </header>

      <main className={styles.main}>
        {error && <div className={styles.error}>{error}</div>}

        {conversations.length === 0 ? (
          <div className={styles.empty}>
            <p>No conversations yet.</p>
            <Link href={`/chat/${agentId}`} className={styles.button}>
              Start a Conversation
            </Link>
          </div>
        ) : (
          <div className={styles.list}>
            {conversations.map((conv) => (
              <div key={conv.id} className={styles.conversationCard}>
                <div className={styles.cardContent}>
                  <h3>
                    {conv.firstMessage
                      ? conv.firstMessage.substring(0, 60) +
                        (conv.firstMessage.length > 60 ? "..." : "")
                      : "Conversation"}
                  </h3>
                  <p className={styles.date}>
                    Started: {new Date(conv.startedAt).toLocaleString()}
                  </p>
                </div>
                <Link
                  href={`/chat/${agentId}?conversation=${conv.id}`}
                  className={styles.viewButton}
                >
                  View
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={<div style={{ padding: "2rem" }}>Loading...</div>}>
      <ConversationsContent />
    </Suspense>
  );
}

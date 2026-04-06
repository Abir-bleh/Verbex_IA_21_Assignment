"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./dashboard.module.css";

const AGENT_API_URL =
  process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8082";

interface AgentAnalytics {
  totalConversations: number;
  totalMessages: number;
  lastActivityAt: string | null;
}

interface Agent {
  id: string;
  name: string;
  model: string;
  created_at: string;
  analytics?: AgentAnalytics;
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loadingAnalytics, setLoadingAnalytics] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        // Ensure we're running on the client
        if (typeof window === "undefined") return;

        setError(""); // Clear any previous errors
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          window.location.href = "/auth/login";
          return;
        }

        const response = await fetch(`${AGENT_API_URL}/agents`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          // Token is invalid, redirect to login
          window.location.href = "/auth/login";
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to fetch agents");
        }

        const data = await response.json();
        const agentList = data.data || [];
        setAgents(agentList);
        setError("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  // Lazy load analytics for each agent - parallelized with early return to avoid re-running
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || agents.length === 0) return;

    // Build list of agents that need analytics
    const agentsNeedingAnalytics = agents.filter(
      (a) => !a.analytics && !loadingAnalytics.has(a.id),
    );

    if (agentsNeedingAnalytics.length === 0) return;

    // Mark all as loading
    setLoadingAnalytics((prev) => {
      const updated = new Set(prev);
      agentsNeedingAnalytics.forEach((a) => updated.add(a.id));
      return updated;
    });

    // Fetch all analytics in parallel
    Promise.all(
      agentsNeedingAnalytics.map(async (agent) => {
        try {
          const analyticsResponse = await fetch(
            `${AGENT_API_URL}/agents/${agent.id}/analytics`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            },
          );
          if (analyticsResponse.ok) {
            const analyticsData = await analyticsResponse.json();
            console.log(`Analytics for ${agent.id}:`, analyticsData);
            return { agentId: agent.id, data: analyticsData.data };
          } else {
            console.error(
              `Failed to fetch analytics for ${agent.id}: ${analyticsResponse.status}`,
            );
          }
        } catch (err) {
          console.error(
            `Failed to fetch analytics for agent ${agent.id}:`,
            err,
          );
        }
        return null;
      }),
    ).then((results) => {
      // Update all agents at once
      const updates = results.filter((r) => r !== null);
      if (updates.length > 0) {
        setAgents((prev) => {
          let updated = [...prev];
          updates.forEach((update) => {
            updated = updated.map((a) =>
              a.id === update.agentId ? { ...a, analytics: update.data } : a,
            );
          });
          return updated;
        });
      }

      // Clear loading state for all agents
      setLoadingAnalytics((prev) => {
        const updated = new Set(prev);
        agentsNeedingAnalytics.forEach((a) => updated.delete(a.id));
        return updated;
      });
    });
  }, [agents, loadingAnalytics, AGENT_API_URL]);

  const handleDelete = async (agentId: string, agentName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete "${agentName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/auth/login";
        return;
      }

      const response = await fetch(`${AGENT_API_URL}/agents/${agentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // 204 No Content is a success response for DELETE
      if (response.status !== 204 && !response.ok) {
        throw new Error("Failed to delete agent");
      }

      // Remove agent from state
      setAgents(agents.filter((a) => a.id !== agentId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete agent");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/auth/login";
  };

  const formatLastActivity = (lastActivityAt: string | null) => {
    if (!lastActivityAt) return "Never";
    const date = new Date(lastActivityAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return <div className={styles.container}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Dashboard</h1>
        <div className={styles.headerActions}>
          <Link href="/settings/api-keys" className={styles.apiKeysBtn}>
            API Keys
          </Link>
          <button onClick={handleLogout} className={styles.logout}>
            Logout
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Your Agents</h2>
            <Link href="/agents/create" className={styles.button}>
              Create Agent
            </Link>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {agents.length === 0 ? (
            <p className={styles.empty}>
              No agents yet. Create one to get started!
            </p>
          ) : (
            <div className={styles.grid}>
              {agents.map((agent) => {
                return (
                  <div key={agent.id} className={styles.card}>
                    <h3>{agent.name}</h3>
                    <p className={styles.model}>{agent.model}</p>
                    <p className={styles.date}>
                      Created: {new Date(agent.created_at).toLocaleDateString()}
                    </p>

                    {agent.analytics ? (
                      <div className={styles.analyticsSection}>
                        <h4 className={styles.analyticsTitle}>Analytics</h4>
                        <div className={styles.analyticsStat}>
                          <span className={styles.statLabel}>
                            Conversations:
                          </span>
                          <span className={styles.statValue}>
                            {agent.analytics.totalConversations}
                          </span>
                        </div>
                        <div className={styles.analyticsStat}>
                          <span className={styles.statLabel}>Messages:</span>
                          <span className={styles.statValue}>
                            {agent.analytics.totalMessages}
                          </span>
                        </div>
                        <div className={styles.analyticsStat}>
                          <span className={styles.statLabel}>
                            Last Activity:
                          </span>
                          <span className={styles.statValue}>
                            {formatLastActivity(agent.analytics.lastActivityAt)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className={styles.analyticsSection}>
                        <h4 className={styles.analyticsTitle}>Analytics</h4>
                        <p className={styles.loadingAnalytics}>Loading...</p>
                      </div>
                    )}

                    <div className={styles.urlSection}>
                      <label className={styles.urlLabel}>Share URL:</label>
                      <div className={styles.urlDisplay}>
                        <input
                          type="text"
                          value={`${window.location.origin}/public/${agent.id}`}
                          readOnly
                          className={styles.urlInput}
                        />
                        <button
                          onClick={() => {
                            const url = `${window.location.origin}/public/${agent.id}`;
                            navigator.clipboard.writeText(url);
                            alert("URL copied to clipboard!");
                          }}
                          className={styles.copyBtn}
                        >
                          Copy
                        </button>
                      </div>
                    </div>

                    <div className={styles.actions}>
                      <Link href={`/chat/${agent.id}`} className={styles.link}>
                        Chat
                      </Link>
                      <Link
                        href={`/agents/conversations?id=${agent.id}`}
                        className={styles.link}
                      >
                        Conversations
                      </Link>
                      <button
                        onClick={() => handleDelete(agent.id, agent.name)}
                        className={styles.deleteBtn}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

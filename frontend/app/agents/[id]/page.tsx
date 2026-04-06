"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import styles from "../agents.module.css";

const AGENT_API_URL =
  process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8082";

interface Agent {
  id: string;
  name: string;
  system_prompt: string;
  temperature: number;
  model: string;
  webhook_url?: string;
}

const FREE_MODELS = [
  {
    label: "Claude 3 Haiku (Fast & Free)",
    value: "anthropic/claude-3-haiku",
  },
  { label: "Mistral 7B Instruct", value: "mistralai/mistral-7b-instruct" },
  {
    label: "LLaMA 2 7B Chat",
    value: "meta-llama/llama-2-7b-chat",
  },
  {
    label: "Neural Chat 7B",
    value: "intel/neural-chat-7b",
  },
  {
    label: "Nous Hermes 2 Mistral 7B",
    value: "nousresearch/nous-hermes-2-mistral-7b-instruct",
  },
  {
    label: "Toppy M 7B",
    value: "undi95/toppy-m-7b",
  },
];

export default function AgentDetailPage() {
  const params = useParams();
  const agentId = params?.id as string;
  const [agent, setAgent] = useState<Agent | null>(null);
  const [formData, setFormData] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          window.location.href = "/auth/login";
          return;
        }

        const response = await fetch(`${AGENT_API_URL}/agents/${agentId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch agent");
        }

        const data = await response.json();
        setAgent(data.data);
        setFormData(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (agentId) {
      fetchAgent();
    }
  }, [agentId]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        [name]: name === "temperature" ? parseFloat(value) : value,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${AGENT_API_URL}/agents/${agentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formData.name,
          system_prompt: formData.system_prompt,
          temperature: formData.temperature,
          model: formData.model,
          webhook_url: formData.webhook_url || null,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update agent");
      }

      const data = await response.json();
      setAgent(data.data);
      setFormData(data.data);
      setSuccess("Agent updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this agent? This cannot be undone.",
      )
    ) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(`${AGENT_API_URL}/agents/${agentId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete agent");
      }

      window.location.href = "/dashboard";
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  if (loading) {
    return <div style={{ padding: "2rem" }}>Loading...</div>;
  }

  if (!formData) {
    return <div style={{ padding: "2rem" }}>Agent not found</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Agent Settings</h1>
        <Link href="/dashboard" className={styles.back}>
          Back to Dashboard
        </Link>
      </div>

      <div className={styles.formContainer}>
        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Agent Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter agent name"
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="system_prompt">System Prompt</label>
            <textarea
              id="system_prompt"
              name="system_prompt"
              value={formData.system_prompt}
              onChange={handleInputChange}
              placeholder="Define the agent's behavior and personality"
              rows={5}
              required
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="model">Model</label>
            <select
              id="model"
              name="model"
              value={formData.model}
              onChange={handleInputChange}
            >
              {FREE_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="temperature">
              Temperature: {formData.temperature.toFixed(2)}
            </label>
            <input
              type="range"
              id="temperature"
              name="temperature"
              min="0"
              max="2"
              step="0.01"
              value={formData.temperature}
              onChange={handleInputChange}
            />
            <p className={styles.helperText}>
              0 = Deterministic, 1 = Balanced, 2 = Creative
            </p>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="webhook_url">Webhook URL (Optional)</label>
            <input
              type="url"
              id="webhook_url"
              name="webhook_url"
              value={formData.webhook_url || ""}
              onChange={handleInputChange}
              placeholder="https://example.com/webhook"
            />
            <p className={styles.helperText}>
              Fires when a new conversation starts with your agent
            </p>
          </div>

          <div className={styles.actions}>
            <button
              type="submit"
              disabled={saving}
              className={styles.submitBtn}
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className={styles.deleteBtn}
            >
              Delete Agent
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

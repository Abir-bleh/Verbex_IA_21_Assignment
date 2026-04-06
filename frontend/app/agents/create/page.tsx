"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../agents.module.css";

const AGENT_API_URL =
  process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8082";

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

export default function CreateAgent() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    system_prompt: "",
    temperature: 0.7,
    model: "stepfun-ai/step-3.5-flash:free",
    webhook_url: "",
  });

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "temperature" ? parseFloat(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/auth/login");
        return;
      }

      console.log(
        "Sending create agent request with token:",
        token.slice(0, 20) + "...",
      );

      const response = await fetch(`${AGENT_API_URL}/agents`, {
        method: "POST",
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

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("Response data:", data);

      if (!response.ok) {
        throw new Error(
          data.detail?.error || data.detail || "Failed to create agent",
        );
      }

      router.push("/dashboard");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred";
      console.error("Create agent error:", errorMsg);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1>Create New Agent</h1>
        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.group}>
            <label>Agent Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Customer Support Bot"
              required
            />
          </div>

          <div className={styles.group}>
            <label>System Prompt *</label>
            <textarea
              name="system_prompt"
              value={formData.system_prompt}
              onChange={handleChange}
              placeholder="Define the agent's behavior and personality..."
              rows={6}
              required
            />
          </div>

          <div className={styles.row}>
            <div className={styles.group}>
              <label>Model</label>
              <select
                name="model"
                value={formData.model}
                onChange={handleChange}
              >
                {FREE_MODELS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.group}>
              <label>Temperature ({formData.temperature})</label>
              <input
                type="range"
                name="temperature"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className={styles.group}>
            <label>Webhook URL (optional)</label>
            <input
              type="url"
              name="webhook_url"
              value={formData.webhook_url}
              onChange={handleChange}
              placeholder="https://example.com/webhook"
            />
          </div>

          <div className={styles.actions}>
            <button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Agent"}
            </button>
            <Link href="/dashboard" className={styles.cancel}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

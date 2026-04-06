"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./api-keys.module.css";

const AGENT_API_URL =
  process.env.NEXT_PUBLIC_AGENT_URL || "http://localhost:8082";

interface ApiKey {
  id: string;
  keyPreview: string;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [apiKey, setApiKey] = useState<ApiKey | null>(null);
  const [fullKey, setFullKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fetchApiKey = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/auth/login";
        return;
      }

      const response = await fetch(`${AGENT_API_URL}/apikeys`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch API key");
      }

      const data = await response.json();
      if (data.data) {
        setApiKey(data.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  useEffect(() => {
    const init = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          window.location.href = "/auth/login";
          return;
        }

        // Try to get existing key
        const response = await fetch(`${AGENT_API_URL}/apikeys`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch API key");
        }

        const data = await response.json();

        // If no key exists, auto-generate one
        if (!data.data) {
          const generateResponse = await fetch(`${AGENT_API_URL}/apikeys`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!generateResponse.ok) {
            throw new Error("Failed to generate API key");
          }

          const generateData = await generateResponse.json();
          setFullKey(generateData.data.key);

          // Refresh to show key preview
          setTimeout(() => {
            fetchApiKey();
          }, 1000);
        } else {
          setApiKey(data.data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const handleCopyKey = () => {
    if (fullKey) {
      navigator.clipboard.writeText(fullKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleRegenerate = async () => {
    if (
      !confirm(
        "Are you sure? This will invalidate the previous key. Applications using it will stop working until you update them.",
      )
    ) {
      return;
    }

    try {
      setRegenerating(true);
      setError("");
      const token = localStorage.getItem("token");
      if (!token) {
        window.location.href = "/auth/login";
        return;
      }

      const response = await fetch(`${AGENT_API_URL}/apikeys`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to regenerate API key");
      }

      const data = await response.json();
      setFullKey(data.data.key);
      setCopied(false);

      // Refresh the key info after a delay
      setTimeout(() => {
        fetchApiKey();
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setRegenerating(false);
    }
  };

  if (loading) {
    return <div className={styles.container}>Loading...</div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <h1>API Keys</h1>
          <p className={styles.subtitle}>
            Manage your API key for programmatic access
          </p>
        </div>
        <Link href="/dashboard" className={styles.back}>
          Back to Dashboard
        </Link>
      </header>

      <main className={styles.main}>
        {error && <div className={styles.error}>{error}</div>}

        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2>Your API Key</h2>
            {apiKey && (
              <p className={styles.status}>
                Created: {new Date(apiKey.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {fullKey ? (
            <div className={styles.keyDisplay}>
              <div className={styles.message}>
                <strong>⚠️ Save this key now!</strong>
                <p>You won't see it again. Store it securely.</p>
              </div>

              <div className={styles.keyBox}>
                <code>{fullKey}</code>
              </div>

              <div className={styles.keyActions}>
                <button onClick={handleCopyKey} className={styles.copyBtn}>
                  {copied ? "✓ Copied!" : "Copy to Clipboard"}
                </button>
              </div>
            </div>
          ) : apiKey ? (
            <div className={styles.keyInfo}>
              <p>
                API key exists (created{" "}
                {new Date(apiKey.createdAt).toLocaleDateString()})
              </p>
              <p className={styles.preview}>
                Preview: <code>{apiKey.keyPreview}</code>
              </p>
              <p className={styles.info}>
                Your key is hidden for security. You can only see it once upon
                creation.
              </p>
              <button
                onClick={handleRegenerate}
                className={styles.regenerateBtn}
                disabled={regenerating}
              >
                {regenerating ? "Regenerating..." : "Regenerate Key"}
              </button>
            </div>
          ) : (
            <div className={styles.noKey}>
              <p>Generating your API key...</p>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <h2>How to Use</h2>
          <div className={styles.usage}>
            <h3>Using the API Key</h3>
            <p>Include your API key in the authorization header:</p>
            <pre className={styles.code}>
              {`curl -X POST http://localhost:8083/chat \\
  -H "X-API-Key: your_api_key_here" \\
  -H "Content-Type: application/json" \\
  -d {
    "agentId": "agent_id",
    "message": "Hello!"
  }`}
            </pre>

            <h3>Or in fetch (JavaScript)</h3>
            <pre className={styles.code}>
              {`const response = await fetch('http://localhost:8083/chat', {
  method: 'POST',
  headers: {
    'X-API-Key': 'your_api_key_here',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    agentId: 'agent_id',
    message: 'Hello!'
  })
});`}
            </pre>
          </div>
        </section>
      </main>
    </div>
  );
}

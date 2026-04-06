import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <h1 className={styles.title}>Verbex</h1>
        <p className={styles.subtitle}>AI Agent Management Platform</p>
        <p className={styles.description}>
          Create, configure, and deploy AI chatbots in minutes. Embed them
          anywhere with a simple link.
        </p>

        <div className={styles.links}>
          <a href="/auth/signup" className={`${styles.link} ${styles.primary}`}>
            Get Started
          </a>
          <a
            href="/auth/login"
            className={`${styles.link} ${styles.secondary}`}
          >
            Sign In
          </a>
        </div>

        <div className={styles.features}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🤖</div>
            <h3 className={styles.featureTitle}>Easy Setup</h3>
            <p className={styles.featureText}>
              Create and configure AI agents without coding. Simple, intuitive
              interface.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>🔗</div>
            <h3 className={styles.featureTitle}>Public Links</h3>
            <p className={styles.featureText}>
              Get shareable public chat links. Embed your agent anywhere
              instantly.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>⚡</div>
            <h3 className={styles.featureTitle}>Fast & Reliable</h3>
            <p className={styles.featureText}>
              Powered by OpenRouter LLMs. Works seamlessly at scale.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

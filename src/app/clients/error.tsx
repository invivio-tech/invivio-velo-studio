'use client';

export default function ErrorBoundary({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{ padding: 20 }}>
      <h1 id="error-title">CUSTOM ERROR CAUGHT!</h1>
      <pre id="error-message">{error.message}</pre>
      <pre id="error-stack">{error.stack}</pre>
      <button onClick={reset}>Retry</button>
    </div>
  );
}

export default function HealthPage() {
  const envVars = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  };

  const allLoaded = Object.values(envVars).every(Boolean);

  return (
    <main style={{ fontFamily: "monospace", padding: "2rem" }}>
      <h1>{allLoaded ? "ok" : "error"}</h1>
      <ul>
        {Object.entries(envVars).map(([key, loaded]) => (
          <li key={key}>
            {loaded ? "✓" : "✗"} {key}
          </li>
        ))}
      </ul>
    </main>
  );
}

/** Exact browser origins, configured by the operator; never allow wildcards. */
export function installationOrigins(appUrl?: string, extraOrigins = ""): string[] {
  const values = appUrl
    ? [appUrl, ...extraOrigins.split(",").filter(Boolean)]
    : ["http://localhost:5173", "http://127.0.0.1:5173", ...extraOrigins.split(",").filter(Boolean)];
  if (appUrl) {
    const app = new URL(appUrl);
    if (["localhost", "127.0.0.1", "[::1]"].includes(app.hostname)) {
      const port = app.port ? `:${app.port}` : "";
      values.push(`${app.protocol}//localhost${port}`, `${app.protocol}//127.0.0.1${port}`);
    }
  }
  return [...new Set(values.map(value => {
    const url = new URL(value.trim());
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.hostname.includes("*") || url.username || url.password || url.search || url.hash || url.pathname !== "/" ||
        (url.protocol !== "https:" && !(local && url.protocol === "http:"))) {
      throw new Error("invalid_installation_origin");
    }
    return url.origin;
  }))];
}

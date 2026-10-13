import { beforeAll } from "vitest";
beforeAll(() => {
  const original = globalThis.fetch;
  globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input), "http://localhost");
    if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
      throw new Error("External network is forbidden in local tests");
    }
    return original(input, init);
  }) as typeof fetch;
});

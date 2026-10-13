export function requireLocalUrl(value, label = "URL") {
  const url = new URL(value);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    throw new Error(`${label} must target a local fixture; remote tests are forbidden`);
  }
  return url;
}

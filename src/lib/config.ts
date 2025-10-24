const serverUrl = (() => {
  if (
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_OPENCODE_SERVER_URL
  ) {
    return import.meta.env.VITE_OPENCODE_SERVER_URL;
  }
  if (typeof process !== "undefined" && process.env?.VITE_OPENCODE_SERVER_URL) {
    return process.env.VITE_OPENCODE_SERVER_URL;
  }
  return "";
})();

export const getServerUrl = (): string => serverUrl;

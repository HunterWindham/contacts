const LOCAL_API_FALLBACK = "http://127.0.0.1:5000/api";
const API_BASE_META_NAME = "contacts-api-base";

function readConfiguredApiBase() {
  const globalConfiguredBase = globalThis.__CONTACTS_API_BASE__;
  if (typeof globalConfiguredBase === "string" && globalConfiguredBase.trim()) {
    return globalConfiguredBase.trim();
  }

  const metaTag = document.querySelector(`meta[name="${API_BASE_META_NAME}"]`);
  const metaConfiguredBase = metaTag?.getAttribute("content");
  if (typeof metaConfiguredBase === "string" && metaConfiguredBase.trim()) {
    return metaConfiguredBase.trim();
  }

  return LOCAL_API_FALLBACK;
}

export const runtimeConfig = {
  apiBase: readConfiguredApiBase(),
};


export function resolvePaginationUrl(next, currentUrl, apiBaseUrl) {
  if (!next) return null;

  let url;

  try {
    url = new URL(next, currentUrl);
  } catch {
    throw new Error("Invalid pagination URL.");
  }

  const allowedHosts = [
    new URL(apiBaseUrl).hostname,
    "project-management-system-ekr7.onrender.com",
  ];

  if (
    !allowedHosts.includes(url.hostname) ||
    !["https:", "http:"].includes(url.protocol) ||
    !/^\/(api|project)\//.test(url.pathname)
  ) {
    throw new Error("Invalid pagination URL.");
  }

  return new URL(
    `${url.pathname}${url.search}`,
    apiBaseUrl
  ).href;
}

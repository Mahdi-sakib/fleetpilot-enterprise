// Shared by the auth pages (Login, Register, and any page that resumes a flow
// after sign-in). Keep the redirect validation in one place — it is
// security-sensitive and easy to drift.

// Resolve ?returnTo= to a safe same-origin path, else "/".
//
// The same-origin check alone is not enough: a value like /.//evil.com or
// /\evil.com parses same-origin but normalizes to a protocol-relative
// //evil.com when assigned to location.href — an open redirect. So require the
// resolved path to be exactly one leading slash (no "//" prefix, no backslash).
export function safeReturnTo() {
const raw = new URLSearchParams(window.location.search).get("returnTo");
if (!raw) return "/";
try {
const url = new URL(raw, window.location.origin);
if (url.origin !== window.location.origin) return "/";
// access_token rides back on a Google OAuth redirect and must never be
// forwarded again from a returnTo that itself came from the URL.
for (const p of ["access_token"]) {
url.searchParams.delete(p);
}
const path = url.pathname + url.search;
if (!path.startsWith("/") || path.startsWith("//") || path.includes("\\")) return "/";
return path;
} catch {
return "/";
}
}


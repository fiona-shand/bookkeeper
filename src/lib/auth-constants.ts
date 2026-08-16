/**
 * Split out from auth.ts so client components can import it: auth.ts pulls in
 * node:crypto and next/headers, neither of which can cross into the browser.
 */
export const MIN_PASSWORD_LENGTH = 10;

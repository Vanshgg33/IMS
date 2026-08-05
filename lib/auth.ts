import { cookies } from "next/headers";

const SESSION_COOKIE = "nims_session";
const PASSWORD = process.env.APP_PASSWORD || "naturelite123";
const SESSION_VALUE = "authenticated";

export function isAuthenticated(): boolean {
  const cookieStore = cookies();
  return cookieStore.get(SESSION_COOKIE)?.value === SESSION_VALUE;
}

export function checkPassword(input: string): boolean {
  return input === PASSWORD;
}

export { SESSION_COOKIE, SESSION_VALUE };

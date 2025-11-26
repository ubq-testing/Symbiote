export const TOKEN_KEY_PREFIX = ["oauth", "token"];
export const STATE_KEY_PREFIX = ["oauth", "state"];

export function normalizeLogin(login: string) {
  return login.toLowerCase().trim();
}

export function buildTokenKey(login: string) {
  return [...TOKEN_KEY_PREFIX, normalizeLogin(login)];
}

export function buildStateKey(state: string) {
  return [...STATE_KEY_PREFIX, state];
}

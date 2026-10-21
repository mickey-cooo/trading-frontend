// shared by session.ts (client) and proxy.ts (server), so it must not import React
export const SESSION_COOKIE = "has_session";
// long on purpose: it is only a hint. One that outlives the tokens lands on a page that asks to log in,
// while one that expires early would bounce a user with valid tokens before any client code can renew it.
export const SESSION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

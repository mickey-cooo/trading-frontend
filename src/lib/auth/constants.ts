// shared by session.ts (client), proxy.ts and the BFF route (server), so it must not import React
// readable by the client (not HttpOnly): "is someone signed in" plus their email for display
export const SESSION_COOKIE = "has_session";
// HttpOnly: the tokens never reach page script
export const ACCESS_COOKIE = "at";
export const REFRESH_COOKIE = "rt";
// the backend decides when the refresh token really dies; a cookie that outlives it just gets a 401 and the expiry screen,
// while one that dies early would sign out a user with a valid token
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

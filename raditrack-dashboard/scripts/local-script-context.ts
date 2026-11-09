/**
 * Import this FIRST in a local maintenance script that calls server actions
 * directly (no web request, so no signed-in user). See lib/auth/dal.ts.
 * Never set RADITRACK_LOCAL_SCRIPT in .env or for the web server.
 */
process.env.RADITRACK_LOCAL_SCRIPT = "1";

export {};

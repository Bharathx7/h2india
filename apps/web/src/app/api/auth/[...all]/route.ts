import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";

// Better Auth's routes: email codes, passkeys, Google, sessions (ADR 0003).
export const { GET, POST } = toNextJsHandler(auth);

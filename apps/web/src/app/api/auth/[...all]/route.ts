import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";

// Better Auth's routes: email codes, staff passwords, Google, sessions (ADR 0003, A183).
export const { GET, POST } = toNextJsHandler(auth);

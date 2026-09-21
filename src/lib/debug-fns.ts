import { createServerFn } from "@tanstack/react-start";

export const getDebugInfo = createServerFn({ method: "GET" }).handler(async () => {
  return {
    dbUrl: process.env.DATABASE_URL,
    hasProcess: typeof process !== "undefined",
  };
});

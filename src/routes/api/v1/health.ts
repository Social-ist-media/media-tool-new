import { createFileRoute } from "@tanstack/react-router";
import { dbSource } from "@/lib/db";

export const Route = createFileRoute("/api/v1/health")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          ok: true,
          service: "nexus",
          db: dbSource,
          time: new Date().toISOString(),
        }),
    },
  },
});

import { defineConfig } from "@prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",
  datasource: {
    adapter: "postgresql",
    url: process.env.DATABASE_URL || "",
  },
});
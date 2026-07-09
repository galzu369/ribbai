import { describe, expect, it } from "vitest";

import { env } from "@/lib/env";

describe("foundation environment", () => {
  it("loads validated defaults for local development", () => {
    expect(env.APP_NAME).toBe("RIBBAI OPS");
    expect(env.NODE_ENV).toBeDefined();
  });
});

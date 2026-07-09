import { NextResponse } from "next/server";

import { env } from "@/lib/env";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: env.APP_NAME,
    environment: env.APP_ENV,
    timestamp: new Date().toISOString(),
  });
}

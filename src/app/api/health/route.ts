/**
 * Health Check API Endpoint
 * Used for monitoring and load balancer health checks
 */

import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Basic health check - verify server is running
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "0.1.0",
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 503 }
    );
  }
}

"use client"

import { createOpencodeClient } from "../../node_modules/@opencode-ai/sdk/dist/client.js"

export function createProxyClient() {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE || "/api/opencode-proxy";
  
  return createOpencodeClient({
    baseUrl,
    responseStyle: "data",
  });
}
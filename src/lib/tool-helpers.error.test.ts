import { describe, expect, it } from "bun:test";
import { normalizeToolPart } from "./tool-helpers";
import type { Part } from "@/types/opencode";

describe("tool error extraction", () => {
  it("extracts error from state.error when status is error", () => {
    const part: Part = {
      type: "tool",
      tool: "edit",
      status: "error",
      state: {
        status: "error",
        error: "Edit failed: file not found",
      },
    } as any;

    const normalized = normalizeToolPart(part);
    expect(normalized.status).toBe("error");
    expect(normalized.error?.message).toContain("file not found");
  });

  it("falls back to output.message when provided", () => {
    const part: Part = {
      type: "tool",
      tool: "read",
      status: "error",
      output: { message: "Permission denied" },
      state: { status: "error" } as any,
    } as any;
    const normalized = normalizeToolPart(part);
    expect(normalized.error?.message).toBe("Permission denied");
  });

  it("reads from state.metadata.error when present", () => {
    const part: Part = {
      type: "tool",
      tool: "bash",
      status: "error",
      state: { status: "error", metadata: { error: "Command failed" } } as any,
    } as any;
    const normalized = normalizeToolPart(part);
    expect(normalized.error?.message).toBe("Command failed");
  });
});


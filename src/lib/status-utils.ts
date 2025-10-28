import type { LspDiagnosticsSummary } from "@/types/opencode";

export function normalizeDiagnostics(
  props: Record<string, unknown>,
): LspDiagnosticsSummary | null {
  const serverID = typeof props.serverID === "string" ? props.serverID : undefined;
  if (!serverID) return null;

  const toNumber = (value: unknown): number => {
    if (typeof value === "number") return value;
    if (typeof value === "string" && !Number.isNaN(Number(value))) {
      return Number(value);
    }
    return 0;
  };

  return {
    label: typeof props.label === "string" ? props.label : serverID,
    errors: toNumber(props.errors),
    warnings: toNumber(props.warnings),
    infos: toNumber(props.infos),
    hints: toNumber(props.hints),
    lastPath: typeof props.path === "string" ? props.path : undefined,
    updatedAt: new Date(),
  };
}

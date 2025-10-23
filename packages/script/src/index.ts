import { readFileSync } from "node:fs";

const rootPackagePath = new URL("../../../package.json", import.meta.url);

const readRootPackage = () =>
  JSON.parse(readFileSync(rootPackagePath, "utf8")) as { version: string };

const bumpVersion = (current: string, bump: "major" | "minor" | "patch") => {
  const [major, minor, patch] = current.split(".").map(Number);
  switch (bump) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    default:
      return `${major}.${minor}.${patch + 1}`;
  }
};

export const Script = {
  get version() {
    const bump = process.env.OPENCODE_BUMP as "major" | "minor" | "patch" | undefined;
    if (!bump) throw new Error("OPENCODE_BUMP not set");
    const pkg = readRootPackage();
    return bumpVersion(pkg.version, bump);
  },
  get channel() {
    return process.env.OPENCODE_CHANNEL ?? "latest";
  },
  get preview() {
    return this.channel === "preview";
  },
};

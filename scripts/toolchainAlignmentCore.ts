// Dependabot bumps the vite-plus package without touching the vite-plus-core alias or the mise CLI
// pin. The mise-pinned `vp` then still matches the stale core, so every CI job passes and the bump
// auto-merges, while any build that runs the project's own `vp` (Cloudflare Pages) fails.

export interface WorkspaceVitePlusPins {
  vitePlus: string | null;
  vitePlusCore: string | null;
}

export interface ToolchainPins extends WorkspaceVitePlusPins {
  miseVitePlus: string | null;
}

const catalogBlock = (workspaceYaml: string): string => {
  const match = /^catalog:[ \t]*\n((?:[ \t]+.*(?:\n|$))*)/m.exec(workspaceYaml);
  return match?.[1] ?? "";
};

export const readWorkspaceVitePlusPins = (workspaceYaml: string): WorkspaceVitePlusPins => {
  const catalog = catalogBlock(workspaceYaml);
  const vitePlus = /^[ \t]+vite-plus:[ \t]*["']?([^\s"']+)/m.exec(catalog)?.[1] ?? null;
  const vitePlusCore =
    /^[ \t]+vite:[ \t]*["']?npm:@voidzero-dev\/vite-plus-core@([^\s"']+)/m.exec(catalog)?.[1] ??
    null;
  return { vitePlus, vitePlusCore };
};

export const readMiseVitePlusPin = (miseToml: string): string | null =>
  /^"npm:vite-plus"[ \t]*=[ \t]*"([^"]+)"/m.exec(miseToml)?.[1] ?? null;

export const findToolchainMismatches = ({
  vitePlus,
  vitePlusCore,
  miseVitePlus,
}: ToolchainPins): string[] => {
  const problems: string[] = [];
  if (vitePlus === null) problems.push("pnpm-workspace.yaml catalog has no vite-plus entry");
  if (vitePlusCore === null) {
    problems.push(
      "pnpm-workspace.yaml catalog has no vite: npm:@voidzero-dev/vite-plus-core@<version> alias",
    );
  }
  if (miseVitePlus === null) problems.push('.mise/config.toml has no "npm:vite-plus" pin');
  if (vitePlus === null) return problems;

  if (vitePlusCore !== null && vitePlusCore !== vitePlus) {
    problems.push(
      `pnpm-workspace.yaml catalog aliases vite to @voidzero-dev/vite-plus-core@${vitePlusCore}, but vite-plus is ${vitePlus}`,
    );
  }
  if (miseVitePlus !== null && miseVitePlus !== vitePlus) {
    problems.push(
      `.mise/config.toml pins npm:vite-plus ${miseVitePlus}, but vite-plus is ${vitePlus}`,
    );
  }
  return problems;
};

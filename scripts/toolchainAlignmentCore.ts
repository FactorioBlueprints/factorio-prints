// Dependabot bumps the vite-plus package without touching the vite-plus-core alias. CI then still
// runs against the stale core, while any build that resolves the new vite-plus (Cloudflare Pages)
// fails, so the two catalog pins must move together.

export interface WorkspaceVitePlusPins {
  vitePlus: string | null;
  vitePlusCore: string | null;
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

export const findToolchainMismatches = ({
  vitePlus,
  vitePlusCore,
}: WorkspaceVitePlusPins): string[] => {
  const problems: string[] = [];
  if (vitePlus === null) problems.push("pnpm-workspace.yaml catalog has no vite-plus entry");
  if (vitePlusCore === null) {
    problems.push(
      "pnpm-workspace.yaml catalog has no vite: npm:@voidzero-dev/vite-plus-core@<version> alias",
    );
  }
  if (vitePlus !== null && vitePlusCore !== null && vitePlusCore !== vitePlus) {
    problems.push(
      `pnpm-workspace.yaml catalog aliases vite to @voidzero-dev/vite-plus-core@${vitePlusCore}, but vite-plus is ${vitePlus}`,
    );
  }
  return problems;
};

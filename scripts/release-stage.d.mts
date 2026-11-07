import type { PackEntry } from './pack-contents.mjs';

export interface ReleaseStagePlan {
  /** Script names (`main` for `demo/src/main.ts`) the release keeps and removes. */
  readonly keptScripts: readonly string[];
  readonly removedScripts: readonly string[];
  /** Scene files at the project root (`world.tscn`) the release keeps and removes. */
  readonly keptScenes: readonly string[];
  readonly removedScenes: readonly string[];
}

export function scriptName(entryPoint: string): string;
export function scriptsOfScene(text: string): string[];
export function autoloadScripts(text: string): string[];
export function planReleaseStage(options: {
  readonly entryPoints?: readonly string[];
  readonly releaseEntryPoints?: readonly string[];
  readonly sceneScripts: ReadonlyMap<string, readonly string[]>;
  readonly autoloads: readonly string[];
}): ReleaseStagePlan;
export function planReleaseStageOf(demoDirectory: string): ReleaseStagePlan;
export function stageReleaseProject(options: { readonly demoDirectory: string; readonly stageDirectory: string; readonly plan: ReleaseStagePlan }): string;
export function releasePackViolations(entries: readonly PackEntry[], plan: ReleaseStagePlan): string[];
export function assertReleasePack(packPath: string, plan: ReleaseStagePlan): PackEntry[];

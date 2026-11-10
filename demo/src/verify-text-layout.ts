import { DirAccess, DisplayServer, Engine, FileAccess, GError, Node, OS, RenderingServer, type ReactUiTextLayoutProbe } from 'godot';

const SETTLE_MS = 100;
const MIN_SETTLE_FRAMES = 2;
const FRAME_POLL_MS = 10;
/** Failures printed per check name; the rest are counted. */
const MAX_PRINTED_FAILURES = 4;

interface Check {
  case: string;
  alignment: string;
  name: string;
  ok: boolean;
  detail: string;
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function settle(): Promise<void> {
  const startFrame = Engine.getProcessFrames();
  await new Promise(resolve => setTimeout(resolve, SETTLE_MS));
  while (Engine.getProcessFrames() - startFrame < MIN_SETTLE_FRAMES) {
    await new Promise(resolve => setTimeout(resolve, FRAME_POLL_MS));
  }
}

function isCheck(value: unknown): value is Check {
  return typeof value === 'object' && value !== null
    && 'case' in value && typeof value.case === 'string'
    && 'alignment' in value && typeof value.alignment === 'string'
    && 'name' in value && typeof value.name === 'string'
    && 'ok' in value && typeof value.ok === 'boolean'
    && 'detail' in value && typeof value.detail === 'string';
}

function parseChecks(json: string): Check[] {
  const report: unknown = JSON.parse(json);
  assert(typeof report === 'object' && report !== null && 'checks' in report && Array.isArray(report.checks), 'The probe returned no checks');
  const checks: unknown[] = report.checks;
  return checks.map(entry => {
    assert(isCheck(entry), `Malformed check ${JSON.stringify(entry)}`);
    return entry;
  });
}

/** The pass count of every check name, and the first failures of each. */
function summarize(checks: Check[]): { lines: string[]; failed: number } {
  const names = [...new Set(checks.map(check => check.name))];
  const lines: string[] = [];
  let failed = 0;
  for (const name of names) {
    const named = checks.filter(check => check.name === name);
    const failures = named.filter(check => !check.ok);
    failed += failures.length;
    lines.push(`${failures.length === 0 ? 'ok  ' : 'FAIL'} ${name}: ${named.length - failures.length}/${named.length}`);
    for (const failure of failures.slice(0, MAX_PRINTED_FAILURES)) {
      lines.push(`       ${failure.case} (${failure.alignment}): ${failure.detail}`);
    }
    if (failures.length > MAX_PRINTED_FAILURES) lines.push(`       ... and ${failures.length - MAX_PRINTED_FAILURES} more`);
  }
  return { lines, failed };
}

/**
 * `TextLayout`: the geometry checks run inside the probe; this drives the cases through it,
 * reads back the viewport's pixels for the draw-parity check and saves one capture per case with the
 * carets, line boxes and a selection drawn over the text. Nothing here sends input of any kind.
 */
export async function runTextLayoutVerification(owner: Node, probe: ReactUiTextLayoutProbe): Promise<void> {
  const directory = OS.getEnvironment('GODOT_REACT_ARTIFACTS') || 'user://react-ui-verification';
  assert(DirAccess.makeDirRecursiveAbsolute(directory) === GError.Ok, 'Cannot create evidence directory');
  // A headless run has no renderer: the geometry checks run, the pixel ones cannot.
  const rendering = DisplayServer.getName() !== 'headless';
  await settle();

  const all: Check[] = parseChecks(probe.verify());
  const captures: string[] = [];
  const viewport = owner.getViewport();
  assert(viewport, 'Text layout verification requires a viewport');
  if (rendering) {
    for (let index = 0; index < probe.caseCount(); index++) {
      const name = probe.caseName(index);
      assert(probe.showCase(index, false), `No case ${index}`);
      await settle();
      RenderingServer.forceDraw();
      const plain = viewport.getTexture()?.getImage();
      assert(plain, 'Text layout verification requires a rendered viewport');
      all.push(...parseChecks(probe.checkInk(plain)));

      assert(probe.showCase(index, true), `No case ${index}`);
      await settle();
      RenderingServer.forceDraw();
      const image = viewport.getTexture()?.getImage();
      assert(image, 'Text layout verification requires a rendered viewport');
      const path = `${directory}/${String(index + 1).padStart(2, '0')}-${name}.png`;
      assert(image.savePng(path) === GError.Ok, `Could not save ${path}`);
      captures.push(path);
    }
  }

  const report = FileAccess.open(`${directory}/text-layout-checks.json`, FileAccess.ModeFlags.Write);
  assert(report, 'Cannot write the check report');
  report.storeString(JSON.stringify(all, null, 1));
  report.close();

  const { lines, failed } = summarize(all);
  console.log(`Text layout checks (${all.length}, ${rendering ? 'rendered' : 'headless: no pixel checks, no captures'}):\n${lines.join('\n')}`);
  assert(failed === 0, `${failed} text layout check(s) failed`);
  // A probe that reports no check at all has verified nothing: passing it would be the same as passing a probe that broke.
  assert(all.length > 0, 'The probe ran no text layout check');
  // A headless run has no pixels: say so in the marker, where the script's summary reads it.
  const skipped = rendering ? [] : ['pixel checks', 'captures'];
  console.log('GODOT_REACT_TEXT_LAYOUT_VERIFY_PASSED', JSON.stringify({ checks: all.length, captures, partial: skipped.length > 0, skipped }));
}

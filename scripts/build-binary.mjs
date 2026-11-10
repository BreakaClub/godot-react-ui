// Builds the release library of one platform into out/bin, under the name react_ui.gdextension gives it:
//
//   node scripts/build-binary.mjs [--target=<name>]
//
// `--target` names a build of scripts/native-binding.mjs's BINARY_TARGETS (`linux.arm64`, `macos.universal`, `android.arm64`, ...); without it
// the build is this machine's. Each needs its Rust target installed (`rustup target add <triple>`) and a linker for it:
//
//   macOS, iOS   Xcode (the iOS build needs its iOS SDK)
//   Linux        the machine's own compiler: build on the architecture the library is for
//   Windows      Visual Studio's build tools, with the ARM64 ones for `windows.arm64`
//   Android      the NDK: ANDROID_NDK_HOME (or ANDROID_NDK_LATEST_HOME, which GitHub's runners set)
//
// This is what CI and a release build with (.github/workflows/build.yml). It is not the build a checkout runs the demo and the verifiers on:
// that is scripts/build-native.mjs, which builds this machine's library into the demo's addon and stamps it for the freshness guard.
// Both are bound to stock Godot 4.7.2's API (`NATIVE_BINDING_API`), so one library serves 4.7.2 and newer engines.
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import { rejectUnknownArguments } from './arguments.mjs';
import { BINARY_TARGETS, CARGO_PACKAGE, hostBinaryTarget, nativeBinding, nativeBindingEnvironment, OUT_BIN } from './native-binding.mjs';

const TARGET_OPTION = '--target=';
// The oldest Android that Godot 4.7's export templates run on (their minSdk): the NDK compiler wrapper of that API level links the library.
const ANDROID_API_LEVEL = 24;
// Android devices with 16 KB memory pages load only libraries whose segments are aligned to them; the alignment also serves 4 KB devices.
const ANDROID_MAX_PAGE_SIZE = 16384;
// The oldest iOS that Godot 4.7's export templates run on. rustc's default is older, and the linker warns about each object built for less.
const IOS_DEPLOYMENT_TARGET = '14.0';

const argv = process.argv.slice(2);
rejectUnknownArguments(argv, { prefixes: [TARGET_OPTION], engine: false });
const root = resolve(import.meta.dirname, '..');
const named = argv.findLast(argument => argument.startsWith(TARGET_OPTION))?.slice(TARGET_OPTION.length);
const name = named ?? hostBinaryTarget();
const target = name === undefined ? undefined : BINARY_TARGETS[name];
if (target === undefined) {
  throw new Error(`No native build named ${name ?? `for ${process.platform} ${process.arch}`}. ${TARGET_OPTION}<name> takes ${Object.keys(BINARY_TARGETS).join(', ')}.`);
}

/**
 * The cargo of the toolchain rust-toolchain.toml pins, and the directory its rustc is in. `CARGO` names another; otherwise rustup resolves the
 * pin, from the PATH or from where rustup installs itself (a shell started without a login profile has no ~/.cargo/bin on its PATH).
 */
function rustToolchain() {
  if (process.env.CARGO) return { cargo: process.env.CARGO, bin: dirname(process.env.CARGO) };
  const tried = [];
  for (const rustup of ['rustup', join(homedir(), '.cargo/bin/rustup')]) {
    const result = spawnSync(rustup, ['which', 'cargo'], { cwd: root, encoding: 'utf8' });
    if (result.error?.code === 'ENOENT') {
      tried.push(rustup);
      continue;
    }
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`${rustup} which cargo failed (${result.status}): ${result.stderr.trim()}`);
    const cargo = result.stdout.trim();
    return { cargo, bin: dirname(cargo) };
  }
  throw new Error(`No rustup (tried ${tried.join(', ')}): install rustup, or set CARGO to a cargo of the toolchain in rust-toolchain.toml`);
}

/** Cargo's environment variable infix for a target triple. */
const cargoTargetVariable = triple => triple.toUpperCase().replaceAll('-', '_');

/** The NDK's clang wrapper for a triple, which links with the NDK's sysroot and libraries. */
function androidLinker(triple) {
  const ndk = process.env.ANDROID_NDK_HOME ?? process.env.ANDROID_NDK_LATEST_HOME;
  if (ndk === undefined) throw new Error('An Android build needs the NDK: set ANDROID_NDK_HOME to it.');
  const prebuilt = join(ndk, 'toolchains/llvm/prebuilt');
  const [host] = existsSync(prebuilt) ? readdirSync(prebuilt).filter(entry => !entry.startsWith('.')) : [];
  if (host === undefined) throw new Error(`${prebuilt} has no toolchain: is ${ndk} an NDK?`);
  const linker = join(prebuilt, host, 'bin', `${triple}${ANDROID_API_LEVEL}-clang${process.platform === 'win32' ? '.cmd' : ''}`);
  if (!existsSync(linker)) throw new Error(`The NDK at ${ndk} has no ${linker}`);
  return linker;
}

const binding = nativeBinding();
const toolchain = rustToolchain();

function environment(triple) {
  // Cargo's `[env]` (.cargo/config.toml) does not override a variable already set, so the binding is set here, from the record itself.
  const env = { ...process.env, ...nativeBindingEnvironment(), PATH: [toolchain.bin, process.env.PATH ?? ''].join(delimiter) };
  const rustflags = [];
  if (target.platform === 'android') {
    env[`CARGO_TARGET_${cargoTargetVariable(triple)}_LINKER`] = androidLinker(triple);
    rustflags.push('-C', `link-arg=-Wl,-z,max-page-size=${ANDROID_MAX_PAGE_SIZE}`);
  }
  // A shared object links with symbols left undefined unless told otherwise, and then fails when Godot loads it. The Apple and Windows
  // linkers refuse them already.
  if (target.platform === 'android' || target.platform === 'linux') rustflags.push('-C', 'link-arg=-Wl,-z,defs');
  if (target.platform === 'ios') env.IPHONEOS_DEPLOYMENT_TARGET = IOS_DEPLOYMENT_TARGET;
  if (rustflags.length > 0) env[`CARGO_TARGET_${cargoTargetVariable(triple)}_RUSTFLAGS`] = rustflags.join(' ');
  return env;
}

function run(command, commandArgs, env) {
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: 'inherit', env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

const built = [];
for (const triple of target.triples) {
  run(toolchain.cargo, ['build', '--locked', '--release', '-p', CARGO_PACKAGE, '--target', triple], environment(triple));
  built.push(resolve(root, 'target', triple, 'release', target.artifact));
}
mkdirSync(OUT_BIN, { recursive: true });
// Staged and renamed, so a Godot that has the old library mapped keeps its inode.
const installed = resolve(OUT_BIN, target.library);
const staged = `${installed}.${process.pid}.tmp`;
try {
  if (built.length === 1) copyFileSync(built[0], staged);
  else run('lipo', ['-create', ...built, '-output', staged], process.env);
  renameSync(staged, installed);
} finally {
  rmSync(staged, { force: true });
}
console.log(`Built ${target.library} (${name}: ${target.triples.join(', ')}) bound to Godot API ${binding.api}: ${installed}`);

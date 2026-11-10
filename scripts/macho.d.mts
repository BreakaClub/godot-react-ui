/** The architectures a Mach-O file holds (`arm64`, `x86_64`), one for a thin file. Throws if `bytes` is not a Mach-O file. */
export function machOArchitectures(bytes: Uint8Array): string[];

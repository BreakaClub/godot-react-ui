/** Whether the memory a WebAssembly module imports is shared. Throws if `bytes` is not a module or imports no memory. */
export function importsSharedMemory(bytes: Uint8Array): boolean;

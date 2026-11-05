#include <dlfcn.h>
#include <stdio.h>

enum { LOAD_FAILED = 2, SYMBOL_MISSING = 3 };

int main(void) {
    void *library = dlopen("blitz_transition_probe.wasm", RTLD_NOW | RTLD_LOCAL);
    if (library == NULL) {
        fprintf(stderr, "BLITZ_LOAD_FAILED %s\n", dlerror());
        return LOAD_FAILED;
    }
    int (*probe)(void) = (int (*)(void))dlsym(library, "blitz_transition_probe");
    if (probe == NULL) {
        fprintf(stderr, "BLITZ_SYMBOL_MISSING %s\n", dlerror());
        return SYMBOL_MISSING;
    }
    int result = probe();
    printf("BLITZ_DYNAMIC_SMOKE_RESULT %d\n", result);
    dlclose(library);
    return result;
}

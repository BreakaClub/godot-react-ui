"""Reads and subsets Noto Sans CJK for scripts/build-font-slices.mjs (docs/tracks/font-slices.md).

It does only what needs fontTools; the partition, the hashing and the manifest are the Node side's. Run it isolated, from outside the
directories it reads, with absolute paths:

    python3 -I slice.py versions
    python3 -I slice.py extract <archive.zip> <empty directory> <member> [<member> ...]
    python3 -I slice.py cmap <font.otf> <out.json>
    python3 -I slice.py slice <plan.json>

`extract` writes the named members of an archive into the directory, each under its own name: a member whose name has a path in it is refused
(the archives are downloads, so they are data, never a place to write to). `cmap` writes the font's code points, sorted, its glyph count and its copyright notice. `slice` reads a plan,

    { "font": "<font.otf>", "out": "<directory>", "slices": [ { "file": "<name>.woff2", "codepoints": [ ... ] }, ... ] }

and writes each slice as a woff2 font with only those code points' glyphs, then prints one JSON line per slice with its glyph count.

Determinism: every input to the output is fixed. The subsetter keeps the source's `head.modified` (no recalculated timestamp), keeps tables in
fontTools' canonical order, and the brotli encoder is deterministic for a given library version, which the build records and checks.
"""

import argparse
import io
import json
import os
import sys
import zipfile

from fontTools import subset
from fontTools.ttLib import TTFont
import brotli
import fontTools

# OpenType layout features worth keeping for horizontal text: composition and decomposition (ccmp), language forms (locl), contextual
# alternates (calt, which Hangul uses), ligatures and kerning. Vertical forms (vert, vrt2) and proportional/half-width variants only
# matter to vertical and typographically tuned text, which the library does not set.
LAYOUT_FEATURES = ["ccmp", "locl", "calt", "liga", "clig", "kern", "mark", "mkmk", "ljmo", "vjmo", "tjmo"]
# The name records that carry the copyright, the licence, the designers and the version: the licence asks that the notices stay. English only.
NAME_IDS = list(range(0, 15))
ENGLISH_LANGUAGE_ID = 0x409
# Vertical metrics, the baseline table and the vertical origin table are for vertical text and ruby alignment.
DROPPED_TABLES = ["BASE", "VORG", "vhea", "vmtx", "DSIG"]


def options():
    chosen = subset.Options()
    chosen.flavor = "woff2"
    chosen.layout_features = LAYOUT_FEATURES
    # Hints cost a fifth of a slice and a browser on macOS draws these fonts without them; the library draws them as a browser does.
    chosen.hinting = False
    chosen.desubroutinize = True
    chosen.notdef_outline = False
    chosen.glyph_names = False
    chosen.name_IDs = NAME_IDS
    chosen.name_languages = [ENGLISH_LANGUAGE_ID]
    chosen.drop_tables = chosen.drop_tables + DROPPED_TABLES
    chosen.recalc_timestamp = False
    chosen.recalc_bounds = True
    return chosen


def versions():
    print(json.dumps({"fonttools": fontTools.version, "brotli": brotli.__version__, "python": sys.version.split()[0]}))


def extract(archive_path, out, members):
    os.makedirs(out, exist_ok=True)
    with zipfile.ZipFile(archive_path) as archive:
        names = set(archive.namelist())
        for member in members:
            if member not in names:
                sys.exit("%s has no member %s" % (archive_path, member))
            if os.path.basename(member) != member or member in ("", ".", ".."):
                sys.exit("refusing the member name %r" % member)
            with open(os.path.join(out, member), "wb") as handle:
                handle.write(archive.read(member))


def cmap(font_path, out_path):
    font = TTFont(font_path, lazy=True)
    codepoints = sorted(font.getBestCmap())
    copyright_notice = font["name"].getName(0, 3, 1, ENGLISH_LANGUAGE_ID)
    with open(out_path, "w") as handle:
        json.dump({
            "glyphs": font["maxp"].numGlyphs,
            "codepoints": codepoints,
            "copyright": str(copyright_notice) if copyright_notice is not None else "",
        }, handle)


def slice_font(plan_path):
    with open(plan_path) as handle:
        plan = json.load(handle)
    out = plan["out"]
    os.makedirs(out, exist_ok=True)
    for entry in plan["slices"]:
        font = TTFont(plan["font"], recalcTimestamp=False)
        subsetter = subset.Subsetter(options())
        subsetter.populate(unicodes=entry["codepoints"])
        subsetter.subset(font)
        font.flavor = "woff2"
        buffer = io.BytesIO()
        font.save(buffer)
        with open(os.path.join(out, entry["file"]), "wb") as handle:
            handle.write(buffer.getvalue())
        print(json.dumps({"file": entry["file"], "glyphs": font["maxp"].numGlyphs, "bytes": len(buffer.getvalue())}), flush=True)


def main():
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("versions")
    extract_parser = commands.add_parser("extract")
    extract_parser.add_argument("archive")
    extract_parser.add_argument("out")
    extract_parser.add_argument("members", nargs="+")
    cmap_parser = commands.add_parser("cmap")
    cmap_parser.add_argument("font")
    cmap_parser.add_argument("out")
    slice_parser = commands.add_parser("slice")
    slice_parser.add_argument("plan")
    arguments = parser.parse_args()
    if arguments.command == "versions":
        versions()
    elif arguments.command == "extract":
        extract(arguments.archive, arguments.out, arguments.members)
    elif arguments.command == "cmap":
        cmap(arguments.font, arguments.out)
    else:
        slice_font(arguments.plan)


main()

#!/bin/zsh
# Runs spike.gd scenario=accuracy on both engines and all three renderers. From the worktree root:
#   experiments/transform3d/run-accuracy.sh [extra spike.gd arguments, e.g. taps=1]
set -e
W=$PWD
OUT=$W/artifacts/transform3d-spike/godot
CHROME=$W/artifacts/transform3d-spike/chrome
for engine in breaka stock; do
  if [[ $engine == breaka ]]; then BIN=/Applications/Godot48.app/Contents/MacOS/Godot; else BIN=/Users/ben/Development/godot-stock/bin/godot-stock; fi
  for renderer in compat mobile forward; do
    case $renderer in compat) METHOD=gl_compatibility;; mobile) METHOD=mobile;; forward) METHOD=forward_plus;; esac
    timeout 300 $BIN --path experiments/transform3d --audio-driver Dummy --rendering-method $METHOD --resolution 320x200 \
      --script res://spike.gd -- scenario=accuracy tag=$engine-$renderer out=$OUT chrome=$CHROME "$@" > artifacts/logs/accuracy-$engine-$renderer.log 2>&1
    echo "$engine-$renderer done: $(ls $OUT/$engine-$renderer | wc -l) files"
  done
done

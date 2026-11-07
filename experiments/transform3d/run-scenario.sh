#!/bin/zsh
# Runs one spike.gd scenario on both engines and all three renderers (or on the tags in $TAGS, e.g. TAGS="breaka-compat stock-mobile").
#   experiments/transform3d/run-scenario.sh <scenario> [extra spike.gd arguments]
# Output: artifacts/transform3d-spike/godot/<tag>/, log: artifacts/logs/<scenario>-<tag>.log, RESULT lines in artifacts/logs/<scenario>.results
W=$PWD
SCENARIO=$1; shift
TAGS=${TAGS:-"breaka-compat breaka-mobile breaka-forward stock-compat stock-mobile stock-forward"}
: > artifacts/logs/$SCENARIO.results
for tag in ${=TAGS}; do
  engine=${tag%%-*}; renderer=${tag##*-}
  if [[ $engine == breaka ]]; then BIN=/Applications/Godot48.app/Contents/MacOS/Godot; else BIN=/Users/ben/Development/godot-stock/bin/godot-stock; fi
  case $renderer in compat) METHOD=gl_compatibility;; mobile) METHOD=mobile;; forward) METHOD=forward_plus;; esac
  timeout ${TIMEOUT:-300} $BIN --path experiments/transform3d --audio-driver Dummy --rendering-method $METHOD --resolution 320x200 \
    --script res://spike.gd -- scenario=$SCENARIO tag=$tag out=$W/artifacts/transform3d-spike/godot chrome=$W/artifacts/transform3d-spike/chrome "$@" > artifacts/logs/$SCENARIO-$tag.log 2>&1
  echo "exit $? $tag" >> artifacts/logs/$SCENARIO.results
  grep -E "^RESULT|SCRIPT ERROR|Parse Error|ERROR:" artifacts/logs/$SCENARIO-$tag.log | sed "s/^/$tag: /" >> artifacts/logs/$SCENARIO.results
done
cat artifacts/logs/$SCENARIO.results

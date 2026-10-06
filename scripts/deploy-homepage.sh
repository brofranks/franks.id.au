#!/bin/sh
set -e
npm run build:homepage
rsync -rltv --delete "$@" public-homepage/ brof@recycle.cs.washington.edu:/cse/web/homes/brof/

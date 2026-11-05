#!/usr/bin/env bash
# HtmlLib Desktop Launcher for Linux
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )/.." && pwd )"
if command -v xdg-open > /dev/null; then
  xdg-open "$DIR/index.html"
elif command -v google-chrome > /dev/null; then
  google-chrome --app="file://$DIR/index.html"
elif command -v firefox > /dev/null; then
  firefox "$DIR/index.html"
else
  echo "Please open $DIR/index.html in your web browser."
fi

#!/bin/bash
# Uso: ./hacer.sh usuario|tecnico   (3 pasadas para estabilizar los índices)
set -e
m=$1; cd "$(dirname "$0")"
rm -f pages-$m.json
for i in 1 2 3; do
  node build.js $m
  python3 fusionar.py raw-$m.docx ../portada-$( [ $m = usuario ] && echo manual-de-usuario || echo manual-tecnico ).docx $m.docx
  python3 ~/.claude/skills/docx/scripts/office/soffice.py --headless --convert-to pdf $m.docx >/dev/null 2>&1
  python3 paginas.py $m
done

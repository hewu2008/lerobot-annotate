#!/bin/bash
# Convert an annotated dataset to the LeRobot standard format in the background.
#
# This is a standalone wrapper around backend/convert_cli.py — it does NOT touch
# the web UI. Use it for manual/background runs of the same "Convert to LeRobot"
# logic. Annotations are read from <dataset>/meta/lerobot_annotations.json (the
# file the app writes when you annotate episodes).
#
# Usage:
#   bash convert_annotated.sh /path/to/dataset [output_dir]
#
# Example:
#   bash convert_annotated.sh /data/<task>/raw 2>&1 | tee /tmp/convert.log
#
# Tip: run it inside tmux/screen/nohup so the conversion keeps running after you
# disconnect, e.g.:
#   nohup bash convert_annotated.sh /path/to/dataset > /tmp/convert.out 2>&1 &

export PYTHONPATH=`pwd`

python -u -m backend.convert_cli \
    --dataset-root /data/4T-2/dataset/hewu2008/part_sorting_20261027 \
    --output-dir /data/4T-2/dataset/hewu2008/part_sorting_20261027_clean

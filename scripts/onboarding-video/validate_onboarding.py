#!/usr/bin/env python3
"""Validate the generated media package (standard library plus ffmpeg)."""
import json
from pathlib import Path
import re
import shutil
import struct
import subprocess

ROOT=Path(__file__).resolve().parent
ffprobe=shutil.which("ffprobe") or "/opt/homebrew/bin/ffprobe"
ffmpeg=shutil.which("ffmpeg") or "/opt/homebrew/bin/ffmpeg"
video=ROOT/"grifo-onboarding.mp4"
meta=json.loads(subprocess.check_output([ffprobe,"-v","error","-show_streams","-show_format","-of","json",str(video)],text=True))
v=next(x for x in meta["streams"] if x["codec_type"]=="video")
a=next(x for x in meta["streams"] if x["codec_type"]=="audio")
duration=float(meta["format"]["duration"])
assert 180 <= duration <= 300, duration
assert (v["codec_name"],v["pix_fmt"],v["width"],v["height"])==("h264","yuv420p",1280,720)
assert a["codec_name"]=="aac"
assert abs(float(a["duration"])-float(v["duration"]))<.2
assert video.stat().st_size<25*1024*1024

def seconds(s):
    h,m,s=s.split(":");return int(h)*3600+int(m)*60+float(s)

vtt=(ROOT/"grifo-onboarding.es.vtt").read_text()
assert vtt.startswith("WEBVTT\n")
cues=[]
for block in vtt.split("\n\n")[1:]:
    lines=block.strip().splitlines()
    if not lines:continue
    assert lines[0].isdigit()
    start,end=lines[1].split(" --> ")
    cues.append((seconds(start),seconds(end)," ".join(lines[2:])))
assert len(cues)>60
previous=0
for start,end,caption in cues:
    assert previous<=start+.002 and start<end<=duration+.1
    assert caption and "-->" not in caption
    assert max(len(x) for x in re.findall(r"[^\n]+",caption))<150
    previous=end

timeline=json.loads((ROOT/"timeline.json").read_text())
assert len(timeline)==16
assert abs(timeline[-1]["end"]-duration)<.2
assert all(Path(ROOT/t["image"]).exists() for t in timeline)

# Inspect real top-level MP4 atom ordering, not a string occurrence in payload.
atoms=[]
with video.open("rb") as f:
    pos=0;size=video.stat().st_size
    while pos+8<=size:
        f.seek(pos);header=f.read(8);length,kind=struct.unpack(">I4s",header)
        if length==1:length=struct.unpack(">Q",f.read(8))[0]
        if length==0:length=size-pos
        assert length>=8
        atoms.append(kind.decode("ascii"));pos+=length
assert atoms.index("moov")<atoms.index("mdat"),atoms

subprocess.run([ffmpeg,"-v","error","-i",str(video),"-f","null","-"],check=True)
result={
    "status":"passed", "duration_seconds":duration,
    "size_bytes":video.stat().st_size,"video_codec":v["codec_name"],
    "pixel_format":v["pix_fmt"],"resolution":[v["width"],v["height"]],
    "frames_per_second":v["r_frame_rate"],"audio_codec":a["codec_name"],
    "audio_channels":a["channels"],"caption_cues":len(cues),
    "last_caption_end":cues[-1][1],"slide_count":len(timeline),
    "faststart":True,"decode_errors":0,
    "caption_timing":"Synthesized sentence boundaries; shorter cue timing proportional to word count.",
    "visual_qa":"All 16 source frames inspected as a contact sheet; key frames inspected at 1280x720. Final MP4 frames separately extracted for visual comparison."
}
(ROOT/"validation.json").write_text(json.dumps(result,ensure_ascii=False,indent=2)+"\n")
print(json.dumps(result,ensure_ascii=False,indent=2))

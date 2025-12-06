// src/utils/compressVideo.js

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

const ffmpeg = new FFmpeg();

export async function compressVideo(file) {
  // Load ffmpeg core (only first time)
  if (!ffmpeg.loaded) {
    await ffmpeg.load();
  }

  const inputExt = file.name.split(".").pop() || "mp4";
  const inputName = `input.${inputExt}`;
  const outputName = "output.mp4";

  // Write original file into FFmpeg virtual FS
  await ffmpeg.writeFile(inputName, await fetchFile(file));

  // Compress:
  // - limit width to max 1920 (1080p)
  // - H.264 video, AAC audio
  // - crf 24 is good balance for 1min 100MB => ~10–20MB
  await ffmpeg.exec([
    "-i",
    inputName,
    "-vf",
    "scale='min(1920,iw)':-2", // keep aspect, max width 1920
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "24",
    "-c:a",
    "aac",
    "-b:a",
    "128k",
    outputName,
  ]);

  // Read compressed file
  const data = await ffmpeg.readFile(outputName); // Uint8Array
  const blob = new Blob([data], { type: "video/mp4" });

  // Return as File so your code can treat it like normal upload file
  return new File([blob], file.name.replace(/\.\w+$/, ".mp4"), {
    type: "video/mp4",
  });
}

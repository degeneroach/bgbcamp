// Compresses a video in the browser before upload, using the WebCodecs
// hardware encoder via mediabunny. The full-size original never leaves the
// user's machine — only the compressed MP4 is uploaded. Scales the longest
// edge down to 1280px (plenty for SOP walkthroughs) and re-encodes at a
// medium quality target, which typically turns a phone/screen recording of
// 100-300MB into a handful of MB per minute.

const MAX_EDGE = 1280;

/** WebCodecs is what does the heavy lifting; Chrome/Edge/recent Firefox. */
export function canCompressVideo(): boolean {
  return typeof window !== "undefined" && "VideoEncoder" in window;
}

export async function compressVideo(
  file: File,
  onProgress: (fraction: number) => void
): Promise<File> {
  // Dynamically imported so the library only loads when someone actually
  // adds a large video, not on every page with an editor.
  const {
    Input,
    Output,
    Conversion,
    Mp4OutputFormat,
    BufferTarget,
    BlobSource,
    ALL_FORMATS,
    QUALITY_MEDIUM,
  } = await import("mediabunny");

  const input = new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
  const videoTrack = await input.getPrimaryVideoTrack();
  if (!videoTrack) throw new Error("No video track found.");

  // Never upscale; H.264 wants even dimensions.
  const scale = Math.min(
    1,
    MAX_EDGE / Math.max(videoTrack.displayWidth, videoTrack.displayHeight)
  );
  const width = Math.round((videoTrack.displayWidth * scale) / 2) * 2;

  const target = new BufferTarget();
  const output = new Output({ format: new Mp4OutputFormat(), target });
  const conversion = await Conversion.init({
    input,
    output,
    // forceTranscode: without it, an already-H.264 source at or below the
    // size cap would be copied through untouched — bitrate and all — which
    // is exactly the "218MB screen recording" case this exists for.
    video: { width, quality: QUALITY_MEDIUM, forceTranscode: true },
  });
  if (!conversion.isValid) throw new Error("This video format can't be converted.");
  conversion.onProgress = (progress) => onProgress(progress);
  await conversion.execute();

  if (!target.buffer) throw new Error("Compression produced no output.");
  const name = file.name.replace(/\.[^.]+$/, "") + ".mp4";
  return new File([target.buffer], name, { type: "video/mp4" });
}

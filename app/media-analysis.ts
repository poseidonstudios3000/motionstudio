import { ALL_FORMATS, AudioBufferSink, BlobSource, CanvasSink, Input } from "mediabunny";
import type { TimedWord } from "./motion-composition";

export type MediaMetadata = {
  duration: number;
  width: number;
  height: number;
  size: number;
  mimeType: string;
  canPreviewVideo: boolean;
  canDecodeAudio: boolean;
};

const MAX_FILE_BYTES = 500 * 1024 * 1024;
export const MAX_ANALYSIS_SECONDS = 90;

export const inspectMedia = async (file: File): Promise<MediaMetadata> => {
  if (!file.size) throw new Error("This file is empty.");
  if (file.size > MAX_FILE_BYTES) throw new Error("Choose a video smaller than 500 MB for this prototype.");

  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  try {
    if (!(await input.canRead())) throw new Error("This media container is not supported.");
    const [duration, videoTrack, audioTrack, mimeType] = await Promise.all([
      input.computeDuration(undefined, { skipLiveWait: true }),
      input.getPrimaryVideoTrack(),
      input.getPrimaryAudioTrack(),
      input.getMimeType(),
    ]);
    if (!videoTrack) throw new Error("No video track was found in this file.");
    if (!Number.isFinite(duration) || duration <= 0) throw new Error("The video duration could not be read.");
    const [width, height, canPreviewVideo, canDecodeAudio] = await Promise.all([
      videoTrack.getDisplayWidth(),
      videoTrack.getDisplayHeight(),
      videoTrack.canDecode(),
      audioTrack ? audioTrack.canDecode() : Promise.resolve(false),
    ]);
    return { duration, width, height, size: file.size, mimeType, canPreviewVideo, canDecodeAudio };
  } finally {
    input.dispose();
  }
};

export const validateFirstVideoFrame = async (file: File) => {
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  try {
    const videoTrack = await input.getPrimaryVideoTrack();
    if (!videoTrack) throw new Error("No video track was found in this file.");
    if (!(await videoTrack.canDecode())) throw new Error("This video codec cannot be decoded for export.");
    const firstTimestamp = await videoTrack.getFirstTimestamp();
    const frame = await new CanvasSink(videoTrack, { width: 64 }).getCanvas(firstTimestamp);
    if (!frame) throw new Error("The first source frame could not be decoded for export.");
  } finally {
    input.dispose();
  }
};

const resample = (input: Float32Array, sourceRate: number, targetRate = 16_000) => {
  if (sourceRate === targetRate) return input;
  const ratio = sourceRate / targetRate;
  const output = new Float32Array(Math.max(1, Math.floor(input.length / ratio)));
  for (let index = 0; index < output.length; index++) {
    const sourceIndex = index * ratio;
    const left = Math.floor(sourceIndex);
    const right = Math.min(input.length - 1, left + 1);
    const mix = sourceIndex - left;
    output[index] = input[left] * (1 - mix) + input[right] * mix;
  }
  return output;
};

export const extractSpeechAudio = async (file: File, seconds = MAX_ANALYSIS_SECONDS) => {
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  try {
    const track = await input.getPrimaryAudioTrack();
    if (!track) throw new Error("No audio track was found. Add a transcript manually to continue.");
    if (!(await track.canDecode())) throw new Error("This audio codec cannot be decoded in your browser. Add a transcript manually or normalize the file to H.264/AAC.");
    const sink = new AudioBufferSink(track);
    const parts: Float32Array[] = [];
    let totalLength = 0;

    for await (const { buffer } of sink.buffers(0, seconds)) {
      const mono = new Float32Array(buffer.length);
      for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
        const data = buffer.getChannelData(channel);
        for (let index = 0; index < data.length; index++) mono[index] += data[index] / buffer.numberOfChannels;
      }
      const part = resample(mono, buffer.sampleRate);
      parts.push(part);
      totalLength += part.length;
    }

    if (!totalLength) throw new Error("The audio track is silent or could not be decoded.");
    const audio = new Float32Array(totalLength);
    let offset = 0;
    for (const part of parts) {
      audio.set(part, offset);
      offset += part.length;
    }
    return audio;
  } finally {
    input.dispose();
  }
};

export const normalizeTimedWords = (chunks: Array<{ text?: string; timestamp?: [number | null, number | null] }> | undefined): TimedWord[] =>
  (chunks ?? [])
    .map((chunk) => ({
      text: chunk.text?.trim() ?? "",
      start: Math.max(0, chunk.timestamp?.[0] ?? 0),
      end: Math.max(chunk.timestamp?.[0] ?? 0, chunk.timestamp?.[1] ?? chunk.timestamp?.[0] ?? 0),
    }))
    .filter((word) => word.text.length > 0);

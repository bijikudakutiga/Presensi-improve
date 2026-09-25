import { useEffect, useRef, useState } from "react";

interface Props {
  onCapture: (blob: Blob, previewUrl: string) => void;
  onClear: () => void;
  capturedUrl: string | null;
}

export function CameraCapture({ onCapture, onClear, capturedUrl }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (capturedUrl) return; // don't run camera when a photo is already captured
    let cancelled = false;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setReady(true);
        }
      } catch {
        setError(
          "Tidak bisa mengakses kamera. Pastikan izin kamera diaktifkan."
        );
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [capturedUrl]);

  function takePhoto() {
    const video = videoRef.current;
    if (!video) return;

    // Ukuran akhir foto dibuat kecil & tetap (persegi) supaya file jauh lebih ringan
    // — cukup untuk verifikasi kehadiran, tidak perlu resolusi tinggi.
    const TARGET_SIZE = 320;
    const JPEG_QUALITY = 0.5;

    const srcSize = Math.min(video.videoWidth, video.videoHeight);
    const srcX = (video.videoWidth - srcSize) / 2;
    const srcY = (video.videoHeight - srcSize) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = TARGET_SIZE;
    canvas.height = TARGET_SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror horizontally so the photo matches what the user sees in the preview.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, srcX, srcY, srcSize, srcSize, 0, 0, TARGET_SIZE, TARGET_SIZE);
    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          onCapture(blob, url);
        }
      },
      "image/jpeg",
      JPEG_QUALITY
    );
  }

  if (capturedUrl) {
    return (
      <div className="space-y-3">
        <img
          src={capturedUrl}
          alt="Foto presensi"
          className="w-full max-w-xs mx-auto rounded-lg border border-line aspect-square object-cover"
        />
        <button type="button" className="btn-outline w-full" onClick={onClear}>
          Ambil ulang foto
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-sm text-rust">{error}</p>
      ) : (
        <div className="relative w-full max-w-xs mx-auto aspect-square overflow-hidden rounded-lg border border-line bg-ink/5">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="h-full w-full object-cover [transform:scaleX(-1)]"
          />
        </div>
      )}
      <button
        type="button"
        className="btn-primary w-full"
        onClick={takePhoto}
        disabled={!ready}
      >
        Ambil foto
      </button>
    </div>
  );
}

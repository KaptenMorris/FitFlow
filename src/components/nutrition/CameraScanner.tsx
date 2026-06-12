import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCw, Loader2, Sparkles, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { recognizeFoodFromImage } from "@/lib/food.functions";
import { toast } from "sonner";

export type ScanResult = {
  name: string;
  serving: string;
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
};

export function CameraScanner({
  open,
  onOpenChange,
  onResult,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onResult: (r: ScanResult) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState(false);
  const recognize = useServerFn(recognizeFoodFromImage);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function startCamera() {
    setError(null);
    setSnapshot(null);
    setStarting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Kameran stöds inte i denna webbläsare");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
    } catch (e: any) {
      setError(e?.message ?? "Kunde inte starta kameran");
    } finally {
      setStarting(false);
    }
  }

  useEffect(() => {
    if (open) startCamera();
    return () => stopStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function snap() {
    const video = videoRef.current;
    if (!video) return;
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return toast.error("Kameran är inte redo ännu");
    const max = 1280;
    const scale = Math.min(1, max / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    setSnapshot(canvas.toDataURL("image/jpeg", 0.85));
    stopStream();
  }

  async function analyze(base64: string) {
    setBusy(true);
    try {
      const r = await recognize({ data: { imageBase64: base64 } });
      onResult(r);
      toast.success(`Identifierade: ${r.name}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Kunde inte tolka bilden");
    } finally {
      setBusy(false);
    }
  }

  function retake() {
    setSnapshot(null);
    startCamera();
  }

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const b64 = reader.result as string;
      setSnapshot(b64);
      stopStream();
    };
    reader.readAsDataURL(file);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { stopStream(); setSnapshot(null); setError(null); } onOpenChange(o); }}>
      <DialogContent className="max-w-md p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" /> Skanna mat med AI
          </DialogTitle>
        </DialogHeader>

        <div className="relative bg-black aspect-[4/3] mt-2">
          {snapshot ? (
            <img src={snapshot} alt="Förhandsvisning" className="absolute inset-0 w-full h-full object-cover" />
          ) : (
            <video ref={videoRef} playsInline muted className="absolute inset-0 w-full h-full object-cover" />
          )}
          {starting && !snapshot && (
            <div className="absolute inset-0 grid place-items-center text-white/80 text-xs gap-2">
              <Loader2 className="h-5 w-5 animate-spin" /> Startar kamera…
            </div>
          )}
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-black/60 text-white text-xs gap-2">
              <Sparkles className="h-5 w-5 animate-pulse text-primary" />
              AI analyserar makros…
            </div>
          )}
          {error && !snapshot && (
            <div className="absolute inset-0 grid place-items-center bg-black/70 p-4 text-center">
              <div className="space-y-2">
                <X className="h-6 w-6 text-rose-400 mx-auto" />
                <p className="text-xs text-white/90">{error}</p>
                <p className="text-[10px] text-white/60">Tillåt kameran i webbläsaren, eller välj en bild från enheten.</p>
              </div>
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
        />

        <DialogFooter className="p-4 gap-2 sm:gap-2 flex-row">
          {!snapshot ? (
            <>
              <Button variant="outline" className="flex-1" onClick={() => fileRef.current?.click()} disabled={busy}>
                Välj bild
              </Button>
              <Button className="flex-1" onClick={snap} disabled={!!error || starting || busy}>
                <Camera className="h-4 w-4 mr-1" /> Ta foto
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" className="flex-1" onClick={retake} disabled={busy}>
                <RefreshCw className="h-4 w-4 mr-1" /> Ta om
              </Button>
              <Button className="flex-1" onClick={() => analyze(snapshot)} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
                Analysera
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
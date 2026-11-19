import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Loader2, RotateCcw, Star, X } from "lucide-react";
import { uploadFile } from "../lib/upload";
import { cn } from "../lib/utils";

export interface Photo {
  id: string;
  /** Storage key once uploaded (or the existing key of a photo already on the listing). */
  key?: string;
  url: string;
  status: "uploading" | "done" | "error";
  error?: string;
  file?: File;
}

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];

export function photosFromListing(images: { key?: string; url?: string }[] = []): Photo[] {
  return images
    .filter((image) => image.url || image.key)
    .map((image, index) => ({ id: `existing-${index}-${image.key || image.url}`, key: image.key || image.url, url: image.url || image.key!, status: "done" as const }));
}

export function readyKeys(photos: Photo[]) {
  return photos.filter((photo) => photo.status === "done" && photo.key).map((photo) => photo.key!);
}

/**
 * Multi-photo picker for listings: drop or choose several photos, see each upload,
 * reorder by dragging (or the arrow buttons on touch screens), pick the cover, remove.
 * The first photo is the cover shown on cards.
 */
export function PhotoUploader({ photos, setPhotos, max = 10 }: { photos: Photo[]; setPhotos: Dispatch<SetStateAction<Photo[]>>; max?: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [notice, setNotice] = useState("");

  function update(id: string, patch: Partial<Photo>) {
    setPhotos((current) => current.map((photo) => (photo.id === id ? { ...photo, ...patch } : photo)));
  }

  async function upload(photo: Photo) {
    if (!photo.file) return;
    update(photo.id, { status: "uploading", error: undefined });
    try {
      const result = await uploadFile(photo.file, "product_image");
      update(photo.id, { status: "done", key: result.key, url: result.url || photo.url });
    } catch (error) {
      update(photo.id, { status: "error", error: error instanceof Error ? error.message : "Upload failed" });
    }
  }

  function addFiles(list: FileList | File[]) {
    setNotice("");
    const files = [...list].filter((file) => ACCEPT.includes(file.type));
    if (files.length < [...list].length) setNotice("Only JPG, PNG and WebP photos can be added.");
    const room = max - photos.length;
    if (room <= 0) {
      setNotice(`You can add up to ${max} photos.`);
      return;
    }
    if (files.length > room) setNotice(`Only the first ${room} photo${room === 1 ? "" : "s"} were added (limit ${max}).`);
    const added = files.slice(0, room).map((file) => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: URL.createObjectURL(file),
      status: "uploading" as const,
      file,
    }));
    setPhotos((current) => [...current, ...added]);
    for (const photo of added) void upload(photo);
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= photos.length || from === to) return;
    setPhotos((current) => {
      const next = [...current];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item!);
      return next;
    });
  }

  const uploading = photos.some((photo) => photo.status === "uploading");
  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[14px] font-semibold text-ink">Photos <span className="font-normal text-muted">· {photos.length} / {max}</span></p>
        <p className="text-[12px] text-muted">The first photo is the cover. Drag to reorder.</p>
      </div>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-5">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            draggable={photo.status === "done"}
            onDragStart={() => setDragIndex(index)}
            onDragEnd={() => setDragIndex(null)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              if (dragIndex !== null) move(dragIndex, index);
              setDragIndex(null);
            }}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-2xl bg-canvas ring-1 transition",
              index === 0 ? "ring-2 ring-brand-500" : "ring-line",
              dragIndex === index && "opacity-40",
              photo.status === "done" && "cursor-grab active:cursor-grabbing",
            )}
          >
            <img src={photo.url} alt={`Photo ${index + 1}`} className="h-full w-full object-cover" draggable={false} />
            {index === 0 ? (
              <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-brand-gradient px-2 py-0.5 text-[10px] font-bold text-white shadow-glow">
                <Star size={10} className="fill-white" /> Cover
              </span>
            ) : null}
            <button
              type="button"
              onClick={() => setPhotos((current) => current.filter((item) => item.id !== photo.id))}
              aria-label={`Remove photo ${index + 1}`}
              className="absolute top-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-ink/75 text-white backdrop-blur transition hover:bg-danger"
            >
              <X size={14} />
            </button>
            {photo.status === "uploading" ? (
              <div className="absolute inset-0 grid place-items-center bg-white/60 backdrop-blur-[1px]">
                <Loader2 size={22} className="animate-spin text-brand-600" />
              </div>
            ) : null}
            {photo.status === "error" ? (
              <div className="absolute inset-0 grid place-items-center bg-red-50/90 p-2 text-center">
                <div>
                  <p className="text-[11px] font-semibold text-danger">Upload failed</p>
                  <button type="button" onClick={() => void upload(photo)} className="mt-1 inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold ring-1 ring-line">
                    <RotateCcw size={11} /> Retry
                  </button>
                </div>
              </div>
            ) : null}
            {photo.status === "done" && photos.length > 1 ? (
              <div className="absolute inset-x-1.5 bottom-1.5 flex items-center justify-between gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
                <button type="button" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label="Move left" className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-ink shadow-card disabled:opacity-0">
                  <ArrowLeft size={13} />
                </button>
                {index !== 0 ? (
                  <button type="button" onClick={() => move(index, 0)} className="rounded-full bg-white/95 px-2 py-1 text-[10px] font-bold text-ink shadow-card">
                    Make cover
                  </button>
                ) : null}
                <button type="button" onClick={() => move(index, index + 1)} disabled={index === photos.length - 1} aria-label="Move right" className="grid h-7 w-7 place-items-center rounded-full bg-white/95 text-ink shadow-card disabled:opacity-0">
                  <ArrowRight size={13} />
                </button>
              </div>
            ) : null}
          </div>
        ))}
        {photos.length < max ? (
          <button
            type="button"
            onClick={() => input.current?.click()}
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragOver(false);
              if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
            }}
            className={cn(
              "flex aspect-square flex-col items-center justify-center gap-1.5 rounded-2xl border-2 border-dashed text-center transition",
              dragOver ? "border-brand-500 bg-brand-50" : "border-brand-200 bg-white hover:border-brand-400 hover:bg-brand-50",
            )}
          >
            <span className="grid h-10 w-10 place-items-center rounded-full bg-brand-gradient text-white shadow-glow"><ImagePlus size={18} /></span>
            <span className="px-2 text-[12px] font-semibold text-brand-800">{photos.length ? "Add more" : "Add photos"}</span>
            <span className="hidden px-2 text-[10px] text-muted sm:block">or drop them here</span>
          </button>
        ) : null}
      </div>
      <input
        ref={input}
        type="file"
        accept={ACCEPT.join(",")}
        multiple
        className="sr-only"
        onChange={(event) => {
          if (event.target.files?.length) addFiles(event.target.files);
          event.target.value = "";
        }}
      />
      {notice ? <p className="text-[12px] text-amber-700">{notice}</p> : null}
      {uploading ? <p className="text-[12px] text-muted">Uploading… you can keep filling in the form.</p> : null}
      <p className="text-[12px] text-muted">Tip: show the front, back, sides, screen on, and any scratches. Clear photos get more chats.</p>
    </div>
  );
}

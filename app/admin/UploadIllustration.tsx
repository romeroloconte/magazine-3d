"use client";

import { useState } from "react";
import { upload } from "@vercel/blob/client";
import { illustrationSrc } from "@/lib/illustration";
import { Icon } from "./Icon";

/* Shrinks the image in the browser: max 2000 px per side, WebP quality 0.82 (usually 200–600 KB). */
async function compress(file: File): Promise<File> {
  try {
    const img = await createImageBitmap(file);
    const max = 2000;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.82));
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp" });
  } catch {
    return file;
  }
}

/* Uploads an image to Vercel Blob from the browser and stores its URL in a hidden form field. */
export function UploadIllustration({ name, label, initial, onChange }: {
  name: string; label: string; initial: string | null; onChange?: (v: string | null) => void;
}) {
  const [value, setValueInternal] = useState(initial ?? "");
  const setValue = (v: string) => { setValueInternal(v); onChange?.(v || null); };
  const [status, setStatus] = useState<"" | "uploading" | "error">("");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setStatus("uploading");
    setMessage("");
    setProgress(0);
    try {
      const small = await compress(file);
      const blob = await upload(`illustrations/${small.name}`, small, {
        access: "public",
        handleUploadUrl: "/api/illustrations",
        onUploadProgress: (p) => setProgress(Math.round(p.percentage)),
      });
      setValue(blob.url);
      setStatus("");
    } catch (err) {
      console.error(err);
      setMessage((err as Error)?.message ?? "");
      setStatus("error");
    }
  };

  return (
    <div className="upload">
      <span>{label}</span>
      <input type="hidden" name={name} value={value} />
      {value && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={illustrationSrc(value)} alt="" className="upload-preview" />
      )}
      <div className="actions">
        <label className="admin-button">
          <Icon name="image" />{value ? "Change image" : "Choose image"}
          <input type="file" accept="image/*" onChange={pick} hidden disabled={status === "uploading"} />
        </label>
        {value && <button type="button" onClick={() => setValue("")}><Icon name="close" />Remove</button>}
      </div>
      {status === "uploading" && <span className="hint">Uploading… {progress}%</span>}
      {status === "error" && <p className="error">Couldn&apos;t upload the image. {message && <> ({message})</>}</p>}
    </div>
  );
}

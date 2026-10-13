import React, { useState, useRef } from "react";
import { UploadCloud, X } from "lucide-react";
import { supabase } from "../config/supabase";
import {detectImage} from "../../shared/image-validation";

interface ImageDropZoneProps {
  value?: string; // URL firmada de Storage o Base64 legacy
  onChange: (value: string) => void;
  label?: string;
  maxSizeMB?: number;
  /** Carpeta dentro del bucket menu-images: usar `restaurant_id` o `restaurant_id/menu_item_id` */
  storagePath?: string;
  /** Si true, sube a Storage. Si false, usa base64 (legacy). Default: true si supabase real está activo. */
  useStorage?: boolean;
}



export const ImageDropZone: React.FC<ImageDropZoneProps> = ({
  value,
  onChange,
  label = "Imagen del Plato",
  maxSizeMB = 2,
  storagePath,
  useStorage,
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview,setPreview]=useState<{url:string;value:string}|null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Detectar si Supabase real está activo (no mock)
  const shouldUseStorage =
    useStorage ?? !!storagePath;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const processFile = async (file: File) => {
    setError(null);

    if (!detectImage(new Uint8Array(await file.arrayBuffer()))) {
      setError("Por favor, selecciona solo archivos de imagen (PNG, JPG, JPEG, WEBP)");
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`La imagen es demasiado grande. El tamaño máximo permitido es ${maxSizeMB}MB`);
      return;
    }

    try {
      // Comprimir siempre (reduce tamaño incluso para Storage)
      const compressedBlob = await compressAndResizeImage(file);

      if (shouldUseStorage && storagePath) {
        setUploading(true);
        const form=new FormData();
        form.set("restaurant_id",storagePath.split("/")[0]);
        form.set("file",new File([compressedBlob],"image.jpg",{type:"image/jpeg"}));
        const {data,error:uploadError}=await supabase.functions.invoke("menu-image",{body:form});
        if(uploadError || !data?.url)throw new Error("image_upload_failed");
        if(preview)URL.revokeObjectURL(preview.url);
        setPreview({url:URL.createObjectURL(compressedBlob),value:data.url});
        onChange(data.url);
      } else {
        // Legacy: base64 (cuando no hay storagePath o modo mock)
        const reader = new FileReader();
        reader.readAsDataURL(compressedBlob);
        reader.onload = () => onChange(reader.result as string);
      }
    } catch (err) {
      console.error("Error procesando imagen:", err);
      setError(
        shouldUseStorage
          ? "Ocurrió un error al subir la imagen a Storage. Verifica tu conexión e inténtalo de nuevo."
          : "Ocurrió un error al procesar la imagen."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  /**
   * Comprime y redimensiona la imagen antes de subir.
   * Devuelve un Blob (más eficiente que base64).
   */
  const compressAndResizeImage = (
    file: File,
    maxWidth = 800,
    maxHeight = 800,
    quality = 0.7
  ): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Failed to create blob"));
            },
            "image/jpeg",
            quality
          );
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const onZoneClick = () => {
    if (!uploading) fileInputRef.current?.click();
  };

  const removeImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Remove the reference; asset cleanup requires an explicit reviewed operation.
    if(preview)URL.revokeObjectURL(preview.url);setPreview(null);
    onChange("");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={onZoneClick}
        className={`relative w-full rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-all duration-200 overflow-hidden flex flex-col items-center justify-center min-h-[160px] ${
          uploading ? "opacity-60 cursor-wait" : ""
        } ${
          value
            ? "border-zinc-300 bg-zinc-50"
            : isDragActive
            ? "border-red-500 bg-red-50/40"
            : "border-border bg-white hover:border-accent/40"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileInput}
          disabled={uploading}
        />

        {uploading ? (
          <div className="space-y-2 pointer-events-none select-none">
            <div className="mx-auto w-12 h-12 rounded-full bg-zinc-50 border flex items-center justify-center animate-pulse">
              <UploadCloud className="w-6 h-6 text-accent" />
            </div>
            <p className="text-sm text-text-secondary">Subiendo imagen...</p>
          </div>
        ) : value ? (
          <div className="relative w-full h-full min-h-[140px] flex items-center justify-center group">
            <img
              src={preview?.value===value?preview.url:value}
              alt="Preview"
              className="max-h-[160px] rounded-lg object-contain"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg flex items-center justify-center">
              <button
                type="button"
                onClick={removeImage}
                className="bg-red-600 text-white p-2.5 rounded-full hover:bg-red-700 transition-colors shadow-lg active:scale-95"
                title="Eliminar imagen"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <button
              type="button"
              onClick={removeImage}
              className="absolute top-1 right-1 bg-zinc-900/80 text-white p-1 rounded-full hover:bg-red-650 transition-colors z-10 lg:hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="space-y-2 pointer-events-none select-none">
            <div className="mx-auto w-12 h-12 rounded-full bg-zinc-50 border flex items-center justify-center text-text-secondary group-hover:scale-105 transition-transform duration-200">
              <UploadCloud className="w-6 h-6 text-zinc-500" />
            </div>
            <div className="text-sm">
              <span className="font-semibold text-accent hover:underline">
                Haz clic para subir
              </span>{" "}
              o arrastra y suelta tu archivo
            </div>
            <p className="text-xs text-text-secondary">
              Soporta PNG, JPG, JPEG, WEBP (Máx. {maxSizeMB}MB)
              {shouldUseStorage && " · Subido a Storage"}
            </p>
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-sm text-error">{error}</p>}
    </div>
  );
};

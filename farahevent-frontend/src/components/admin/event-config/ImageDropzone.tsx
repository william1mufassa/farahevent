'use client';

import { useRef, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Zone d'image (CONCEPTION_FRONTEND.md §10.3) : drag-drop + aperçu + barre de
 * progression. Mock : lecture data-URL (pas d'upload backend) ; fallback URL.
 */
export function ImageDropzone({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Fichier image requis.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image trop lourde (5 Mo max).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setProgress(0);
      let p = 0;
      const id = setInterval(() => {
        p += 20;
        setProgress(p);
        if (p >= 100) {
          clearInterval(id);
          setProgress(null);
          onChange(reader.result as string);
        }
      }, 80);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) handleFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'relative flex aspect-[16/7] cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors',
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40',
        )}
      >
        {value ? (
          // Data-URL possible → <img> plutôt que next/image.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="text-center text-muted-foreground">
            <ImagePlus className="mx-auto h-8 w-8" />
            <p className="mt-1 text-xs">Déposer une image ou cliquer</p>
          </div>
        )}
        {progress !== null && (
          <div className="absolute inset-x-0 bottom-0 h-1 bg-black/10">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
        {value && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
            aria-label="Retirer l'image"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
          >
            <X className="h-4 w-4" />
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = '';
          }}
        />
      </div>
      <input
        value={value.startsWith('data:') ? '' : value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="…ou coller une URL d'image"
        className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring/40"
      />
    </div>
  );
}

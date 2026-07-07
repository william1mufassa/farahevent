'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Camera, ImageIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SOFT_BORDER } from '@/lib/styles';
import { FieldError } from './FieldError';

const MAX_SIZE = 5 * 1024 * 1024; // 5 Mo
const ACCEPTED = ['image/jpeg', 'image/png'];

/**
 * Upload du reçu de transfert (CDC §4.3) : deux boutons distincts
 * (caméra / galerie), JPEG-PNG ≤ 5 Mo, aperçu cliquable pour agrandir.
 */
export function ReceiptUpload({
  file,
  onChange,
}: {
  file: File | null;
  onChange: (file: File | null) => void;
}) {
  const t = useTranslations('manualProof');
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFile = (selected: File | undefined) => {
    if (!selected) return;
    if (!ACCEPTED.includes(selected.type)) {
      setError(t('fileType'));
      onChange(null);
      return;
    }
    if (selected.size > MAX_SIZE) {
      setError(t('fileTooBig'));
      onChange(null);
      return;
    }
    setError(null);
    onChange(selected);
  };

  return (
    <div className="space-y-3">
      <input
        ref={cameraRef}
        type="file"
        accept="image/jpeg,image/png"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        <UploadButton
          icon={<Camera className="h-4 w-4" />}
          label={t('takePhoto')}
          onClick={() => cameraRef.current?.click()}
        />
        <UploadButton
          icon={<ImageIcon className="h-4 w-4" />}
          label={t('fromGallery')}
          onClick={() => galleryRef.current?.click()}
        />
      </div>
      <p className="text-xs opacity-60">{t('fileHint')}</p>
      <FieldError message={error ?? undefined} />

      {preview && file && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="relative h-24 w-24 shrink-0 overflow-hidden rounded-md border"
            style={SOFT_BORDER}
            aria-label={file.name}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="h-full w-full object-cover" />
          </button>
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-xs opacity-60">{(file.size / 1024 / 1024).toFixed(2)} Mo</p>
          </div>
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setError(null);
            }}
            className="ml-auto p-1 opacity-60 transition hover:opacity-100"
            aria-label={t('remove')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {zoomed && preview && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setZoomed(false)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="" className="max-h-full max-w-full rounded-md" />
        </div>
      )}
    </div>
  );
}

function UploadButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-2 rounded-md border px-3 py-2.5 text-sm font-medium transition hover:bg-black/[0.03]',
      )}
      style={SOFT_BORDER}
    >
      <span className="text-[var(--color-primary)]">{icon}</span>
      {label}
    </button>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Camera, CheckCircle2, QrCode, XCircle } from 'lucide-react';

import type { Html5Qrcode as Html5QrcodeCls } from 'html5-qrcode';
import { scanTicket } from '@/lib/api/admin/scan';
import { toApiError } from '@/lib/api';
import { cn } from '@/lib/utils';
import type { ScanResponse } from '@/types/admin';

const REASONS: Record<string, string> = {
  invalid_token: 'QR code invalide ou corrompu',
  ticket_not_found: 'Billet introuvable',
  already_scanned: 'Billet déjà scanné',
  wrong_event: 'Billet pour un autre événement',
  event_not_open: "L'événement n'est pas encore ouvert",
  wrong_ticket_type: "Ce n'est pas un billet présentiel",
  order_not_paid: 'Commande non payée',
};

const BEEP_OK =
  'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQ4AAAB/f39/f39/f39/f39/fw==';
const BEEP_KO =
  'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQ4AAABhYWFhYWFhYWFhYWFhYQ==';

interface Recent {
  res: ScanResponse;
  at: number;
}

export default function ScanPage() {
  const [mode, setMode] = useState<'idle' | 'camera'>('idle');
  const [overlay, setOverlay] = useState<ScanResponse | null>(null);
  const [recent, setRecent] = useState<Recent[]>([]);
  const [manual, setManual] = useState('');

  const scannerRef = useRef<Html5QrcodeCls | null>(null);
  const lockUntil = useRef(0);
  const beepOk = useRef<HTMLAudioElement | null>(null);
  const beepKo = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    beepOk.current = new Audio(BEEP_OK);
    beepKo.current = new Audio(BEEP_KO);
  }, []);

  const process = useCallback(async (token: string) => {
    // Verrou 3 s anti double-lecture.
    if (Date.now() < lockUntil.current) return;
    lockUntil.current = Date.now() + 3000;
    try {
      const res = await scanTicket(token);
      (res.valid ? beepOk : beepKo).current?.play().catch(() => {});
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(res.valid ? 80 : [70, 50, 70]);
      }
      setOverlay(res);
      setRecent((prev) => [{ res, at: Date.now() }, ...prev].slice(0, 20));
      setTimeout(() => setOverlay(null), 2500);
    } catch (err) {
      lockUntil.current = 0;
      toast.error(toApiError(err).message);
    }
  }, []);

  const startCamera = useCallback(async () => {
    setMode('camera');
    const { Html5Qrcode } = await import('html5-qrcode');
    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;
    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        (decoded: string) => process(decoded),
        () => {},
      );
    } catch {
      toast.error("Impossible d'accéder à la caméra.");
      setMode('idle');
    }
  }, [process]);

  const stopCamera = useCallback(() => {
    scannerRef.current?.stop().catch(() => {});
    scannerRef.current = null;
    setMode('idle');
  }, []);

  useEffect(() => () => void scannerRef.current?.stop().catch(() => {}), []);

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Scan des billets</h1>
        <p className="text-sm text-muted-foreground">Contrôle des entrées sur site.</p>
      </div>

      {mode === 'camera' ? (
        <div className="space-y-3">
          <div id="qr-reader" className="mx-auto overflow-hidden rounded-xl border border-border" />
          <button
            type="button"
            onClick={stopCamera}
            className="w-full rounded-xl border border-input py-3 text-sm font-semibold transition hover:bg-muted"
          >
            Arrêter la caméra
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <button
            type="button"
            onClick={startCamera}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-base font-semibold text-primary-foreground transition hover:opacity-90"
          >
            <Camera className="h-5 w-5" /> Ouvrir la caméra
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manual.trim()) {
                process(manual.trim());
                setManual('');
              }
            }}
            className="flex gap-2"
          >
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Saisie manuelle du QR…"
              className="h-11 flex-1 rounded-xl border border-input bg-background px-3 text-sm outline-none transition focus:ring-2 focus:ring-ring/40"
            />
            <button
              type="submit"
              disabled={!manual.trim()}
              className="rounded-xl border border-input px-4 text-sm font-semibold transition hover:bg-muted disabled:opacity-40"
            >
              Vérifier
            </button>
          </form>
        </div>
      )}

      {recent.length > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <p className="border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Derniers scans
          </p>
          <ul className="divide-y divide-border">
            {recent.map((r, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                {r.res.valid ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                ) : (
                  <XCircle className="h-5 w-5 shrink-0 text-red-500" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {r.res.participant_name ?? (r.res.valid ? 'Billet valide' : REASONS[r.res.reason ?? ''] ?? 'Refusé')}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.res.formula_name ? `${r.res.formula_name} · ` : ''}
                    {new Date(r.at).toLocaleTimeString('fr-FR')}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {overlay && (
        <div
          onClick={() => setOverlay(null)}
          className={cn(
            'fixed inset-0 z-50 flex flex-col items-center justify-center px-6 text-center text-white',
            overlay.valid ? 'bg-emerald-600' : 'bg-red-600',
          )}
        >
          {overlay.valid ? <CheckCircle2 className="h-24 w-24" /> : <XCircle className="h-24 w-24" />}
          <p className="mt-4 text-3xl font-bold uppercase tracking-wide">
            {overlay.valid ? 'Accès validé' : 'Accès refusé'}
          </p>
          {overlay.valid ? (
            <>
              {overlay.participant_name && <p className="mt-3 text-xl font-semibold">{overlay.participant_name}</p>}
              {overlay.formula_name && (
                <span className="mt-2 rounded-full bg-white/20 px-3 py-1 text-sm font-medium">
                  {overlay.formula_name}
                </span>
              )}
            </>
          ) : (
            <>
              <p className="mt-3 text-lg font-medium">{REASONS[overlay.reason ?? ''] ?? 'Billet refusé'}</p>
              {overlay.reason === 'already_scanned' && overlay.first_scan_at && (
                <p className="mt-2 text-sm text-white/80">
                  1ᵉʳ scan : {new Date(overlay.first_scan_at).toLocaleString('fr-FR')}
                  {overlay.first_scan_by ? ` · ${overlay.first_scan_by}` : ''}
                </p>
              )}
            </>
          )}
          <p className="mt-8 text-sm text-white/70">Toucher pour continuer</p>
        </div>
      )}
    </div>
  );
}

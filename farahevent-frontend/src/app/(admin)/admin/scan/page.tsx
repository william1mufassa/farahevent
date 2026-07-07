'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { adminApi } from '@/lib/admin-api';
import { toApiError } from '@/lib/api';
import type { ScanResponse } from '@/types/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

type ScanState = 'idle' | 'scanning' | 'loading' | 'result';

export default function ScanPage() {
  const [state, setState] = useState<ScanState>('idle');
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [manualToken, setManualToken] = useState('');
  const scannerRef = useRef<HTMLDivElement>(null);
  const html5QrRef = useRef<any>(null);

  const beepValid = useRef<HTMLAudioElement | null>(null);
  const beepInvalid = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      beepValid.current = new Audio(
        'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQ4AAAB/f39/f39/f39/f39/fw==',
      );
      beepInvalid.current = new Audio(
        'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQ4AAABhYWFhYWFhYWFhYWFhYQ==',
      );
    }
  }, []);

  const processToken = useCallback(async (token: string) => {
    if (state === 'loading') return;
    setState('loading');
    try {
      const { data } = await adminApi.post<ScanResponse>('/tickets/scan', {
        qr_token: token,
      });
      setResult(data);
      setState('result');

      if (data.valid) {
        beepValid.current?.play().catch(() => {});
      } else {
        beepInvalid.current?.play().catch(() => {});
      }
    } catch (err) {
      toast.error(toApiError(err).message);
      setState('idle');
    }
  }, [state]);

  async function startScanner() {
    setState('scanning');
    setResult(null);

    const { Html5Qrcode } = await import('html5-qrcode');

    if (html5QrRef.current) {
      try {
        await html5QrRef.current.stop();
      } catch {}
    }

    const scanner = new Html5Qrcode('qr-reader');
    html5QrRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decoded: string) => {
          try {
            await scanner.stop();
          } catch {}
          html5QrRef.current = null;
          processToken(decoded);
        },
        () => {},
      );
    } catch (err) {
      toast.error('Impossible d\'acceder a la camera.');
      setState('idle');
    }
  }

  function stopScanner() {
    if (html5QrRef.current) {
      html5QrRef.current.stop().catch(() => {});
      html5QrRef.current = null;
    }
    setState('idle');
  }

  useEffect(() => {
    return () => {
      if (html5QrRef.current) {
        html5QrRef.current.stop().catch(() => {});
      }
    };
  }, []);

  function resetScan() {
    setResult(null);
    setState('idle');
  }

  return (
    <div className="mx-auto max-w-md space-y-6">
      <h1 className="text-2xl font-bold text-center">Scanner QR</h1>

      {state === 'idle' && (
        <div className="space-y-4">
          <Button onClick={startScanner} className="w-full" size="lg">
            Ouvrir la camera
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">ou saisie manuelle</span>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualToken.trim()) processToken(manualToken.trim());
            }}
            className="flex gap-2"
          >
            <Input
              placeholder="Coller le contenu du QR..."
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!manualToken.trim()}>
              Verifier
            </Button>
          </form>
        </div>
      )}

      {state === 'scanning' && (
        <div className="space-y-4">
          <div
            id="qr-reader"
            ref={scannerRef}
            className="mx-auto overflow-hidden rounded-lg"
            style={{ maxWidth: 350 }}
          />
          <Button onClick={stopScanner} variant="outline" className="w-full">
            Arreter
          </Button>
        </div>
      )}

      {state === 'loading' && (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Verification en cours...</p>
          </CardContent>
        </Card>
      )}

      {state === 'result' && result && (
        <div className="space-y-4">
          <Card
            className={
              result.valid
                ? 'border-2 border-emerald-500 bg-emerald-50'
                : 'border-2 border-red-500 bg-red-50'
            }
          >
            <CardHeader className="pb-2 text-center">
              <div className="text-5xl">{result.valid ? '✅' : '❌'}</div>
              <CardTitle className={result.valid ? 'text-emerald-700' : 'text-red-700'}>
                {result.valid ? 'ACCES VALIDE' : 'ACCES REFUSE'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {result.valid ? (
                <>
                  {result.participant_name && (
                    <div className="text-center text-lg font-bold">{result.participant_name}</div>
                  )}
                  {result.event_name && (
                    <div className="text-center text-muted-foreground">{result.event_name}</div>
                  )}
                  {result.formula_name && (
                    <div className="text-center">
                      <Badge>{result.formula_name}</Badge>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-center font-medium text-red-700">
                    {reasonLabel(result.reason)}
                  </div>
                  {result.reason === 'already_scanned' && (
                    <div className="rounded-md bg-red-100 p-3 text-xs">
                      {result.participant_name && <p>Participant : {result.participant_name}</p>}
                      {result.first_scan_at && (
                        <p>Premier scan : {new Date(result.first_scan_at).toLocaleString('fr')}</p>
                      )}
                      {result.first_scan_by && <p>Par : {result.first_scan_by}</p>}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Button onClick={resetScan} className="w-full" size="lg">
            Scanner un autre billet
          </Button>
        </div>
      )}
    </div>
  );
}

function reasonLabel(reason: string | null): string {
  const labels: Record<string, string> = {
    invalid_token: 'QR code invalide ou corrompu',
    ticket_not_found: 'Billet introuvable',
    already_scanned: 'Billet deja scanne !',
    wrong_event: 'Billet pour un autre evenement',
    event_not_open: 'L\'evenement n\'est pas encore ouvert',
    wrong_ticket_type: 'Ce n\'est pas un billet presentiel',
    order_not_paid: 'Commande non payee',
  };
  return labels[reason ?? ''] ?? reason ?? 'Erreur inconnue';
}

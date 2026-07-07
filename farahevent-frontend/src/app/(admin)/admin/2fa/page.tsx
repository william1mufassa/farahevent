'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ShieldCheck, ShieldOff } from 'lucide-react';

import { adminApi } from '@/lib/admin-api';
import { toApiError } from '@/lib/api';
import { useAuth } from '@/contexts/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SetupResponse {
  secret: string;
  provisioning_uri: string;
}

export default function TwoFactorPage() {
  const { admin } = useAuth();
  const [setupData, setSetupData] = useState<SetupResponse | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');

  const setupMut = useMutation({
    mutationFn: async () =>
      (await adminApi.post<SetupResponse>('/admin/auth/2fa/setup')).data,
    onSuccess: (data) => {
      setSetupData(data);
      toast.success('Secret genere. Scannez le QR avec votre app.');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const verifyMut = useMutation({
    mutationFn: async () =>
      adminApi.post('/admin/auth/2fa/verify', { code: verifyCode }),
    onSuccess: () => {
      toast.success('2FA active. A la prochaine connexion, il sera exige.');
      setSetupData(null);
      setVerifyCode('');
      if (admin) {
        const updated = { ...admin, two_factor_enabled: true };
        localStorage.setItem('fe_admin', JSON.stringify(updated));
        setTimeout(() => window.location.reload(), 800);
      }
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const disableMut = useMutation({
    mutationFn: async () =>
      adminApi.post('/admin/auth/2fa/disable', {
        password: disablePassword,
        code: disableCode,
      }),
    onSuccess: () => {
      toast.success('2FA desactive.');
      setDisablePassword('');
      setDisableCode('');
      if (admin) {
        const updated = { ...admin, two_factor_enabled: false };
        localStorage.setItem('fe_admin', JSON.stringify(updated));
        setTimeout(() => window.location.reload(), 800);
      }
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const qrUrl = setupData
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(setupData.provisioning_uri)}`
    : null;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">Authentification 2 facteurs</h1>

      {admin?.two_factor_enabled ? (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center gap-3">
              <ShieldCheck className="h-6 w-6 text-emerald-600" />
              <CardTitle className="text-base">2FA active sur votre compte</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Votre compte est protege par un code TOTP a usage unique. Un code
                de votre application (Google Authenticator, Authy, etc.) sera exige a chaque
                connexion.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldOff className="h-5 w-5" /> Desactiver le 2FA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert variant="destructive">
                <AlertDescription>
                  Necessite votre mot de passe + un code TOTP valide.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label>Mot de passe</Label>
                <Input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Code TOTP</Label>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </div>
              <Button
                variant="destructive"
                onClick={() => disableMut.mutate()}
                disabled={
                  disableMut.isPending || !disablePassword || disableCode.length !== 6
                }
              >
                {disableMut.isPending ? 'Desactivation...' : 'Desactiver'}
              </Button>
            </CardContent>
          </Card>
        </>
      ) : (
        <>
          {!setupData ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Activer le 2FA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Le 2FA ajoute une couche de securite : a chaque connexion, un code
                  temporaire de 6 chiffres genere par une application (Google Authenticator,
                  Authy, 1Password...) sera exige en plus du mot de passe.
                </p>
                <Button onClick={() => setupMut.mutate()} disabled={setupMut.isPending}>
                  {setupMut.isPending ? 'Generation...' : 'Commencer la configuration'}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Etape 2/2 : verification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    1. Scannez ce QR avec votre app d authentification :
                  </p>
                  {qrUrl && (
                    <div className="flex justify-center rounded-md border p-4">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={qrUrl} alt="QR 2FA" width={220} height={220} />
                    </div>
                  )}
                  <details className="text-xs text-muted-foreground">
                    <summary className="cursor-pointer">
                      Impossible de scanner ? Saisir la cle manuellement
                    </summary>
                    <code className="mt-2 block break-all rounded bg-muted p-2 font-mono">
                      {setupData.secret}
                    </code>
                  </details>
                </div>
                <div className="space-y-2">
                  <Label>2. Saisissez le code affiche par l app</Label>
                  <Input
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="text-center text-2xl tracking-widest font-mono"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => verifyMut.mutate()}
                    disabled={verifyMut.isPending || verifyCode.length !== 6}
                  >
                    {verifyMut.isPending ? 'Verification...' : 'Activer'}
                  </Button>
                  <Button variant="outline" onClick={() => setSetupData(null)}>
                    Annuler
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

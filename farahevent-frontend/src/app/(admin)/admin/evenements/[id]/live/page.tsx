'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Copy, Play, Square, Settings, Radio, Users, Activity, Clock, ShieldAlert } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

import { getAdminEvent, updateEventStatus, updateEventStream } from '@/lib/api/admin/events';
import { getDashboardStats } from '@/lib/api/admin/stats';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toApiError } from '@/lib/api';

interface ChartDataPoint {
  time: string;
  viewers: number;
}

export default function AdminLiveManagementPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();

  const [streamKey, setStreamKey] = useState('');
  const [streamHlsUrl, setStreamHlsUrl] = useState('');
  const [isEditingStream, setIsEditingStream] = useState(false);

  // Simulation metrics state
  const [simulatedViewers, setSimulatedViewers] = useState(0);
  const [simulatedPeak, setSimulatedPeak] = useState(0);
  const [simulatedBitrate, setSimulatedBitrate] = useState(0);
  const [simulatedResolution, setSimulatedResolution] = useState('1280x720');
  const [streamDuration, setStreamDuration] = useState(0);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  const viewersRef = useRef(simulatedViewers);
  useEffect(() => {
    viewersRef.current = simulatedViewers;
  }, [simulatedViewers]);

  const { data: event, isLoading } = useQuery({
    queryKey: ['admin', 'event', id],
    queryFn: () => getAdminEvent(id),
  });

  useEffect(() => {
    if (event) {
      setStreamKey(event.stream_key || '');
      setStreamHlsUrl(event.stream_hls_url || '');
    }
  }, [event]);

  // Status mutation (Démarrer/Terminer)
  const statusMutation = useMutation({
    mutationFn: (status: string) => updateEventStatus(id, status),
    onSuccess: (updated) => {
      qc.setQueryData(['admin', 'event', id], updated);
      qc.invalidateQueries({ queryKey: ['admin', 'events'] });
      toast.success(
        updated.status === 'live'
          ? 'Diffusion démarrée avec succès.'
          : 'Diffusion terminée avec succès.'
      );
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  // Stream config mutation
  const streamMutation = useMutation({
    mutationFn: ({ key, url }: { key: string; url: string }) => updateEventStream(id, key, url),
    onSuccess: (updated) => {
      qc.setQueryData(['admin', 'event', id], updated);
      toast.success('Configuration de diffusion enregistrée.');
      setIsEditingStream(false);
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  // Real Live Metrics fetch effect
  useEffect(() => {
    if (!event || event.status !== 'live') {
      setSimulatedViewers(0);
      setSimulatedBitrate(0);
      setStreamDuration(0);
      setChartData([]);
      return;
    }

    // Initialize chart with empty
    const initialChart: ChartDataPoint[] = [];
    setChartData(initialChart);
    setSimulatedPeak(0);
    setSimulatedBitrate(2820); // Fixed for now, no API for bitrate
    setSimulatedResolution('1280x720');

    let durationSecs = 0;
    let peak = 0;

    const fetchStats = async () => {
      try {
        const stats = await getDashboardStats(id, '7d');
        const count = stats.kpis.live_viewers || 0;
        
        setSimulatedViewers(count);
        
        peak = Math.max(peak, count);
        setSimulatedPeak(peak);
        
        const currentTimeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setChartData((prev) => {
          const next = [...prev, { time: currentTimeStr.slice(0, 5), viewers: count }];
          if (next.length > 20) next.shift(); // keep last 20 points
          return next;
        });
      } catch (err) {
        console.error("Erreur stats", err);
      }
    };

    // Fetch immediately
    fetchStats();

    // Interval to fetch stats every 10 seconds and increment duration
    const timer = setInterval(() => {
      durationSecs += 1;
      setStreamDuration(durationSecs);

      // Only fetch stats every 10 seconds
      if (durationSecs % 10 === 0) {
        fetchStats();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [event, event?.status, id]);

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copié dans le presse-papier.`);
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;
  if (!event) return <div className="p-8 text-center text-red-500">Événement introuvable</div>;

  const isLive = event.status === 'live';
  const isClosed = event.status === 'closed';
  const isDraftOrOpen = event.status === 'draft' || event.status === 'open';

  // Fixed RTMP Server URL as specified by CDC
  const rtmpServerUrl = 'rtmp://stream.farahevent.tech/live';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b pb-5">
        <div className="flex items-center gap-4">
          <Link href={`/admin/evenements/${id}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-1 h-4 w-4" /> Retour
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Streaming — {event.name}</h1>
            <p className="text-sm text-muted-foreground">Pilotez la diffusion en ligne et suivez les statistiques en temps réel.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isLive && (
            <span className="flex items-center gap-1.5 rounded-full bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-600 dark:bg-red-500/20 dark:text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              EN DIRECT
            </span>
          )}
          {isClosed && (
            <Badge variant="secondary">Diffusion terminée</Badge>
          )}
          {isDraftOrOpen && (
            <Badge variant="outline">Inactif</Badge>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Columns - Controls & Configuration */}
        <div className="space-y-6 lg:col-span-2">
          {/* Stream Control Panel */}
          <Card className="overflow-hidden border-red-500/20 shadow-md dark:border-red-900/30">
            <CardHeader className="bg-red-500/5 dark:bg-red-950/10">
              <CardTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <Radio className="h-5 w-5" />
                Contrôle de la diffusion
              </CardTitle>
              <CardDescription>
                Démarrez le direct pour envoyer les invitations aux participants en ligne.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Statut du direct :</p>
                  <div className="flex items-center gap-2">
                    <div className={`h-3 w-3 rounded-full ${isLive ? 'bg-emerald-500 animate-ping' : isClosed ? 'bg-slate-400' : 'bg-amber-500'}`} />
                    <span className="font-semibold text-sm">
                      {isLive ? 'En direct' : isClosed ? 'Terminé (clos)' : 'Prêt à diffuser (inactif)'}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3">
                  {isDraftOrOpen && (
                    <Button
                      onClick={() => {
                        if (confirm('Cette action va activer le live et programmer l\'envoi des liens. Continuer ?')) {
                          statusMutation.mutate('live');
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                      disabled={statusMutation.isPending}
                    >
                      <Play className="h-4 w-4" />
                      Démarrer l&apos;événement
                    </Button>
                  )}
                  {isLive && (
                    <Button
                      onClick={() => {
                        if (confirm('Voulez-vous vraiment clore définitivement la diffusion ? Cette action est irréversible.')) {
                          statusMutation.mutate('closed');
                        }
                      }}
                      variant="destructive"
                      className="gap-2"
                      disabled={statusMutation.isPending}
                    >
                      <Square className="h-4 w-4" />
                      Terminer l&apos;événement
                    </Button>
                  )}
                  {isClosed && (
                    <p className="text-xs text-muted-foreground italic border rounded p-2 bg-muted/30">
                      Cet événement est terminé. Les statistiques de diffusion sont archivées.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RTMP Configurations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-muted-foreground" />
                Configuration du serveur RTMP (OBS / StreamYard)
              </CardTitle>
              <CardDescription>
                Copiez ces informations dans votre logiciel de diffusion pour envoyer le flux vidéo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">URL du serveur RTMP</label>
                <div className="flex gap-2">
                  <Input readOnly value={rtmpServerUrl} className="font-mono text-xs bg-muted/30" />
                  <Button variant="outline" size="icon" onClick={() => copyToClipboard(rtmpServerUrl, 'L\'URL RTMP')}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground">Clé de stream</label>
                {isEditingStream ? (
                  <div className="space-y-3">
                    <Input
                      placeholder="Coller votre clé de stream..."
                      value={streamKey}
                      onChange={(e) => setStreamKey(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted-foreground">URL de lecture HLS (Sortie)</label>
                      <Input
                        placeholder="https://.../playlist.m3u8"
                        value={streamHlsUrl}
                        onChange={(e) => setStreamHlsUrl(e.target.value)}
                        className="font-mono text-xs"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => streamMutation.mutate({ key: streamKey, url: streamHlsUrl })}
                        disabled={streamMutation.isPending}
                      >
                        Enregistrer
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setStreamKey(event.stream_key || '');
                          setStreamHlsUrl(event.stream_hls_url || '');
                          setIsEditingStream(false);
                        }}
                      >
                        Annuler
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      type="password"
                      value={streamKey || '••••••••••••••••••••••••••••••••'}
                      className="font-mono text-xs bg-muted/30"
                    />
                    {streamKey && (
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(streamKey, 'La clé de stream')}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setIsEditingStream(true)}>
                      Modifier
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Audience Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-muted-foreground" />
                Évolution de l&apos;audience
              </CardTitle>
              <CardDescription>
                Nombre de spectateurs connectés en direct.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[280px]">
              {isLive || chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorViewers" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="viewers" name="Audience" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorViewers)" />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground italic bg-muted/10 rounded border border-dashed">
                  Le graphique d&apos;audience s&apos;activera au lancement de l&apos;événement.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Metrics & OBS Settings */}
        <div className="space-y-6">
          {/* Metrics Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Métriques en direct</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-red-500/10 p-3 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                  <Users className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Spectateurs actuels</p>
                  <p className="text-2xl font-bold tabular-nums">{simulatedViewers}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-amber-500/10 p-3 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                  <Activity className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pic d&apos;audience</p>
                  <p className="text-2xl font-bold tabular-nums">{isLive || isClosed ? simulatedPeak : 0}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-500/10 p-3 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
                  <Radio className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Débit binaire (Bitrate)</p>
                  <p className="text-2xl font-bold tabular-nums">
                    {simulatedBitrate > 0 ? `${(simulatedBitrate / 1000).toFixed(2)} Mbps` : '0 Mbps'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-indigo-500/10 p-3 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                  <Clock className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Durée de diffusion</p>
                  <p className="text-2xl font-bold font-mono">{formatDuration(streamDuration)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* OBS Configuration Guide */}
          <Card className="border-blue-500/15 shadow-sm dark:border-blue-900/30">
            <CardHeader className="bg-blue-500/5 dark:bg-blue-950/15 pb-4">
              <CardTitle className="flex items-center gap-2 text-sm font-bold text-blue-600 dark:text-blue-400">
                <ShieldAlert className="h-4 w-4" />
                Configuration OBS recommandée
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 text-xs space-y-3 text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground">Sortie Vidéo :</p>
                <p>Résolution de base (canevas) : 1280x720 (720p)</p>
                <p>Résolution de sortie (échelle) : 1280x720</p>
                <p>Débit binaire recommandé : 2500 à 3000 Kbps (max 4500)</p>
                <p>FPS : 30 ou 60 fps (30 fps conseillé pour la bande passante)</p>
              </div>
              <div className="border-t pt-2">
                <p className="font-semibold text-foreground">Encodeur Audio :</p>
                <p>Débit AAC : 128 Kbps</p>
                <p>Canaux : Stéréo</p>
              </div>
              <div className="border-t pt-2">
                <p className="font-semibold text-foreground">Paramètres de l&apos;encodeur (x264) :</p>
                <p>Profil : main ou high</p>
                <p>Intervalle d&apos;images clés : 2 secondes (obligatoire)</p>
                <p>Contrôle du débit : CBR</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

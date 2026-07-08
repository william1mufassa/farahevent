'use client';

import { useEffect, useRef, useState } from 'react';
import type { LiveSubtitleTrack } from '@/types/live';
import { SubtitlesToggle } from './SubtitlesToggle';

/**
 * Player HLS (CONCEPTION_FRONTEND.md §9). hls.js chargé en import dynamique
 * (jamais dans le bundle initial) ; sur Safari/iOS, lecture HLS native. Cap
 * 720p, contrôles natifs, clic droit neutralisé, filigrane + compteur en
 * overlay (passés en `children`).
 */
export function LivePlayer({
  src,
  subtitles,
  children,
}: {
  src: string;
  subtitles: LiveSubtitleTrack[];
  children?: React.ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [fatalError, setFatalError] = useState(false);
  // null = désactivé ; sinon langue de la piste affichée
  const [activeCc, setActiveCc] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Safari / iOS : HLS natif, pas de hls.js.
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      return;
    }

    let hls: import('hls.js').default | null = null;
    let cancelled = false;

    import('hls.js')
      .then(({ default: Hls }) => {
        if (cancelled || !videoRef.current) return;
        if (!Hls.isSupported()) {
          setFatalError(true);
          return;
        }
        hls = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 30 });
        hls.loadSource(src);
        hls.attachMedia(videoRef.current);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (!hls) return;
          // 720p fixe : plus haut niveau dont la hauteur ≤ 720.
          let target = -1;
          hls.levels.forEach((lvl, i) => {
            if (lvl.height && lvl.height <= 720) {
              if (target === -1 || (hls!.levels[target].height ?? 0) < lvl.height) target = i;
            }
          });
          if (target >= 0) hls.currentLevel = target;
        });

        hls.on(Hls.Events.ERROR, (_evt, data) => {
          if (!data.fatal || !hls) return;
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setFatalError(true);
              break;
          }
        });
      })
      .catch(() => setFatalError(true));

    return () => {
      cancelled = true;
      if (hls) hls.destroy();
    };
  }, [src]);

  // Applique la sélection CC aux pistes texte natives.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = video.textTracks;
    for (let i = 0; i < tracks.length; i += 1) {
      tracks[i].mode = activeCc && tracks[i].language === activeCc ? 'showing' : 'hidden';
    }
  }, [activeCc, subtitles]);

  const cycleCc = () => {
    const order: Array<string | null> = [null, ...subtitles.map((s) => s.lang)];
    const idx = order.indexOf(activeCc);
    setActiveCc(order[(idx + 1) % order.length]);
  };

  return (
    <div
      className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-2xl"
      onContextMenu={(e) => e.preventDefault()}
    >
      {fatalError ? (
        <div className="flex h-full items-center justify-center p-8 text-center text-sm text-white/60">
          <p>Le flux vidéo est momentanément indisponible.</p>
        </div>
      ) : (
        <video
          ref={videoRef}
          controls
          autoPlay
          muted
          playsInline
          className="h-full w-full bg-black"
          crossOrigin="anonymous"
        >
          {subtitles.map((track) => (
            <track
              key={track.lang}
              kind="subtitles"
              srcLang={track.lang}
              label={track.label}
              src={track.url}
            />
          ))}
        </video>
      )}

      {!fatalError && (
        <SubtitlesToggle tracks={subtitles} active={activeCc} onCycle={cycleCc} />
      )}
      {children}
    </div>
  );
}

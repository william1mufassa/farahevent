'use client';

import React from 'react';
import { ThreeDTilt } from '@/components/ui/ThreeDTilt';

interface TeaserPlayerProps {
  url: string | null | undefined;
}

export function TeaserPlayer({ url }: TeaserPlayerProps) {
  if (!url) return null;

  // Extract YouTube ID
  const getYoutubeId = (link: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = link.match(regExp);
    return match && match[2].length === 11 ? match[2] : null;
  };

  // Extract Vimeo ID
  const getVimeoId = (link: string) => {
    const regExp = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)(?:$|\/|\?)/;
    const match = link.match(regExp);
    return match ? match[3] : null;
  };

  const ytId = getYoutubeId(url);
  const vimeoId = getVimeoId(url);

  return (
    <div className="mt-8 w-full max-w-2xl mx-auto">
      <ThreeDTilt maxTilt={8} className="w-full">
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-zinc-950">
          {ytId ? (
            <iframe
              src={`https://www.youtube.com/embed/${ytId}?rel=0&autoplay=0`}
              title="YouTube Presentation Video"
              className="absolute inset-0 w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          ) : vimeoId ? (
            <iframe
              src={`https://player.vimeo.com/video/${vimeoId}?autoplay=0&muted=0`}
              title="Vimeo Presentation Video"
              className="absolute inset-0 w-full h-full border-0"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <video
              src={url}
              controls
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </div>
      </ThreeDTilt>
    </div>
  );
}

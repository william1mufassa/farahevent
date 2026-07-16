import { Metadata } from 'next';
import { LiveAccessForm } from '@/components/live/LiveAccessForm';

export const metadata: Metadata = {
  title: 'Accès Live | FarahEvent',
  description: 'Connectez-vous pour rejoindre la diffusion en direct',
  robots: { index: false },
};

export default function LiveAccessPage({ params }: { params: { locale: string; slug: string } }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      {/* Arrière-plan décoratif */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[40%] -right-[10%] w-[70%] h-[70%] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -bottom-[40%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-900/20 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full">
        <LiveAccessForm slug={params.slug} />
      </div>
    </div>
  );
}

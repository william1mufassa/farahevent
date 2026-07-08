import { Megaphone } from 'lucide-react';
import { ComingSoon } from '@/components/admin/ComingSoon';

export default function CommunicationsPage() {
  return (
    <ComingSoon
      title="Communications"
      icon={Megaphone}
      note="Campagnes email / WhatsApp et segments — livrés au Lot 8."
    />
  );
}

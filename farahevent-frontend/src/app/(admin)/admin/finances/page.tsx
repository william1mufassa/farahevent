import { Wallet } from 'lucide-react';
import { ComingSoon } from '@/components/admin/ComingSoon';

export default function FinancesPage() {
  return (
    <ComingSoon
      title="Finances"
      icon={Wallet}
      note="Revenus, remboursements et exports comptables — livrés au Lot 8."
    />
  );
}

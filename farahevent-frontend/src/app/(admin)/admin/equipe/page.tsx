'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Plus, ShieldCheck, Trash2 } from 'lucide-react';

import { toApiError } from '@/lib/api';
import { createAdmin, deactivateAdmin, getAdmins, type NewAdmin } from '@/lib/api/admin/team';
import { cn } from '@/lib/utils';
import { FIELD, LBL } from '@/components/admin/event-config/fieldStyles';

const ROLE: Record<string, { label: string; cls: string }> = {
  super_admin: { label: 'Super admin', cls: 'bg-purple-500/15 text-purple-600' },
  manager: { label: 'Manager', cls: 'bg-blue-500/15 text-blue-600' },
  comptable: { label: 'Comptable', cls: 'bg-amber-500/15 text-amber-600' },
  agent: { label: 'Agent', cls: 'bg-emerald-500/15 text-emerald-600' },
};

export default function TeamPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: admins, isLoading } = useQuery({ queryKey: ['admin', 'team'], queryFn: getAdmins });

  const { register, handleSubmit, reset } = useForm<NewAdmin>({
    defaultValues: { first_name: '', last_name: '', email: '', password: '', role: 'agent' },
  });

  const create = useMutation({
    mutationFn: (form: NewAdmin) => createAdmin(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'team'] });
      reset();
      setShowForm(false);
      toast.success('Collaborateur créé.');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const deactivate = useMutation({
    mutationFn: (id: string) => deactivateAdmin(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'team'] });
      toast.success('Collaborateur désactivé.');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Équipe</h1>
          <p className="text-sm text-muted-foreground">Gestion des comptes et des rôles.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((s) => !s)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          {showForm ? 'Annuler' : 'Ajouter'}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit((d) => create.mutate(d))}
          className="space-y-3 rounded-xl border border-border bg-card p-4 shadow-sm"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <label className={LBL}>Prénom</label>
              <input className={FIELD} {...register('first_name', { required: true })} />
            </div>
            <div className="space-y-1">
              <label className={LBL}>Nom</label>
              <input className={FIELD} {...register('last_name', { required: true })} />
            </div>
            <div className="space-y-1">
              <label className={LBL}>Email</label>
              <input type="email" className={FIELD} {...register('email', { required: true })} />
            </div>
            <div className="space-y-1">
              <label className={LBL}>Mot de passe</label>
              <input type="password" className={FIELD} {...register('password', { required: true, minLength: 8 })} />
            </div>
            <div className="space-y-1">
              <label className={LBL}>Rôle</label>
              <select className={FIELD} {...register('role')}>
                <option value="agent">Agent</option>
                <option value="manager">Manager</option>
                <option value="comptable">Comptable</option>
                <option value="super_admin">Super admin</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {create.isPending ? 'Création…' : 'Créer le compte'}
          </button>
        </form>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <div className="space-y-2">
          {admins?.map((a) => {
            const role = ROLE[a.role] ?? { label: a.role, cls: 'bg-muted text-muted-foreground' };
            return (
              <div
                key={a.id}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-4 shadow-sm',
                  !a.is_active && 'opacity-60',
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {(a.first_name[0] ?? '') + (a.last_name[0] ?? '')}
                  </span>
                  <div>
                    <p className="font-medium">
                      {a.first_name} {a.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{a.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', role.cls)}>
                    {role.label}
                  </span>
                  {a.two_factor_enabled && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      <ShieldCheck className="h-3 w-3" /> 2FA
                    </span>
                  )}
                  {!a.is_active ? (
                    <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-600">
                      Inactif
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Désactiver ce collaborateur ?')) deactivate.mutate(a.id);
                      }}
                      aria-label="Désactiver"
                      className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

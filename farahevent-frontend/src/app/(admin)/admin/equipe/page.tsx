'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

import { adminApi } from '@/lib/admin-api';
import { toApiError } from '@/lib/api';
import type { AdminOut } from '@/types/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-100 text-purple-800',
  manager: 'bg-blue-100 text-blue-800',
  agent: 'bg-green-100 text-green-800',
  comptable: 'bg-amber-100 text-amber-800',
};

export default function AdminsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: admins, isLoading } = useQuery({
    queryKey: ['admin', 'admins'],
    queryFn: async () => (await adminApi.get<AdminOut[]>('/admin/admins/')).data,
  });

  const { register, handleSubmit, reset } = useForm({
    defaultValues: {
      email: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'agent',
    },
  });

  const createMut = useMutation({
    mutationFn: async (form: Record<string, string>) => adminApi.post('/admin/admins/', form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'admins'] });
      reset();
      setShowForm(false);
      toast.success('Collaborateur cree.');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  const deactivateMut = useMutation({
    mutationFn: async (id: string) => adminApi.delete(`/admin/admins/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'admins'] });
      toast.success('Collaborateur desactive.');
    },
    onError: (e) => toast.error(toApiError(e).message),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Collaborateurs</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" /> {showForm ? 'Annuler' : 'Ajouter'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit((d) => createMut.mutate(d))} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Prenom *</Label>
                  <Input {...register('first_name', { required: true })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Nom *</Label>
                  <Input {...register('last_name', { required: true })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Email *</Label>
                  <Input type="email" {...register('email', { required: true })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Mot de passe *</Label>
                  <Input type="password" {...register('password', { required: true, minLength: 8 })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Role</Label>
                <select
                  {...register('role')}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                >
                  <option value="agent">Agent</option>
                  <option value="manager">Manager</option>
                  <option value="comptable">Comptable</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <Button type="submit" size="sm" disabled={createMut.isPending}>
                {createMut.isPending ? 'Creation...' : 'Creer'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Chargement...</p>
      ) : !admins?.length ? (
        <p className="text-muted-foreground">Aucun collaborateur.</p>
      ) : (
        <div className="space-y-2">
          {admins.map((a) => (
            <div
              key={a.id}
              className={`flex items-center justify-between rounded-md border p-3 text-sm ${
                !a.is_active ? 'opacity-50' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div>
                  <span className="font-medium">
                    {a.first_name} {a.last_name}
                  </span>
                  <span className="ml-2 text-muted-foreground">{a.email}</span>
                </div>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[a.role] ?? ''}`}
                >
                  {a.role}
                </span>
                {a.two_factor_enabled && (
                  <Badge variant="outline" className="text-xs">
                    2FA
                  </Badge>
                )}
                {!a.is_active && (
                  <Badge variant="destructive" className="text-xs">
                    Inactif
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (confirm('Desactiver ce collaborateur ?')) deactivateMut.mutate(a.id);
                }}
                disabled={!a.is_active}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

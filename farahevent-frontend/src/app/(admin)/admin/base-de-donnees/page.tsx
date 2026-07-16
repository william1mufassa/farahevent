'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Trash2, RotateCcw, AlertTriangle, ShieldAlert } from 'lucide-react';
import { adminApi } from '@/lib/admin-api';
import { toApiError } from '@/lib/api';
import type { EventAdmin } from '@/types/admin';

export default function DatabaseManagementPage() {
  const [activeTab, setActiveTab] = useState<'trash' | 'reset'>('trash');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Maintenance</h1>
        <p className="text-sm text-muted-foreground">Gérez la corbeille, les suppressions définitives et la remise à zéro des événements.</p>
      </div>

      <div className="flex space-x-1 border-b border-border">
        <button
          onClick={() => setActiveTab('trash')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'trash' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Corbeille (Événements supprimés)
        </button>
        <button
          onClick={() => setActiveTab('reset')}
          className={`px-4 py-2 text-sm font-medium ${activeTab === 'reset' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
        >
          Remise à zéro des événements
        </button>
      </div>

      {activeTab === 'trash' && <TrashSection />}
      {activeTab === 'reset' && <ResetSection />}
    </div>
  );
}

function TrashSection() {
  const queryClient = useQueryClient();

  const { data: deletedEvents, isLoading } = useQuery({
    queryKey: ['admin', 'database', 'deleted-events'],
    queryFn: async () => {
      const res = await adminApi.get<EventAdmin[]>('/admin/database/deleted-events');
      return res.data;
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (id: string) => adminApi.post(`/admin/database/events/${id}/restore`),
    onSuccess: () => {
      toast.success('Événement restauré avec succès.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'database', 'deleted-events'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'events'] });
    },
    onError: (err) => {
      toast.error(toApiError(err).message || 'Erreur lors de la restauration');
    }
  });

  const hardDeleteMutation = useMutation({
    mutationFn: async (id: string) => adminApi.delete(`/admin/database/events/${id}/hard-delete`),
    onSuccess: () => {
      toast.success('Événement supprimé définitivement.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'database', 'deleted-events'] });
    },
    onError: (err) => {
      toast.error(toApiError(err).message || 'Erreur lors de la suppression définitive');
    }
  });

  if (isLoading) return <div className="text-muted-foreground">Chargement de la corbeille...</div>;

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-amber-500/10 p-4 border border-amber-500/20">
        <div className="flex items-start">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 mr-3" />
          <p className="text-sm text-amber-800 dark:text-amber-200 font-medium">
            Les événements dans la corbeille ne sont plus visibles dans le tableau de bord principal. Vous pouvez les restaurer ou les supprimer définitivement. La suppression définitive effacera également toutes les commandes, billets et participants liés.
          </p>
        </div>
      </div>

      {(!deletedEvents || deletedEvents.length === 0) ? (
        <div className="text-center py-12 text-muted-foreground">
          <Trash2 className="mx-auto h-12 w-12 opacity-50 mb-3" />
          <p>La corbeille est vide.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {deletedEvents.map(event => (
            <div key={event.id} className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
              <div>
                <h3 className="text-lg font-medium text-card-foreground">{event.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(event.date).toLocaleDateString()} - {event.location || 'Lieu non spécifié'}
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    if (confirm('Voulez-vous vraiment restaurer cet événement ?')) {
                      restoreMutation.mutate(event.id);
                    }
                  }}
                  disabled={restoreMutation.isPending}
                  className="px-3 py-1.5 text-sm bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md flex items-center transition-colors"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restaurer
                </button>
                <button
                  onClick={() => {
                    if (confirm('⚠️ ATTENTION : Voulez-vous supprimer cet événement de manière DÉFINITIVE ? Cela effacera aussi les billets et commandes associés !')) {
                      hardDeleteMutation.mutate(event.id);
                    }
                  }}
                  disabled={hardDeleteMutation.isPending}
                  className="px-3 py-1.5 text-sm bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 rounded-md flex items-center transition-colors"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ResetSection() {
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [resetOrders, setResetOrders] = useState(false);
  const [resetScans, setResetScans] = useState(false);
  const [resetParticipants, setResetParticipants] = useState(false);

  const { data: events, isLoading } = useQuery({
    queryKey: ['admin', 'events'],
    queryFn: async () => {
      const res = await adminApi.get<EventAdmin[]>('/admin/events/');
      return res.data;
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      return adminApi.post(`/admin/database/events/${selectedEventId}/reset`, {
        reset_orders: resetOrders,
        reset_participants: resetParticipants,
        reset_scans: resetScans
      });
    },
    onSuccess: () => {
      toast.success('Données réinitialisées avec succès.');
      setResetOrders(false);
      setResetScans(false);
      setResetParticipants(false);
      setSelectedEventId('');
    },
    onError: (err) => {
      toast.error(toApiError(err).message || 'Erreur lors de la réinitialisation');
    }
  });

  if (isLoading) return <div className="text-muted-foreground">Chargement des événements...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-md bg-destructive/10 p-4 border border-destructive/20">
        <div className="flex items-start">
          <ShieldAlert className="h-5 w-5 text-destructive mt-0.5 mr-3" />
          <p className="text-sm text-destructive dark:text-red-200 font-medium">
            La remise à zéro supprime les données de production (commandes, scans, participants) pour l&apos;événement sélectionné. Action irréversible, à utiliser de préférence pour les événements de test.
          </p>
        </div>
      </div>

      <div className="space-y-4 bg-card p-6 rounded-lg border border-border shadow-sm">
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-1">
            Sélectionnez l&apos;événement cible
          </label>
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="w-full bg-background border border-input rounded-md px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">-- Choisir un événement --</option>
            {events?.map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        {selectedEventId && (
          <div className="space-y-3 pt-4 border-t border-border">
            <h3 className="text-sm font-medium text-card-foreground">Quelles données souhaitez-vous effacer ?</h3>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={resetOrders} 
                onChange={(e) => setResetOrders(e.target.checked)}
                className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-primary focus:ring-offset-background" 
              />
              <span className="text-sm text-foreground">Billets vendus & Commandes</span>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={resetScans} 
                onChange={(e) => setResetScans(e.target.checked)}
                className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-primary focus:ring-offset-background" 
              />
              <span className="text-sm text-foreground">Historique des scanners (Scan Logs)</span>
            </label>
            
            <label className="flex items-center space-x-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={resetParticipants} 
                onChange={(e) => setResetParticipants(e.target.checked)}
                className="w-4 h-4 rounded border-input bg-background text-primary focus:ring-primary focus:ring-offset-background" 
              />
              <span className="text-sm text-foreground">Participants (Comptes invités/inscrits)</span>
            </label>
          </div>
        )}

        {selectedEventId && (resetOrders || resetScans || resetParticipants) && (
          <div className="pt-4">
            <button
              onClick={() => {
                if (confirm('Voulez-vous vraiment effacer ces données ? Cette action est IRRÉVERSIBLE !')) {
                  resetMutation.mutate();
                }
              }}
              disabled={resetMutation.isPending}
              className="w-full px-4 py-2 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-md font-medium transition-colors disabled:opacity-50"
            >
              {resetMutation.isPending ? 'Effacement en cours...' : 'Confirmer la remise à zéro'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

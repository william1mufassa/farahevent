'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Send, CheckCircle, Mail, Hash, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { api, toApiError } from '@/lib/api';

export default function ResendTicketPage() {
  const t = useTranslations('resend');
  const [email, setEmail] = useState('');
  const [orderId, setOrderId] = useState('');
  const [sent, setSent] = useState<null | { tickets_count: number; channels: string[] }>(null);

  const resend = useMutation({
    mutationFn: async () =>
      (
        await api.post<{ tickets_count: number; channels: string[] }>('/tickets/resend', {
          email,
          order_id: orderId,
        })
      ).data,
    onSuccess: (data) => {
      setSent(data);
      toast.success(t('success'));
    },
    onError: (err) => toast.error(toApiError(err).message),
  });

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#070b13] px-4 font-sans text-white">
      {/* Background Liquid Gradients */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -left-[10%] -top-[10%] h-[50%] w-[50%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute -right-[10%] -bottom-[10%] h-[60%] w-[60%] rounded-full bg-cyan-500/10 blur-[130px] animate-pulse duration-[8s]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 backdrop-blur-xl shadow-2xl sm:p-10">
          <div className="mb-10 text-center">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-lg shadow-indigo-500/25"
            >
              <Send className="h-7 w-7 text-white" />
            </motion.div>
            <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-white">{t('title')}</h1>
            <p className="mt-3 text-sm text-white/60">
              Renseignez vos informations pour recevoir à nouveau votre billet d&apos;accès au live.
            </p>
          </div>

          <AnimatePresence mode="wait">
            {sent ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center text-emerald-100"
              >
                <CheckCircle className="mx-auto mb-4 h-10 w-10 text-emerald-400" />
                <p className="text-sm leading-relaxed">
                  {t('sentSummary', {
                    count: sent.tickets_count,
                    channels: sent.channels.join(' + '),
                  })}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSent(null);
                    setEmail('');
                    setOrderId('');
                  }}
                  className="mt-6 text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                >
                  ← Nouvelle demande
                </button>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  resend.mutate();
                }}
              >
                <div className="space-y-1.5">
                  <label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-white/60">
                    {t('emailLabel')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-white/40">
                      <Mail className="h-5 w-5" />
                    </div>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nom@exemple.com"
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-sm text-white placeholder-white/30 outline-none transition focus:border-indigo-500 focus:bg-white/10 focus:ring-4 focus:ring-indigo-500/10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="order_id" className="text-xs font-semibold uppercase tracking-wider text-white/60">
                    {t('orderLabel')}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-white/40">
                      <Hash className="h-5 w-5" />
                    </div>
                    <input
                      id="order_id"
                      required
                      placeholder={t('orderPlaceholder')}
                      value={orderId}
                      onChange={(e) => setOrderId(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 py-3.5 pl-12 pr-4 text-sm text-white placeholder-white/30 outline-none transition focus:border-purple-500 focus:bg-white/10 focus:ring-4 focus:ring-purple-500/10"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={resend.isPending || !email || !orderId}
                  className="group relative flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-4 text-sm font-bold text-white shadow-xl shadow-indigo-500/20 transition-all hover:scale-[1.02] hover:shadow-indigo-500/30 disabled:pointer-events-none disabled:opacity-50"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    {resend.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Traitement...
                      </>
                    ) : (
                      <>
                        {t('submit')}
                        <Send className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                  <div className="absolute inset-0 z-0 bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </main>
  );
}

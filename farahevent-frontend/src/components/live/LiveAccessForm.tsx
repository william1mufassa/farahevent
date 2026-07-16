"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export function LiveAccessForm({ slug }: { slug: string }) {
  const t = useTranslations("live");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [orderRef, setOrderRef] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await api.post("/live/access", {
        email,
        order_ref: orderRef,
      });
      const token = res.data.token;
      toast.success(t("accessGranted") || "Accès autorisé !");
      router.push(`/live?token=${token}`);
    } catch (error: any) {
      toast.error(
        error.response?.data?.detail || 
        t("accessDenied") || 
        "Impossible d'accéder au Live. Vérifiez vos informations."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-6 w-full max-w-sm mx-auto mt-20 p-8 border border-neutral-200/20 bg-neutral-900/50 backdrop-blur-md rounded-2xl shadow-xl">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-white">Accès au Live</h1>
        <p className="text-sm text-neutral-400">
          Entrez les informations figurant sur votre billet pour rejoindre la diffusion.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-neutral-300">Adresse Email</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="exemple@email.com"
            className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="orderRef" className="text-neutral-300">Référence de Commande</Label>
          <Input
            id="orderRef"
            type="text"
            required
            value={orderRef}
            onChange={(e) => setOrderRef(e.target.value)}
            placeholder="ORD-XXXXXX"
            className="bg-neutral-800 border-neutral-700 text-white placeholder:text-neutral-500 uppercase"
          />
        </div>

        <Button 
          type="submit" 
          disabled={loading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold h-11"
        >
          {loading ? "Vérification..." : "Rejoindre le Live"}
        </Button>
      </form>
    </div>
  );
}

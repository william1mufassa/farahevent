import httpx
from app.core.config import settings


class WhatsAppService:
    def __init__(self):
        self.api_url = settings.OPENWA_API_URL
        self.api_key = settings.OPENWA_API_KEY
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def send_text(self, phone: str, message: str) -> dict:
        """Envoie un message texte via OpenWA."""
        # Normaliser le numéro (format CI: 225XXXXXXXX)
        phone_normalized = self._normalize_phone(phone)

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/api/sendText",
                json={"to": f"{phone_normalized}@c.us", "content": message},
                headers=self.headers,
                timeout=30,
            )
            response.raise_for_status()
            return response.json()

    async def send_image(self, phone: str, image_base64: str, caption: str = "") -> dict:
        """Envoie une image (QR code) via OpenWA."""
        phone_normalized = self._normalize_phone(phone)

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.api_url}/api/sendImage",
                json={
                    "to": f"{phone_normalized}@c.us",
                    "base64": image_base64,
                    "filename": "billet_farahevent.png",
                    "caption": caption,
                },
                headers=self.headers,
                timeout=30,
            )
            response.raise_for_status()
            return response.json()

    async def send_ticket_confirmation(
        self,
        phone: str,
        buyer_name: str,
        event_title: str,
        event_date: str,
        event_venue: str,
        ticket_category: str,
        ticket_id: str,
        qr_code_base64: str,
        stream_link: str | None = None,
        amount: float = 0,
    ) -> bool:
        """
        Envoie la confirmation de billet complète via WhatsApp :
        1. Message texte avec les détails
        2. QR code en image
        3. Lien de stream (si événement hybride/online)
        """
        try:
            # Message de confirmation
            message = (
                f"🎉 *Confirmation de votre billet — FarahEvent*\n\n"
                f"Bonjour {buyer_name} !\n\n"
                f"Votre paiement a été confirmé. Voici votre billet :\n\n"
                f"📅 *Événement :* {event_title}\n"
                f"🗓️ *Date :* {event_date}\n"
                f"📍 *Lieu :* {event_venue}\n"
                f"🎫 *Catégorie :* {ticket_category}\n"
                f"💰 *Montant payé :* {int(amount):,} FCFA\n"
                f"🔖 *Référence :* {ticket_id[-8:].upper()}\n\n"
                f"Votre QR code est joint à ce message.\n"
                f"Présentez-le à l'entrée pour accéder à l'événement.\n\n"
                f"⚠️ Ce billet est personnel et non transférable."
            )

            # Ajouter le lien stream si disponible
            if stream_link:
                message += (
                    f"\n\n🔴 *Lien de streaming (1 connexion simultanée) :*\n"
                    f"{stream_link}\n\n"
                    f"_Ce lien est unique et sécurisé. Ne le partagez pas._"
                )

            # Envoyer le message texte
            await self.send_text(phone, message)

            # Envoyer le QR code
            # Extraire le base64 pur (sans le préfixe data:image/png;base64,)
            qr_pure = qr_code_base64.replace("data:image/png;base64,", "")
            await self.send_image(
                phone,
                qr_pure,
                f"QR Code — {event_title}",
            )

            return True

        except Exception as e:
            print(f"Erreur envoi WhatsApp: {e}")
            return False

    def _normalize_phone(self, phone: str) -> str:
        """Normalise un numéro ivoirien au format international."""
        phone = phone.strip().replace(" ", "").replace("-", "")
        if phone.startswith("+"):
            phone = phone[1:]
        elif phone.startswith("00"):
            phone = phone[2:]
        elif len(phone) == 10 and phone.startswith("0"):
            # Numéro local CI : 0X XX XX XX XX → 225X XX XX XX XX
            phone = f"225{phone[1:]}"
        elif len(phone) == 8:
            # Numéro court CI : XX XX XX XX → 225XX XX XX XX
            phone = f"225{phone}"
        return phone


whatsapp_service = WhatsAppService()

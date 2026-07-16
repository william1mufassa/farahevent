import logging
import httpx
from datetime import datetime, timezone
from app.core.config import settings

logger = logging.getLogger(__name__)

class EmailService:
    def __init__(self):
        self.api_key = settings.RESEND_API_KEY
        self.base_url = "https://api.resend.com"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(timeout=30)
        return self._client

    async def aclose(self) -> None:
        if self._client is not None and not self._client.is_closed:
            await self._client.aclose()

    async def send_ticket_confirmation(
        self,
        email: str,
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
        Envoie la confirmation de billet complète via email avec Resend.
        """
        if not self.api_key:
            logger.warning("RESEND_API_KEY is not set. Email not sent.")
            return False

        try:
            # Note: attachments requires content to be base64 string
            qr_pure = qr_code_base64.replace("data:image/png;base64,", "")

            # HTML content (Premium Dark Theme)
            html_content = f"""
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #070b13; margin: 0; padding: 40px 0; -webkit-font-smoothing: antialiased;">
              <div style="max-width: 600px; margin: 0 auto; background: #111827; border-radius: 20px; overflow: hidden; border: 1px solid rgba(255,255,255,0.1); box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
                
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); padding: 40px 32px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05);">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -1px;">
                    Farah<span style="color: #818cf8;">Event</span>
                  </h1>
                  <p style="color: #94a3b8; font-size: 14px; margin-top: 8px; margin-bottom: 0; text-transform: uppercase; letter-spacing: 2px;">Billet Confirmé</p>
                </div>

                <!-- Body -->
                <div style="padding: 40px 32px;">
                  <h2 style="color: #f8fafc; font-size: 22px; margin-top: 0; margin-bottom: 24px; font-weight: 600;">Bonjour {buyer_name},</h2>
                  <p style="color: #cbd5e1; font-size: 16px; line-height: 26px; margin-bottom: 32px; font-weight: 400;">Votre place est réservée. Préparez-vous à vivre une expérience inoubliable. Voici les détails de votre accès :</p>
                  
                  <!-- Event Card -->
                  <div style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 32px; margin-bottom: 40px;">
                    <h3 style="color: #f8fafc; font-size: 20px; margin-top: 0; margin-bottom: 24px; font-weight: 700;">{event_title}</h3>
                    
                    <div style="margin-bottom: 16px; display: flex; align-items: center;">
                      <strong style="color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; width: 100px;">Date</strong> 
                      <span style="color: #f1f5f9; font-weight: 500; font-size: 16px;">{event_date}</span>
                    </div>
                    
                    <div style="margin-bottom: 16px; display: flex; align-items: center;">
                      <strong style="color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; width: 100px;">Lieu</strong> 
                      <span style="color: #f1f5f9; font-weight: 500; font-size: 16px;">{event_venue}</span>
                    </div>
                    
                    <div style="margin-bottom: 16px; display: flex; align-items: center;">
                      <strong style="color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; width: 100px;">Billet</strong> 
                      <span style="background-color: rgba(99, 102, 241, 0.15); color: #818cf8; padding: 4px 12px; border-radius: 9999px; font-size: 14px; font-weight: 600;">{ticket_category}</span>
                    </div>
                    
                    <div style="margin-bottom: 16px; display: flex; align-items: center;">
                      <strong style="color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; width: 100px;">Total</strong> 
                      <span style="color: #f1f5f9; font-weight: 500; font-size: 16px;">{int(amount):,} FCFA</span>
                    </div>

                    <div style="display: flex; align-items: center;">
                      <strong style="color: #64748b; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; display: inline-block; width: 100px;">Réf.</strong> 
                      <span style="color: #f1f5f9; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-weight: 600; font-size: 15px; letter-spacing: 1px;">{ticket_id[-8:].upper()}</span>
                    </div>
                  </div>

                  <div style="text-align: center; margin-bottom: 32px;">
                    <p style="color: #94a3b8; font-size: 15px; line-height: 24px; margin-bottom: 0;">Votre <strong>QR code d'accès</strong> exclusif est joint à cet email.</p>
                    <p style="color: #64748b; font-size: 14px; margin-top: 4px;">Présentez-le sur votre téléphone lors de votre arrivée.</p>
                  </div>
                  
                  {"<!-- Pas de live -->" if not stream_link else f'''
                  <div style="margin-top: 40px; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); border-radius: 16px; padding: 32px; text-align: center; box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.3);">
                    <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border-radius: 50%; background: rgba(255,255,255,0.2); margin-bottom: 16px;">
                      <span style="font-size: 24px;">🔴</span>
                    </div>
                    <h3 style="color: #ffffff; font-size: 20px; margin-top: 0; margin-bottom: 12px; font-weight: 700;">Accès VIP au Live</h3>
                    <p style="color: #e0e7ff; font-size: 15px; margin-bottom: 24px; line-height: 24px;">Votre billet inclut l'accès à la diffusion HD en direct. Le flux s'ouvrira quelques minutes avant le début.</p>
                    <a href="{stream_link}" style="display: inline-block; background-color: #ffffff; color: #4f46e5; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-size: 16px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); text-transform: uppercase; letter-spacing: 0.5px;">Rejoindre la Diffusion</a>
                  </div>
                  '''}
                  
                </div>
                
                <!-- Footer -->
                <div style="background-color: #0b0f19; padding: 32px; text-align: center; border-top: 1px solid rgba(255,255,255,0.05);">
                  <p style="color: #64748b; font-size: 13px; margin: 0; line-height: 20px;">Ce billet est strictement personnel et non transférable.<br>© {datetime.now(timezone.utc).year} FarahEvent. L'excellence à votre portée.</p>
                </div>
              </div>
            </body>
            </html>
            """

            payload = {
                "from": "FarahEvent <tickets@farahevent.tech>",
                "to": [email],
                "subject": f"Billet - {event_title}",
                "html": html_content,
                "attachments": [
                    {
                        "filename": "billet_farahevent.png",
                        "content": qr_pure
                    }
                ]
            }

            response = await self._get_client().post(
                f"{self.base_url}/emails",
                json=payload,
                headers=self.headers,
            )
            response.raise_for_status()
            logger.info("Email confirmation sent to %s for ticket %s", email, ticket_id)
            return True
        except Exception as e:
            logger.exception("Échec de l'envoi de l'email pour le billet (ticket=%s)", ticket_id)
            return False


email_service = EmailService()

"""Rate limiting (slowapi) — protège les endpoints publics critiques (audit §C.4).

Limiter partagé, importé par les endpoints à protéger (/login, /orders, /resend)
et branché dans app.main (state.limiter + exception handler 429).

NB prod : le stockage par défaut est en mémoire (par worker). Derrière plusieurs
workers gunicorn, passer `storage_uri=settings.REDIS_URL` pour un compteur global.
Et configurer nginx (real_ip_header X-Forwarded-For + set_real_ip_from <proxy>)
pour que la clé par IP soit correcte et non falsifiable.
"""
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

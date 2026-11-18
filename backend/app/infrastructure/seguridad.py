"""Hash de claves (scrypt) y tokens de sesión. Solo biblioteca estándar: sin dependencias nuevas."""
import hashlib
import hmac
import secrets

_N, _R, _P = 2**14, 8, 1


def hashear_clave(clave: str) -> str:
    sal = secrets.token_bytes(16)
    h = hashlib.scrypt(clave.encode(), salt=sal, n=_N, r=_R, p=_P)
    return f"scrypt${sal.hex()}${h.hex()}"


def verificar_clave(clave: str, guardado: str) -> bool:
    try:
        _, sal, esperado = guardado.split("$")
        h = hashlib.scrypt(clave.encode(), salt=bytes.fromhex(sal), n=_N, r=_R, p=_P)
        return hmac.compare_digest(h, bytes.fromhex(esperado))
    except (ValueError, TypeError):
        return False


def nuevo_token() -> str:
    return secrets.token_urlsafe(32)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

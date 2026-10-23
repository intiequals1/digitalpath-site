#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PRIVATE_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/digitalpath-site/provenance"
PRIVATE_KEY="$PRIVATE_DIR/maintainer-ml-dsa65.pem"
PUBLIC_KEY="$ROOT/provenance/keys/maintainer-ml-dsa65.pub.pem"

command -v openssl >/dev/null || { echo "OpenSSL 3.5+ is required." >&2; exit 1; }
version="$(openssl version | awk '{print $2}')"
IFS=. read -r major minor _ <<< "$version"
if (( major < 3 || (major == 3 && minor < 5) )); then
  echo "OpenSSL 3.5+ is required; found $version." >&2
  exit 1
fi

if [[ -e "$PRIVATE_KEY" || -e "$PUBLIC_KEY" ]]; then
  echo "A key file already exists. Refusing to overwrite it." >&2
  exit 1
fi

mkdir -p "$PRIVATE_DIR" "$(dirname "$PUBLIC_KEY")"
chmod 700 "$PRIVATE_DIR"
umask 077

read -r -s -p "Set a passphrase (at least 16 characters): " passphrase </dev/tty
printf '\n' >/dev/tty
read -r -s -p "Repeat passphrase: " confirmation </dev/tty
printf '\n' >/dev/tty
if [[ ${#passphrase} -lt 16 || "$passphrase" != "$confirmation" ]]; then
  unset passphrase confirmation
  echo "Passphrases must match and contain at least 16 characters." >&2
  exit 1
fi

printf '%s\n' "$passphrase" | openssl genpkey -algorithm ML-DSA-65 -out "$PRIVATE_KEY" -aes-256-cbc -pass fd:0
chmod 600 "$PRIVATE_KEY"
printf '%s\n' "$passphrase" | openssl pkey -in "$PRIVATE_KEY" -passin fd:0 -pubout -out "$PUBLIC_KEY"
unset passphrase confirmation

fingerprint="$(openssl pkey -pubin -in "$PUBLIC_KEY" -outform DER | openssl dgst -sha256 | awk '{print $NF}')"
printf '\nPublic key: %s\n' "$PUBLIC_KEY"
printf 'SHA-256 fingerprint: %s\n' "$fingerprint"
printf 'Private key: %s (encrypted; do not commit or upload)\n' "$PRIVATE_KEY"
printf 'Next: commit only the public key, then store the fingerprint independently as GitHub Actions variable PROVENANCE_PUBLIC_KEY_SHA256.\n'

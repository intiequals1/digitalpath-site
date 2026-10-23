#!/usr/bin/env python3
"""Create a detached ML-DSA-65 attestation for the current clean Git snapshot."""
from __future__ import annotations

import getpass
import hashlib
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPOSITORY = "https://github.com/intiequals1/digitalpath-site"
CONTEXT = "DigitalpathProvenanceV1"
PUBLIC_KEY = ROOT / "provenance/keys/maintainer-ml-dsa65.pub.pem"
ATTESTATION_DIR = ROOT / "provenance/attestations"
DEFAULT_PRIVATE_KEY = Path(os.environ.get("XDG_CONFIG_HOME", Path.home() / ".config")) / "digitalpath-site/provenance/maintainer-ml-dsa65.pem"


def run(args: list[str], *, input_bytes: bytes | None = None) -> bytes:
    return subprocess.run(args, cwd=ROOT, check=True, stdout=subprocess.PIPE, input=input_bytes).stdout


def require_openssl_35() -> None:
    text = run(["openssl", "version"]).decode().strip()
    match = re.search(r"OpenSSL\s+(\d+)\.(\d+)\.(\d+)", text)
    if not match or tuple(map(int, match.groups())) < (3, 5, 0):
        raise SystemExit(f"OpenSSL 3.5+ with ML-DSA support is required; found: {text}")


def snapshot_digest(revision: str) -> str:
    entries = run(["git", "ls-tree", "-r", "-z", "--full-tree", revision]).split(b"\0")
    records = []
    for entry in entries:
        if not entry:
            continue
        header, path_bytes = entry.split(b"\t", 1)
        mode, object_type, object_id = header.decode("ascii").split()
        if path_bytes.startswith(b"provenance/attestations/"):
            continue
        if object_type != "blob":
            raise SystemExit("Submodules or non-blob entries are not supported by this snapshot format.")
        content = run(["git", "cat-file", "blob", object_id])
        records.append({
            "mode": mode,
            "path": path_bytes.decode("utf-8"),
            "sha256": hashlib.sha256(content).hexdigest(),
        })
    records.sort(key=lambda item: item["path"])
    canonical = json.dumps(records, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(canonical).hexdigest()


def main() -> int:
    try:
        require_openssl_35()
        status = run(["git", "status", "--porcelain"]).decode().strip()
        if status:
            raise SystemExit("Git-Arbeitsbaum muss sauber sein. Committe zuerst alle Änderungen.")
        if not PUBLIC_KEY.is_file():
            raise SystemExit(f"Öffentlicher Schlüssel fehlt: {PUBLIC_KEY}. Zuerst generate-key.sh ausführen und den Schlüssel committen.")

        private_key = Path(os.environ.get("DIGITALPATH_MLDSA_PRIVATE_KEY", str(DEFAULT_PRIVATE_KEY))).expanduser()
        if not private_key.is_file():
            raise SystemExit(f"Privater Schlüssel fehlt: {private_key}. Erzeuge ihn lokal mit scripts/provenance/generate-key.sh.")

        commit = run(["git", "rev-parse", "HEAD"]).decode().strip()
        tree = run(["git", "rev-parse", f"{commit}^{{tree}}"])
        tree = tree.decode().strip()
        fingerprint = hashlib.sha256(run(["openssl", "pkey", "-pubin", "-in", str(PUBLIC_KEY), "-outform", "DER"])).hexdigest()
        now_local = datetime.now().astimezone().isoformat(timespec="seconds")
        now_utc = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
        digest = snapshot_digest(commit)
        manifest = {
            "schemaVersion": "digitalpath-provenance/v1",
            "repository": REPOSITORY,
            "createdAtUtc": now_utc,
            "createdAtLocal": now_local,
            "signature": {
                "algorithm": "ML-DSA-65",
                "context": CONTEXT,
                "publicKeyFingerprintSha256": fingerprint,
            },
            "subject": {
                "commit": commit,
                "gitTree": tree,
                "trackedContentSha256": digest,
                "digestScope": "Canonical SHA-256 list of tracked file paths, modes and blob hashes, excluding provenance/attestations/**.",
            },
            "attribution": {
                "humanMaintainerClaim": {
                    "name": "Claudiu Dangulea",
                    "github": "intiequals1",
                    "identityNote": "Maintainer assertion; verify the public-key fingerprint independently.",
                },
                "aiAssistance": {
                    "assistant": "Manus",
                    "role": "AI-assisted development and documentation",
                    "cryptographicSigner": False,
                },
            },
        }
        stem = f"attestation-{commit[:12]}"
        ATTESTATION_DIR.mkdir(parents=True, exist_ok=True)
        manifest_path = ATTESTATION_DIR / f"{stem}.json"
        signature_path = ATTESTATION_DIR / f"{stem}.sig"
        if manifest_path.exists() or signature_path.exists():
            raise SystemExit(f"Attestierung existiert bereits: {stem}. Keine Datei wird überschrieben.")
        manifest_bytes = (json.dumps(manifest, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
        manifest_path.write_bytes(manifest_bytes)
        passphrase = getpass.getpass("Passphrase des ML-DSA-Schlüssels: ")
        if not passphrase:
            manifest_path.unlink(missing_ok=True)
            raise SystemExit("Leere Passphrase nicht zulässig.")
        try:
            subprocess.run([
                "openssl", "pkeyutl", "-sign", "-in", str(manifest_path),
                "-inkey", str(private_key), "-passin", "fd:0", "-out", str(signature_path),
                "-pkeyopt", f"context-string:{CONTEXT}",
            ], cwd=ROOT, check=True, input=(passphrase + "\n").encode("utf-8"), stdout=subprocess.PIPE)
        except Exception:
            manifest_path.unlink(missing_ok=True)
            signature_path.unlink(missing_ok=True)
            raise
        finally:
            passphrase = ""
        subprocess.run([
            "openssl", "pkeyutl", "-verify", "-in", str(manifest_path),
            "-inkey", str(PUBLIC_KEY), "-pubin", "-sigfile", str(signature_path),
            "-pkeyopt", f"context-string:{CONTEXT}",
        ], cwd=ROOT, check=True, stdout=subprocess.PIPE)
        print(f"Attestierung erstellt: {manifest_path.relative_to(ROOT)}")
        print(f"Signatur erstellt: {signature_path.relative_to(ROOT)}")
        print(f"Snapshot SHA-256: {digest}")
        print(f"Schlüsselfingerabdruck: {fingerprint}")
        print("Committe Manifest und Signatur. Der Fingerabdruck muss zusätzlich in GitHub als Variable PROVENANCE_PUBLIC_KEY_SHA256 verankert sein.")
        return 0
    except (subprocess.CalledProcessError, OSError) as error:
        print(f"Fehler bei der ML-DSA-Attestierung: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

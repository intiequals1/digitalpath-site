#!/usr/bin/env python3
"""Verify ML-DSA snapshot attestations for the current repository state."""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
REPOSITORY = "https://github.com/intiequals1/digitalpath-site"
CONTEXT = "DigitalpathProvenanceV1"
PUBLIC_KEY = ROOT / "provenance/keys/maintainer-ml-dsa65.pub.pem"
ATTESTATION_DIR = ROOT / "provenance/attestations"


def run(args: list[str]) -> bytes:
    return subprocess.run(args, cwd=ROOT, check=True, stdout=subprocess.PIPE).stdout


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


def write_summary(text: str) -> None:
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as handle:
            handle.write(text + "\n")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--require-anchor", action="store_true", help="Fail unless the GitHub public-key fingerprint variable is configured.")
    parser.add_argument(
        "--mode",
        choices=("integrity", "current"),
        default="integrity",
        help=(
            "integrity: alle vorhandenen Attestierungen müssen gültig sein; ein noch nicht signierter aktueller Stand "
            "ist zulässig (Beiträge Dritter werden nicht blockiert). current: zusätzlich muss der aktuelle Stand "
            "attestiert sein (für Veröffentlichungen/Tags)."
        ),
    )
    args = parser.parse_args()

    try:
        require_openssl_35()
        if not PUBLIC_KEY.is_file():
            raise SystemExit(f"Öffentlicher ML-DSA-Schlüssel fehlt: {PUBLIC_KEY}")
        attestations = sorted(ATTESTATION_DIR.glob("attestation-*.json"))
        if not attestations:
            raise SystemExit("Keine ML-DSA-Attestierung vorhanden; Provenienz ist noch nicht aktiviert.")

        public_der = run(["openssl", "pkey", "-pubin", "-in", str(PUBLIC_KEY), "-outform", "DER"])
        fingerprint = hashlib.sha256(public_der).hexdigest()
        anchored = os.environ.get("PROVENANCE_PUBLIC_KEY_SHA256", "").strip().lower()
        if args.require_anchor and not anchored:
            raise SystemExit("GitHub Actions Variable PROVENANCE_PUBLIC_KEY_SHA256 fehlt; der Schlüssel ist nicht unabhängig verankert.")
        if anchored and anchored != fingerprint:
            raise SystemExit("Der öffentliche Schlüssel stimmt nicht mit PROVENANCE_PUBLIC_KEY_SHA256 überein.")
        if not anchored:
            print("WARNUNG: Signatur wird lokal geprüft, aber der Schlüssel-Fingerabdruck ist nicht unabhängig verankert.")

        current_commit = run(["git", "rev-parse", "HEAD"]).decode().strip()
        current_digest = snapshot_digest(current_commit)
        current_verified = False
        for manifest_path in attestations:
            signature_path = manifest_path.with_suffix(".sig")
            if not signature_path.is_file():
                raise SystemExit(f"Signaturdatei fehlt: {signature_path.name}")
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            if manifest.get("repository") != REPOSITORY:
                raise SystemExit(f"Falsches Repository in {manifest_path.name}")
            signature = manifest.get("signature", {})
            subject = manifest.get("subject", {})
            if signature.get("algorithm") != "ML-DSA-65" or signature.get("context") != CONTEXT:
                raise SystemExit(f"Nicht unterstützte Signaturparameter in {manifest_path.name}")
            if signature.get("publicKeyFingerprintSha256", "").lower() != fingerprint:
                raise SystemExit(f"Schlüsselfingerabdruck im Manifest stimmt nicht: {manifest_path.name}")
            commit = subject.get("commit", "")
            if not re.fullmatch(r"[0-9a-f]{40,64}", commit):
                raise SystemExit(f"Ungültiger Commit im Manifest: {manifest_path.name}")
            run(["git", "cat-file", "-e", f"{commit}^{{commit}}"])
            tree = run(["git", "rev-parse", f"{commit}^{{tree}}"]).decode().strip()
            if tree != subject.get("gitTree"):
                raise SystemExit(f"Git-Tree stimmt nicht mit dem signierten Manifest überein: {manifest_path.name}")
            subject_digest = snapshot_digest(commit)
            if subject_digest != subject.get("trackedContentSha256"):
                raise SystemExit(f"Snapshot-Digest stimmt für den attestierten Commit nicht: {manifest_path.name}")
            subprocess.run([
                "openssl", "pkeyutl", "-verify", "-in", str(manifest_path),
                "-inkey", str(PUBLIC_KEY), "-pubin", "-sigfile", str(signature_path),
                "-pkeyopt", f"context-string:{CONTEXT}",
            ], cwd=ROOT, check=True, stdout=subprocess.PIPE)
            if subject_digest == current_digest:
                current_verified = True
            print(f"Gültige ML-DSA-65-Signatur: {manifest_path.name}")

        print(f"Öffentlicher Schlüssel SHA-256: {fingerprint}")
        if current_verified:
            print(f"Aktueller Snapshot verifiziert: {current_digest}")
            write_summary(f"✅ Aktueller Stand ist vom Maintainer attestiert (`{current_digest[:16]}…`).")
            return 0
        if args.mode == "current":
            raise SystemExit("Keine gültige Attestierung passt zum aktuellen getrackten Repository-Snapshot.")
        print(f"Hinweis: Aktueller Snapshot noch nicht attestiert ({current_digest}); Maintainer-Signatur ausstehend.")
        write_summary(
            "ℹ️ Alle vorhandenen Attestierungen sind gültig. Dieser Stand ist noch nicht vom Maintainer signiert; "
            "das blockiert keinen Beitrag. Signiert wird nach dem Merge."
        )
        return 0
    except (subprocess.CalledProcessError, OSError, json.JSONDecodeError) as error:
        print(f"Verifikation fehlgeschlagen: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

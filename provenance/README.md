# ML-DSA-Provenienz einrichten

Die Signatur verwendet ML-DSA-65 gemäß NIST FIPS 204. OpenSSL 3.5 oder neuer wird benötigt. Das lokale Manus-Gerät wurde mit OpenSSL 3.6.4 getestet. Der private Schlüssel wird nicht ins Repository geschrieben.

## Einmalige Einrichtung durch den Maintainer

1. Stelle sicher, dass `openssl version` mindestens 3.5 ausgibt und der Git-Arbeitsbaum sauber ist.
2. Führe `./scripts/provenance/generate-key.sh` aus. Das Skript fragt interaktiv nach einer Passphrase. Der verschlüsselte private Schlüssel wird unter `~/.config/digitalpath-site/provenance/maintainer-ml-dsa65.pem` gespeichert; nur der öffentliche Schlüssel wird in `provenance/keys/maintainer-ml-dsa65.pub.pem` abgelegt. Committe ausschließlich den öffentlichen Schlüssel.
3. Kopiere den vom Skript ausgegebenen SHA-256-Fingerabdruck unabhängig aus dem Repository, zum Beispiel in die GitHub-Repository-Variable `PROVENANCE_PUBLIC_KEY_SHA256` unter **Settings → Secrets and variables → Actions → Variables**. Teile diesen öffentlichen Fingerabdruck zusätzlich über einen zweiten, vertrauenswürdigen Kanal. Ohne diesen Anker könnte jemand öffentlichen Schlüssel und Signatur gemeinsam austauschen.
4. Nachdem der öffentliche Schlüssel eingecheckt und die Variable gesetzt ist, signiere den sauberen Stand mit `python3 scripts/provenance/create_attestation.py`. Das Skript fragt die Passphrase verdeckt ab und erstellt ein JSON-Manifest sowie eine detached Signatur unter `provenance/attestations/`. Committe beide Attestierungsdateien.
5. Prüfe lokal mit `python3 scripts/provenance/verify_attestations.py --require-anchor`. Der GitHub-Workflow führt dieselbe Prüfung aus. Aktiviere anschließend in den GitHub-Einstellungen ein Ruleset für `main`, das den Statuscheck **Verify ML-DSA Provenance** verlangt. Die Aktivierung des Rulesets ist ein separater Schritt; der Workflow allein erzwingt keine Merge-Sperre.

Das Signierskript attestiert den aktuellen Commit. Die Attestierungsdateien selbst werden aus dem Snapshot-Digest ausgeschlossen, damit die Signaturdatei nicht zirkulär mit sich selbst signiert wird. Änderungen an anderen getrackten Dateien erfordern eine neue Attestierung. Eine fehlende oder nicht übereinstimmende aktuelle Attestierung lässt den Verifikationscheck scheitern, sobald die Pipeline aktiviert ist.

Der Fingerabdruck ist öffentlich, der private Schlüssel und die Passphrase sind geheim. Lege den privaten Schlüssel weder in Git, Google Drive noch in GitHub Actions ab. Verwahre eine verschlüsselte Sicherung offline. Bei Verlust oder Schlüsselwechsel muss der neue Fingerabdruck über einen unabhängigen Kanal bestätigt und der Wechsel dokumentiert werden.

Dieses Verfahren belegt den Besitz eines Schlüssels und Änderungen am attestierten Snapshot. Es macht das Repository nicht unveränderbar und beweist ohne unabhängig bestätigten Fingerabdruck keine reale Identität.

# ML-DSA-Provenienz einrichten

Die Signatur verwendet ML-DSA-65 gemäß NIST FIPS 204. OpenSSL 3.5 oder neuer wird benötigt (unter macOS z. B. `brew install openssl@3`; das mitgelieferte LibreSSL genügt nicht). Der private Schlüssel wird nicht ins Repository geschrieben.

## Grundsatz: offene Mitarbeit

Jede und jeder soll beitragen können, ohne einen Schlüssel zu besitzen. Deshalb gilt:

- **Pull Requests und Pushes** werden im Modus `integrity` geprüft: Alle vorhandenen Attestierungen müssen gültig sein und zum unabhängig verankerten Schlüssel passen. Ein noch nicht signierter aktueller Stand ist ein Hinweis, kein Fehler. Beiträge Dritter werden dadurch nicht blockiert.
- **Signiert wird nach dem Merge.** Der Maintainer attestiert gemergte Stände in Abständen, mindestens vor einer Veröffentlichung. Das Manifest führt die Git-Autorinnen und -Autoren bis zum attestierten Commit auf; Beiträge werden so mitsigniert.
- **Veröffentlichungen** werden mit einem Tag `attested-JJJJ-MM-TT` markiert. Für Tags und manuelle Läufe gilt der Modus `current`: Der aktuelle Stand muss attestiert sein.
- **Geschützt ist nur die Vertrauensbasis.** `provenance/`, `scripts/provenance/` und `.github/` stehen in `.github/CODEOWNERS`; Änderungen dort brauchen die Freigabe des Maintainers.

## Einmalige Einrichtung durch den Maintainer

1. Stelle sicher, dass `openssl version` mindestens 3.5 ausgibt und der Git-Arbeitsbaum sauber ist.
2. Führe `./scripts/provenance/generate-key.sh` aus. Das Skript fragt interaktiv nach einer Passphrase. Der verschlüsselte private Schlüssel wird unter `~/.config/digitalpath-site/provenance/maintainer-ml-dsa65.pem` gespeichert; nur der öffentliche Schlüssel wird in `provenance/keys/maintainer-ml-dsa65.pub.pem` abgelegt. Committe ausschließlich den öffentlichen Schlüssel.
3. Hinterlege den ausgegebenen SHA-256-Fingerabdruck unabhängig vom Repository als GitHub-Repository-Variable `PROVENANCE_PUBLIC_KEY_SHA256` (**Settings → Secrets and variables → Actions → Variables**). Teile ihn zusätzlich über einen zweiten, vertrauenswürdigen Kanal. Ohne diesen Anker könnte jemand öffentlichen Schlüssel und Signatur gemeinsam austauschen.
4. Signiere den sauberen Stand mit `python3 scripts/provenance/create_attestation.py`. Das Skript fragt die Passphrase verdeckt ab und erstellt ein JSON-Manifest sowie eine detached Signatur unter `provenance/attestations/`. Committe beide Dateien.
5. Prüfe lokal mit `python3 scripts/provenance/verify_attestations.py --require-anchor --mode current`.
6. Lege in den GitHub-Einstellungen ein Ruleset für `main` an: Änderungen nur per Pull Request, Statuscheck **Verify ML-DSA Provenance** erforderlich, Review durch Code Owners erforderlich. Der Check läuft im Modus `integrity` und blockiert daher keine Beiträge Dritter.

## Laufender Betrieb

- Nach einem oder mehreren Merges: `git pull`, dann `python3 scripts/provenance/create_attestation.py` und die beiden neuen Dateien per Pull Request einreichen.
- Für eine Veröffentlichung zusätzlich `git tag attested-JJJJ-MM-TT && git push origin attested-JJJJ-MM-TT`; der Workflow prüft dann im Modus `current`.

Die Attestierungsdateien selbst werden aus dem Snapshot-Digest ausgeschlossen, damit die Signaturdatei nicht zirkulär mit sich selbst signiert wird. Der Digest beruht auf Dateipfaden, Modi und Inhalten; ein Merge-Commit mit identischem Inhalt bleibt daher attestiert.

Der Fingerabdruck ist öffentlich, der private Schlüssel und die Passphrase sind geheim. Lege den privaten Schlüssel weder in Git, Google Drive noch in GitHub Actions ab. Verwahre eine verschlüsselte Sicherung offline. Bei Verlust oder Schlüsselwechsel muss der neue Fingerabdruck über einen unabhängigen Kanal bestätigt und der Wechsel dokumentiert werden.

Dieses Verfahren belegt den Besitz eines Schlüssels und Änderungen am attestierten Snapshot. Es macht das Repository nicht unveränderbar und beweist ohne unabhängig bestätigten Fingerabdruck keine reale Identität.

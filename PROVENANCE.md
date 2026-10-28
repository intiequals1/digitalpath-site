# Provenienz und Rückverfolgbarkeit

## Aktueller Stand

Dieses Repository enthält eine transparente Provenienz-Pipeline mit ML-DSA-65-Signierung und Verifikation. Ob sie aktiv ist, zeigt der Ordner [`provenance/attestations/`](provenance/attestations/): Liegt dort mindestens ein signiertes Manifest, ist die Attestierung aktiviert; der öffentliche Schlüssel liegt unter `provenance/keys/`, sein Fingerabdruck ist zusätzlich unabhängig vom Repository verankert. Der private Schlüssel wird vom Maintainer selbst erzeugt und verschlüsselt außerhalb des Repositories verwahrt.

Die Pipeline ist auf offene Mitarbeit ausgelegt: Pull Requests von allen werden nur auf die Gültigkeit vorhandener Signaturen geprüft; ein noch nicht signierter Stand blockiert keinen Beitrag. Der Maintainer signiert gemergte Stände nachträglich, das Manifest führt die Git-Autorinnen und -Autoren auf. Details stehen in [`provenance/README.md`](provenance/README.md).

## Herkunft des Website-Entwurfs

Der Ausgangsstand wurde am **23. Oktober 2026 um 22:14:53 Uhr (Europe/Vienna, UTC+02:00)** im Git-Commit `a8acdf0fb0aec16ae20f9c63fe8b6f85666aa4bd` gespeichert. Git führt als Autor-Metadaten `Claudiu Dangulea <claudiu@dangulea.at>`. Die Website wurde in diesem Arbeitsablauf mit Unterstützung von **Manus, einem KI-Assistenten**, erstellt. Die Commit-Angabe ist Git-Metadatum und für sich genommen kein Identitätsnachweis; Manus ist als Assistenz offengelegt, nicht als kryptografischer Signierer.

## Was die ML-DSA-Attestierung prüft

Nach der Aktivierung signiert ML-DSA-65 ein Manifest, das einen Commit, dessen Git-Tree, einen SHA-256-Digest der getrackten Dateipfade und Dateiinhalte, einen Zeitstempel sowie die offengelegte menschliche und KI-Unterstützung festhält. Die Attestierungsmethode ist so angelegt, dass Änderungen am erfassten Repository-Snapshot die Verifikation scheitern lassen. Die Signatur beweist den Besitz des zugehörigen privaten Schlüssels. Sie beweist nicht automatisch, welche reale Person diesen Schlüssel kontrolliert; dafür muss der öffentliche Schlüsselfingerabdruck außerhalb dieses Repositories überprüft und dauerhaft festgehalten werden.

Das ist manipulationsnachweisend, nicht unveränderbar. Repository-Eigentümer oder GitHub-Administratoren können Dateien, Workflows, Regeln oder das gesamte Repository weiterhin ändern oder löschen. Ein GitHub-Ruleset, das den Verifikationscheck verlangt, erschwert Änderungen durch Beitragende, kann aber vom Eigentümer geändert oder entfernt werden. Für Nachweise über eine Löschung wäre zusätzlich ein unabhängig verwahrter externer Zeitstempel oder Checkpoint nötig.

ML-DSA ist ein post-quantenresistenter Signaturalgorithmus aus NIST FIPS 204. Das macht nicht automatisch GitHub, die gesamte Git-Historie oder jede andere Komponente dieser Website quantensicher. Quellen: [NIST FIPS 204](https://csrc.nist.gov/pubs/fips/204/final), [OpenSSL 3.5 ML-DSA-Dokumentation](https://docs.openssl.org/3.5/man7/EVP_SIGNATURE-ML-DSA/).

## Unabhängiger Schlüsselanker

Der SHA-256-Fingerabdruck des öffentlichen Maintainer-Schlüssels ist außerhalb von GitHub im DNS von digitalpath.at hinterlegt:

    dig +short TXT _provenance.digitalpath.at
    "ml-dsa-65 sha256=9808028e534cb3a3b2d9205c0516ba015af1daf10f06c69af05c20ee1cae2d60"

Zur Prüfung diesen Wert mit dem Fingerabdruck von `provenance/keys/maintainer-ml-dsa65.pub.pem` vergleichen:

    openssl pkey -pubin -in provenance/keys/maintainer-ml-dsa65.pub.pem -outform DER | shasum -a 256

Stimmen die Werte nicht überein, ist der Schlüssel im Repository nicht vertrauenswürdig. Ein Schlüsselwechsel wird an beiden Stellen und in diesem Dokument festgehalten.

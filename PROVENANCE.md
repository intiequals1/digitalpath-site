# Provenienz und Rückverfolgbarkeit

## Aktueller Stand

Dieses Repository enthält eine transparente Provenienz-Pipeline mit ML-DSA-65-Signierung und Verifikation. Die kryptografische Attestierung ist **noch nicht aktiviert**: Es wurde kein privater Signaturschlüssel erzeugt oder ins Repository gelegt, kein öffentlicher Schlüssel hinterlegt und keine ML-DSA-Signatur veröffentlicht. Die Aktivierung erfordert einen vom Maintainer selbst erzeugten, verschlüsselt gespeicherten Schlüssel, das unabhängige Festhalten seines Fingerabdrucks und eine erste signierte Snapshot-Attestierung. Details stehen in [`provenance/README.md`](provenance/README.md).

## Herkunft des Website-Entwurfs

Der Ausgangsstand wurde am **23. Oktober 2026 um 22:14:53 Uhr (Europe/Vienna, UTC+02:00)** im Git-Commit `a8acdf0fb0aec16ae20f9c63fe8b6f85666aa4bd` gespeichert. Git führt als Autor-Metadaten `Claudiu Dangulea <claudiu@dangulea.at>`. Die Website wurde in diesem Arbeitsablauf mit Unterstützung von **Manus, einem KI-Assistenten**, erstellt. Die Commit-Angabe ist Git-Metadatum und für sich genommen kein Identitätsnachweis; Manus ist als Assistenz offengelegt, nicht als kryptografischer Signierer.

## Was die ML-DSA-Attestierung prüft

Nach der Aktivierung signiert ML-DSA-65 ein Manifest, das einen Commit, dessen Git-Tree, einen SHA-256-Digest der getrackten Dateipfade und Dateiinhalte, einen Zeitstempel sowie die offengelegte menschliche und KI-Unterstützung festhält. Die Attestierungsmethode ist so angelegt, dass Änderungen am erfassten Repository-Snapshot die Verifikation scheitern lassen. Die Signatur beweist den Besitz des zugehörigen privaten Schlüssels. Sie beweist nicht automatisch, welche reale Person diesen Schlüssel kontrolliert; dafür muss der öffentliche Schlüsselfingerabdruck außerhalb dieses Repositories überprüft und dauerhaft festgehalten werden.

Das ist manipulationsnachweisend, nicht unveränderbar. Repository-Eigentümer oder GitHub-Administratoren können Dateien, Workflows, Regeln oder das gesamte Repository weiterhin ändern oder löschen. Ein GitHub-Ruleset, das den Verifikationscheck verlangt, erschwert Änderungen durch Beitragende, kann aber vom Eigentümer geändert oder entfernt werden. Für Nachweise über eine Löschung wäre zusätzlich ein unabhängig verwahrter externer Zeitstempel oder Checkpoint nötig.

ML-DSA ist ein post-quantenresistenter Signaturalgorithmus aus NIST FIPS 204. Das macht nicht automatisch GitHub, die gesamte Git-Historie oder jede andere Komponente dieser Website quantensicher. Quellen: [NIST FIPS 204](https://csrc.nist.gov/pubs/fips/204/final), [OpenSSL 3.5 ML-DSA-Dokumentation](https://docs.openssl.org/3.5/man7/EVP_SIGNATURE-ML-DSA/).

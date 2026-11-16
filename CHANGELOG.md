# Änderungsprotokoll

## 2026-11-16 – Hinweis „im Aufbau“

### Was geändert wurde

- `index.html`, `demonstrator/index.html`, `impressum.html`, `datenschutz.html`: Unter der Kopfzeile steht auf jeder Seite der Hinweis „Diese Website ist noch im Aufbau. Inhalte und Funktionen werden laufend ergänzt und verbessert.“, gleichlautend mit dangulea.at. Stile in `styles.css` und im eingebetteten CSS von `index.html`.

### Warum

- Auf Wunsch des Betreibers tragen alle eigenen Websites denselben Hinweis zum Entwicklungsstand. Das macht sichtbar, dass Inhalte und Funktionen sich noch ändern.

## 2026-11-16 – Satz zur Verbraucherschlichtung entfernt

### Was geändert wurde

- `impressum.html`: Der Abschnitt „Verbraucherschlichtung“ mit dem Satz „Ich bin weder bereit noch verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.“ ist entfernt.

### Warum

- Die Formulierung stammt aus dem deutschen Verbraucherstreitbeilegungsgesetz (§ 36 VSBG). Für ein österreichisches Einzelunternehmen gilt das Alternative-Streitbeilegung-Gesetz (AStG). Nach § 19 AStG muss nur informieren, wer sich zur Teilnahme an Schlichtungsverfahren verpflichtet hat oder gesetzlich dazu verpflichtet ist. Wer das nicht ist, braucht vorab keinen Hinweis auf der Website (WKO, „Alternative Streitbeilegung in Verbraucherangelegenheiten“).
- Ob im Einzelfall eine Schlichtung in Frage kommt, bleibt damit offen. Der Satz legte das vorab unnötig und schroff ablehnend fest. Kommt es zu einem konkreten Streitfall, der sich nicht direkt lösen lässt, ist dann zu sagen, ob man an einem Verfahren teilnimmt (§ 19 Abs. 3 AStG).
- Auf Rückfrage des Betreibers, der den Satz für unsicher und unpassend formuliert hielt.

## 2026-11-16 – Lokale Schriften, Impressum, Datenschutzerklärung, Datenschutzhinweis

### Was geändert wurde

- **Schriften lokal:** `demonstrator/index.html` lud DM Sans, Manrope und DM Mono von `fonts.googleapis.com`/`fonts.gstatic.com`. Die Schriften liegen jetzt unter `assets/fonts/` (Fontsource 5.3.0, je Latin und Latin Extended, SIL Open Font License 1.1 in `assets/fonts/OFL-*.txt`). `fonts.css` bindet sie ein, verwendet von der Startseite und vom Demonstrator. Die Startseite nutzte dieselben Schriftnamen bisher ohne Einbindung und fiel auf Systemschriften zurück; jetzt erscheint sie in der gestalteten Schrift.
- **Demonstrator speichert nicht mehr beim bloßen Aufruf:** `demonstrator/demonstrator.js` hat Beispieldaten beim ersten Öffnen sofort in den localStorage geschrieben. Jetzt bleiben sie im Arbeitsspeicher; gespeichert wird erst bei der ersten eigenen Aktion. Statustext und Erklärung im Demonstrator sind angepasst.
- **Impressum (`impressum.html`) und Datenschutzerklärung (`datenschutz.html`) neu**, verlinkt im Footer der Start- und der Demonstratorseite. Die Angaben entsprechen denen der übrigen eigenen Websites (Medieninhaber, Gewerbeberechtigungen, Behörde, Kammer, Kleinunternehmerregelung). Die Datenschutzerklärung beschreibt Hosting über GitHub Pages, lokale Schriften, die localStorage-Schlüssel des Demonstrators, den Datenschutzhinweis, Mitwirken über GitHub, E-Mail-Kontakt und Betroffenenrechte.
- **Datenschutzhinweis:** `script.js` zeigt am unteren Rand einen Hinweis ohne Einwilligungsabfrage. „Verstanden“ speichert im localStorage `dp.datenschutzhinweis.v1` = `geschlossen`. Stile in `styles.css` und im eingebetteten CSS von `index.html`.
- `README.md`: Abschnitt zu Webfonts und Aufbau aktualisiert.

### Warum

- Am 16.11.2026 wurden alle eigenen Websites live geprüft (Cookies, Browser-Speicher, angefragte Hosts). Anlass war, dass dangulea.at Schriftarten bis dahin von Google-Servern geladen hatte.
- **Google Fonts:** Beim Laden von Google-Servern erhält Google die IP-Adresse der Besucherinnen und Besucher. Gerichte (u. a. LG München I, 2022) haben das ohne Einwilligung als unzulässig bewertet. Lokal ausgelieferte Schriften vermeiden diese Übermittlung vollständig.
- **Speichern beim Aufruf:** Nach § 165 Abs. 3 TKG 2021 (Umsetzung von Art. 5 Abs. 3 der ePrivacy-Richtlinie 2002/58/EG) ist Speichern im Endgerät ohne Einwilligung nur zulässig, soweit es für einen ausdrücklich gewünschten Dienst unbedingt erforderlich ist. Beispieldaten beim bloßen Öffnen abzulegen, ist dafür nicht nötig. Jetzt geschieht es erst, wenn jemand den Demonstrator tatsächlich benutzt.
- **Impressum und Datenschutzerklärung fehlten:** Die Seite gab bisher weder Anbieterangaben (§ 5 ECG, § 25 MedienG) noch Informationen nach Art. 13 DSGVO (Hosting, Server-Logdaten, Drittlandübermittlung). Beide Seiten antworteten mit 404.
- **Datenschutzhinweis:** Auf Wunsch des Betreibers einheitlich auf allen eigenen Seiten eingeführt. Eine Einwilligung wird bewusst nicht abgefragt, weil die Seite nichts einsetzt, das eine erfordert. Das Merken des Schließens ist in der Datenschutzerklärung offengelegt.

### Offen

- Der neue Stand ist noch nicht ML-DSA-attestiert. Die Signatur erfolgt wie vorgesehen durch den Maintainer nach dem Merge (siehe `provenance/README.md`).

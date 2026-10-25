# Digitalpath — Projektlabor

Ein statischer, deutschsprachiger Website-Entwurf für [digitalpath.at](https://www.digitalpath.at/). Das Projektlabor ist die zentrale Seite: Vorhaben sind nach Themen gruppiert und geben Einblick in Fragestellungen, Annahmen, Umsetzung und offene Punkte. Konzepte, Prototypen und validierte Ergebnisse werden sprachlich getrennt.

## Lokal ansehen

Es werden keine Pakete benötigt. Im Projektordner kann die Seite beispielsweise mit Python ausgeliefert werden:

```sh
python3 -m http.server 8000
```

Dann `http://localhost:8000` im Browser öffnen. Das CSS ist direkt in `index.html` eingebettet, damit die Gestaltung auch in einer Einzeldatei-Vorschau erhalten bleibt. `styles.css` enthält zusätzlich die separate, leichter bearbeitbare Fassung.

## Mitwirken

Freigegebene öffentliche Aufgaben werden im [öffentlichen GitHub-Projektboard](https://github.com/users/intiequals1/projects/6) gesammelt und als GitHub-Issues bearbeitet. Zum Eröffnen oder Kommentieren eines Issues und zum Einreichen eines Pull Requests ist ein GitHub-Konto nötig. Issue-Inhalte und Beiträge sind öffentlich. Jira bleibt intern: Aufgaben werden redigiert und nur nach ausdrücklicher Freigabe übernommen; es gibt keine automatische Jira-Synchronisierung. Lies vor dem Beitrag [`CONTRIBUTING.md`](CONTRIBUTING.md) und verwende die [öffentliche Aufgaben-Vorlage](.github/ISSUE_TEMPLATE/public_task.yml). Keine Jira-Schlüssel, internen Links oder vertraulichen Inhalte veröffentlichen.

Ohne GitHub-Konto sind Beiträge per E-Mail an claudiu@dangulea.at möglich; sie werden mit Einverständnis als Issue übernommen. Für Beiträge ist kein Signaturschlüssel nötig: Pull Requests werden nur auf die Gültigkeit vorhandener Signaturen geprüft, signiert wird nach dem Merge.

## KI-Offenlegung und Provenienz

Die Website wurde mit Unterstützung von Manus erstellt. Umfang und Grenzen sind in [`AI_USAGE.md`](AI_USAGE.md) dokumentiert; die Website verweist auch sichtbar auf diese Offenlegung. [`PROVENANCE.md`](PROVENANCE.md) beschreibt den Entstehungsstand und die Grenzen der Signatur. ML-DSA-65-Skripte und der GitHub-Actions-Check liegen unter `scripts/provenance/` und `.github/workflows/verify-provenance.yml`.

Wichtig: Die kryptografische Attestierung ist vorbereitet, aber noch nicht aktiviert. Der Maintainer muss den privaten Schlüssel selbst erzeugen, nur den öffentlichen Schlüssel veröffentlichen, dessen Fingerabdruck außerhalb des Repositories verankern und eine erste Attestierung signieren. Bis dahin meldet der Workflow den offenen Bootstrap-Status. Die Einrichtung ist in [`provenance/README.md`](provenance/README.md) beschrieben. Eine Signatur macht das Repository nicht unveränderbar und beweist ohne unabhängig verankerten Fingerabdruck keine reale Identität.

## Aufbau

- `index.html` — eigenständige, responsive Startseite mit eingebettetem CSS
- `styles.css` — separate Fassung der responsiven Gestaltung
- `script.js` — Themenfilter und mobile Navigation
- `demonstrator/` — Digitaler Demonstrator DP—D1 (Dokumentation und Auswertung von Journey-Beobachtungen, läuft nur im Browser)
- `assets/` — vorhandene Projektmedien und Favicon
- `AI_USAGE.md`, `PROVENANCE.md` — KI-Offenlegung und Herkunftshinweise
- `CONTRIBUTING.md`, `.github/` — öffentliche Beitragsregeln, Aufgabenformular und PR-Vorlage
- `scripts/provenance/`, `provenance/` — Schlüssel-, Signatur- und Verifikationsablauf

Der Entwurf ist ohne Framework und Build-Schritt gehalten. Die Webfonts werden von Google Fonts geladen; bei Offline-Nutzung greifen System-Schriftalternativen. Die Themenfelder und Projektnamen stammen aus der bestehenden Digitalpath-Seite. Projektstände und Funktionen werden nicht behauptet, wenn dafür noch keine freigegebene Dokumentation vorliegt. Vor einer Live-Schaltung müssen die jeweiligen Projektdetails geprüft werden.

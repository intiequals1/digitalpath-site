# Digitalpath — Projektlabor

Ein statischer, deutschsprachiger Website-Entwurf für [digitalpath.at](https://www.digitalpath.at/). Das Projektlabor ist die zentrale Seite: Vorhaben sind nach Themen gruppiert und geben Einblick in Fragestellungen, Annahmen, Umsetzung und offene Punkte. Konzepte, Prototypen und validierte Ergebnisse werden sprachlich getrennt.

## Lokal ansehen

Es werden keine Pakete benötigt. Im Projektordner kann die Seite beispielsweise mit Python ausgeliefert werden:

```sh
python3 -m http.server 8000
```

Dann `http://localhost:8000` im Browser öffnen. Das CSS ist direkt in `index.html` eingebettet, damit die Gestaltung auch dann erhalten bleibt, wenn nur die HTML-Datei in einer Einzeldatei-Vorschau geöffnet wird. Die begleitende `styles.css` ist die separate, leichter bearbeitbare Fassung der Gestaltungsregeln.

## Aufbau

- `index.html` — eigenständig gestaltete Startseite mit eingebettetem CSS, Inhalt, Navigation und Projektübersicht
- `styles.css` — separate Fassung der responsiven Gestaltung
- `script.js` — Themenfilter und mobile Navigation
- `assets/lab-banner.jpg` — bereitgestelltes abstraktes Linienmotiv
- `assets/favicon.svg` — Digitalpath-Wortbildmarke

Der Entwurf ist absichtlich ohne Framework und Build-Schritt gehalten. Die Webfonts werden von Google Fonts geladen; bei Offline-Nutzung greifen System-Schriftalternativen.

## Inhaltliche Hinweise

Die Themenfelder und Projektnamen stammen aus der bestehenden Digitalpath-Seite. Wo noch keine projektbezogene Dokumentation vorliegt, weist die Seite das aus, statt einen Status oder eine Funktion zu behaupten. Die Projektübersicht ist eine gestaltete Konzeptfassung und sollte vor einer Live-Schaltung mit den jeweils aktuellen Projektdetails ergänzt werden.

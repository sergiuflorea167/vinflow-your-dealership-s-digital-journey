# VINflow

VINflow ist die digitale Vorgangskette für Fahrzeughändler – vom Einkauf bis zur Auslieferung.

## Entwicklung

```sh
npm install
npm run dev
```

Qualitätsprüfungen:

```sh
npm test
npm run lint
npm run build
```

## VINcent

VINcent ist der interne KI-Copilot. Das serverseitige KI-Backend ist anbieteroffen und erwartet eine OpenAI-kompatible Chat-Completions-Schnittstelle über diese Supabase-Secrets:

- `AI_API_URL`: vollständige HTTPS-URL des Chat-Completions-Endpunkts
- `AI_API_KEY`: geheimer API-Schlüssel des ausgewählten Anbieters
- `AI_MODEL`: Modellkennung des ausgewählten Anbieters

Direkte Personenkennungen werden vor der Übertragung entfernt. Gespeicherte Chats sind benutzergebunden, durch Row Level Security geschützt und werden nach 30 Tagen gelöscht.

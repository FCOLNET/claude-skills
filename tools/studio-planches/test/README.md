# Vérifications navigateur

Rejoue les corrections du lot 1 dans un vrai navigateur (Chromium headless).

```bash
npm i playwright-core
node verif-v12.mjs ../studio-planches-v12.html
```

Adapter `executablePath` en tête de `verif-v12.mjs` au chemin local de Chromium.
Les messages `ERR_TUNNEL_CONNECTION_FAILED` en fin de sortie sont attendus hors ligne :
ce sont les quatre CDN (xlsx, jszip, jspdf, Google Fonts) que la page charge.

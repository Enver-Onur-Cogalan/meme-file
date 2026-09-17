# Meme File

Windows için video meme kütüphanesi: videolarını chip'lerle etiketle, ara, oynat ve Discord'a sürükle bırak ya da Ctrl+C ile gönder.

Plan: [docs/PLAN.md](docs/PLAN.md) · Tasarım: [design/](design/)

## Geliştirme

```bash
npm install
npm run dev        # uygulamayı geliştirme modunda açar
npm test           # birim testleri
npm run lint
npm run typecheck
```

## Windows kurulum dosyası

`main` dalına her push'ta GitHub Actions Windows'ta derler. **Actions → Build → son çalıştırma → Artifacts → MemeFile-windows** altından `.exe`'yi indir.

Kod imzası olmadığı için ilk açılışta Windows SmartScreen uyarı verir: **Ek bilgi → Yine de çalıştır**.

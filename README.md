# Meme File

Windows için video meme kütüphanesi: videolarını chip'lerle etiketle, ara, oynat ve Discord'a sürükle bırak ya da Ctrl+C ile gönder.

Plan: [docs/PLAN.md](docs/PLAN.md) · Tasarım: [design/](design/)

## Özellikler

- **Kütüphane:** klasör ekle, alt klasörler dahil taranır; klasörler izlenir, yeni videolar **Gelen Kutusu**'na düşer
- **Chip'ler:** renk + 2000'den fazla ikon ya da kendi SVG/PNG ikonun; bir videoya birden fazla chip; sidebar'dan tıklayınca filtre (VE / VEYA)
- **Arama:** dosya adı ve chip adında, Türkçe karakterden bağımsız ("basti" → "bastı")
- **Gönderme:** karttan/oynatıcıdan Discord'a sürükle bırak, `Ctrl+C` ile dosyayı kopyala (çoklu seçim de olur)
- **Oynatıcı:** döngü, ses, tam ekran, klavye kısayolları, yazarak chip ekleme
- **Kırp / Discord'a sığdır / GIF:** orijinale dokunmadan yeni kopya üretir, bitince panoya kopyalar
- **Hızlı arama:** `Ctrl+Shift+Space` ile uygulamayı açmadan ara, Enter ile kopyala
- **Diğer:** favoriler, en çok gönderilenler, aynı videoları bulma, fareyle önizleme, sistem tepsisi, Windows ile başlatma, JSON yedekleme

Anti-cheat açısından: oyunlara, oyun belleğine ya da klavye kancalarına dokunmaz; sadece dosya okur ve Windows'un standart kısayol sistemini kullanır.

## Geliştirme

```bash
npm install
npm run dev        # uygulamayı geliştirme modunda açar
npm test           # birim + ffmpeg entegrasyon testleri
npm run lint
npm run typecheck
```

## Windows kurulum dosyası

`main` dalına her push'ta GitHub Actions Windows'ta derler. **Actions → Build → son çalıştırma → Artifacts → MemeFile-windows** altından `.exe`'yi indir.

Kod imzası olmadığı için ilk açılışta Windows SmartScreen uyarı verir: **Ek bilgi → Yine de çalıştır**.

### Windows'ta test listesi

- [ ] Klasör ekle (Türkçe karakterli ve boşluklu bir klasör de dene), kapaklar ve süreler geliyor mu
- [ ] Karttan Discord'a sürükle bırak
- [ ] `Ctrl+C` → Discord'da `Ctrl+V`
- [ ] Klasöre yeni video kopyala → Gelen Kutusu'na düşüyor mu
- [ ] Discord'a sığdır: 10 MB üstü bir videoyu küçült, Discord kabul ediyor mu
- [ ] `Ctrl+Shift+Space` hızlı arama (oyun açıkken de)
- [ ] Pencereyi kapat → sistem tepsisinde kalıyor mu

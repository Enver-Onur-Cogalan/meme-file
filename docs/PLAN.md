# Meme File — Proje Planı

Windows için video meme kütüphanesi: klasördeki videoları etiketle (chip), ara, oynat,
Discord'a sürükle bırak / kopyala-yapıştır ile gönder.

## Temel ilkeler

- **Dosyalara dokunmaz.** Videolar kullanıcının klasöründe kalır; uygulama sadece
  üstüne metadata katmanı (SQLite) tutar. Silme/taşıma yalnızca açık kullanıcı eylemiyle.
- **Anti-cheat dostu.** Oyun process'lerine erişim, DLL injection, overlay, kernel driver,
  low-level input hook YOK. Global kısayol sadece `globalShortcut` (Windows'ta `RegisterHotKey`).
- **Offline.** İnternete çıkmaz, telemetri yok.

## Teknoloji

| Katman | Seçim | Neden |
|---|---|---|
| Uygulama | Electron (güncel stabil) | Native file drag (`webContents.startDrag`), Discord ile aynı teknoloji |
| Build | electron-vite (`react-ts` template) | Hızlı HMR, main/preload/renderer ayrımı hazır |
| Paketleme | electron-builder → NSIS `.exe` | Windows kurulum dosyası |
| UI | React + TypeScript + Tailwind v4 | Fontlar yerel paket (@fontsource), internet gerekmez |
| Animasyon | Motion (`motion/react`) | Spring fizik, layout animasyonları, paylaşılan eleman geçişleri |
| İkonlar | lucide-react (~1700 ikon) + kullanıcı SVG/PNG yükleme | Chip ikon seçici |
| Veritabanı | `node:sqlite` (Electron'un içindeki Node) | Native modül derleme yok → Mac'ten Windows build kolay. FTS5 dahil doğrulandı |
| Video işleme | ffmpeg + ffprobe (platforma göre binary, `resources/` içinde) | Thumbnail, süre, ses var mı, sıkıştırma, trim |
| CI | GitHub Actions `windows-latest` | Gerçek Windows'ta build + `.exe` artifact |

## Mimari

```
main process (Node)
 ├─ db/            node:sqlite, migration'lar
 ├─ library/       klasör tarama, chokidar ile izleme, hash (duplicate)
 ├─ media/         ffprobe metadata, thumbnail + hover-scrub sprite üretimi (iş kuyruğu)
 ├─ protocol       `media://` → yerel video/thumbnail stream (stream: true, Range desteği)
 ├─ share/         startDrag, dosyayı panoya kopyalama (Windows: Set-Clipboard, Mac: osascript)
 └─ ipc/           tipli IPC handler'ları
preload            contextBridge ile dar, tipli API (nodeIntegration kapalı, contextIsolation açık)
renderer (React)   grid, arama, chip filtreleri, oynatıcı, ayarlar
```

### Veri modeli

- `folders(id, path, watch, added_at)`
- `videos(id, folder_id, path, filename, size, duration_ms, width, height, has_audio, hash, created_at, added_at, favorite, send_count, last_sent_at, status)` — `status`: `inbox | library | missing`
- `tags(id, name, color, icon_type, icon_value, sort_order)` — `icon_type`: `lucide | custom`, `icon_value`: ikon adı veya yüklenen dosyanın yolu
- `video_tags(video_id, tag_id)`
- `videos_fts` — FTS5 (dosya adı + etiket adları, v2'de transkript)

Thumbnail/sprite'lar: `%APPDATA%/meme-file/cache/<video_id>/`.

## Özellikler ve fazlar

### Faz 0 — İskelet ve riskli noktaların doğrulanması ✅
- electron-vite + React + TS + Tailwind kurulumu, lint/format
- **Spike'lar (erken doğrula):**
  1. `node:sqlite` Electron main process'te çalışıyor mu (FTS5 dahil)
  2. `media://` protokolü ile `<video>` seek (Range) çalışıyor mu
  3. `startDrag` ile Discord'a video sürükleme (Mac'te)
  4. Dosyayı panoya koyma (Ctrl+V ile Discord'a yapıştırma)
- GitHub Actions Windows build → `.exe` artifact

### Faz 1 — MVP (v1) ✅
- Klasör ekleme/çıkarma, ilk tarama, ffprobe metadata, thumbnail üretimi
- Grid görünümü (sanallaştırılmış liste — yüzlerce/binlerce video için)
- **Hover-scrub önizleme** (sprite sheet, fare konumuna göre kare)
- Video oynatıcı (modal; boşluk = oynat/durdur, ok tuşları = sar, M = sessiz)
- **Arama** (dosya adı + etiket, FTS5, anlık)
- **Chip'ler:** oluştur / düzenle / sil, renk + **ikon seçici** (lucide arama + kendi SVG/PNG'ni yükle)
- Videoya çoklu chip atama (karttan, oynatıcıdan, çoklu seçimle toplu)
- Chip'e tıkla → filtre; birden fazla chip = VE (AND), ayar ile VEYA
- **Discord'a gönderme:** karttan sürükle bırak + `Ctrl+C` kopyala
- Karta ses var/yok ikonu, boyut; 10 MB üstüne uyarı rozeti

### Faz 2 — v1.5 ✅
- Klasör izleme (chokidar) + **Gelen Kutusu** (etiketsiz yeni videolar)
- **Discord'a sığdır:** ffmpeg ile hedef boyuta (10 MB) göre iki geçişli sıkıştırma, kopya üretir
- **Trim:** başlangıç/bitiş işaretle → yeni klip (orijinale dokunmaz)
- Favoriler, "en çok gönderilen", "son gönderilen"
- **Hızlı arama penceresi:** global kısayol (varsayılan `Ctrl+Shift+Space`), küçük çerçevesiz pencere, sonuçtan sürükle/kopyala
- Sistem tepsisi (tray) ile arka planda çalışma, Windows ile başlat (opsiyonel)
- Oynatıcıdan ve sağ tık menüsünden GIF dışa aktarma (Faz 3'ten öne alındı)

### Faz 3 — v2 (Whisper hariç ✅)
- **Konuşmayla arama:** whisper.cpp ile yerel transkript → FTS'e eklenir (opsiyonel indirme, arka planda kuyruk) — *henüz yapılmadı: ~150 MB model indirmesi gerekir, "internete çıkmaz" ilkesiyle çeliştiği için ayrı karar*
- GIF dışa aktarma
- Aynı videoyu tespit (hash) ve birleştirme
- Etiketleri JSON olarak yedekle / geri yükle

## Tasarım
Seçilen yön **Sticker Duvarı**: sıcak koyu palet, mürekkep kenarlı çıkartma chip'ler, kaydırılmış gölgeler,
Bricolage Grotesque + DM Mono, kütüphane alanında çizgili defter zemini. Tüm ekranlar:
[tasarım tuvali](https://claude.ai/artifact/T8JLjFxL8foB5GbvyAP8Ef), kaynakları `design/*.dc.html`.

- Özel pencere çubuğu (`titleBarStyle: hidden`; Windows'ta native butonlar `titleBarOverlay` ile temaya uyar)
- Kısayollar: `Ctrl+F` arama, `Ctrl+C` kopyala, `Enter` oynat, `F` favori, `1-9` chip aç/kapat (Gelen Kutusu)

## Animasyonlar
Animasyon bir süs değil, deneyimin parçası. Kurallar: sadece `transform`/`opacity` (akıcı 60+ fps),
spring tabanlı hareket, `MotionConfig reducedMotion="user"` ile Windows'ta animasyonu kapatan kullanıcıya saygı.

| Yer | Animasyon |
|---|---|
| Grid | Kartlar sırayla aşağıdan süzülerek gelir; filtre değişince kartlar `layout` ile yeni yerlerine kayar, çıkanlar küçülerek kaybolur |
| Kart hover | Hafif eğilme + kalkma + mürekkep gölgesi; "Discord'a sürükle" etiketi çıkartma gibi yapışır |
| Sürükleme | Kart "soyulan çıkartma" gibi büyüyüp döner |
| Chip filtre | Seçilen chip sidebar'dan filtre çubuğuna uçar (paylaşılan `layoutId`); sayı değişince rakam kayarak değişir |
| Oynatıcı | Karttaki thumbnail büyüyerek oynatıcıya dönüşür (paylaşılan eleman geçişi), kapatınca yerine geri döner |
| Kopyalandı | "Kopyalandı!" etiketi büyükten küçüğe dönerek yapışır |
| Gelen Kutusu | "Kaydet, sonraki": video kütüphaneye fırlar, sidebar sayacı zıplar, sıradaki kaydırarak gelir |
| Chip oluştur | Önizleme chip'i renk/ikon değişince zıplar; ikon seçimi ızgarada kayan vurgu |
| Hızlı arama | Pencere hafif düşüp yerine oturur; sonuç listesinde seçili satır vurgusu kayar |
| Discord'a sığdır | Tahmini boyut çubuğu dolar; limit altına inince yeşile döner ve kutlama titremesi |

## Test stratejisi
- **Mac'te günlük:** `npm run dev`, birim testleri (Vitest: db, arama, filtre mantığı)
- **Windows'ta:** her push'ta GitHub Actions `windows-latest` build + test; `.exe` artifact
  kullanıcının kendi PC'sinde denenir (Discord sürükle bırak, clipboard, yollar, kısayol)
- Windows'a özel kontrol listesi: Türkçe karakterli / boşluklu yollar, ağ sürücüleri,
  OneDrive klasörleri, yüksek DPI, Discord'a drag + paste

## Faz 0 bulguları (Mac'te doğrulandı)
- `node:sqlite` + FTS5 Electron 44 main process'te çalışıyor
- `media://` protokolü: Türkçe karakterli, boşluklu, `#` içeren yollar oynuyor; Range ile ileri sarma çalışıyor;
  kütüphane klasörleri dışındaki dosyalar (ve `..` ile kaçma denemeleri) engelleniyor
- Arama: FTS5 `remove_diacritics` "ı"yı "i"ye çevirmiyor → `normalizeForSearch` ile Türkçe harfler sadeleştirilecek
- Electron 44'te pano API'si değişti (`writeBuffer` kalktı) → dosya kopyalama işletim sisteminin kendi komutuyla:
  Windows `Set-Clipboard -LiteralPath`, Mac `osascript`. Mac'te doğrulandı, **Windows'ta kullanıcı testi bekliyor**
- Sürükle bırak (`startDrag`) otomatik test edilemiyor → Discord'a sürükleme elle denenecek

## Açık sorular / riskler
- Kod imzalama yok → ilk kurulumda SmartScreen uyarısı ("Yine de çalıştır"). Kişisel kullanım için sorun değil.
- ffmpeg binary boyutu (~80 MB) → kurulum dosyası büyür; kabul edilebilir

# Windows test rehberi

Bu rehber Meme File'ın bütün özelliklerini tek oturumda denemen için hazırlandı. Her adımda **ne yapacağın**
ve **ne olması gerektiği** yazıyor. Beklenenden farklı bir şey olursa kutucuğu boş bırak, en alttaki şablonla not al.

Tahmini süre: 45-60 dakika. Başlamadan önce **Discord açık** olsun ve bir test sunucusu ya da kendinle DM kanalı hazır olsun.

---

## 0. Kurulum ve güncelleme

Otomatik güncellemeyi de deneyebilmek için **bilerek eski sürümü** kuruyoruz.

- [ ] **0.1** [v0.1.0 sürüm sayfasından](https://github.com/Enver-Onur-Cogalan/meme-file/releases/tag/v0.1.0) `MemeFile-0.1.0-setup.exe` dosyasını indir ve çalıştır.
  - SmartScreen uyarısı çıkarsa: **Ek bilgi → Yine de çalıştır**.
  - Beklenen: Kurulum biter, masaüstünde Meme File kısayolu oluşur, uygulama açılır.
- [ ] **0.2** Görev çubuğunda, masaüstü kısayolunda ve saatin yanındaki sistem tepsisinde **sarı-mavi çıkartma ikonu** görünüyor mu?
- [ ] **0.3** Sağ üstteki küçült / büyüt / kapat butonları uygulamanın renklerine uyuyor ve çalışıyor mu?
- [ ] **0.4** Uygulama açıldıktan en geç 1 dakika sonra başlık çubuğunun sağında **"Güncelleme indiriliyor %…"** yazısı, ardından yeşil **"0.1.1 hazır · Yeniden başlat"** butonu çıkıyor mu?
- [ ] **0.5** Butona bas. Beklenen: Uygulama kapanıp kendiliğinden yeniden açılır. **Ayarlar → Sürüm** kısmında `v0.1.1` yazar.

> 0.4 hiç gelmezse: Ayarlar → Sürüm → **Denetle**'ye bas ve yazan mesajı not al.

## 1. İlk açılış ve klasör ekleme

- [ ] **1.1** Boş ekranda "Memelerin nerede?" ve **Klasör ekle** butonu var mı?
- [ ] **1.2** Memelerinin olduğu klasörü ekle (~298 video). Beklenen: "N video eklendi" bildirimi, kartlar sırayla belirir.
- [ ] **1.3** Sağ üstte "… önizleme hazırlanıyor" sayacı azalıyor ve kartlara kapak resimleri geliyor mu? Hepsi bitince ne kadar sürdüğünü not al.
- [ ] **1.4** Adında **Türkçe karakter ve boşluk** olan bir klasör de ekle (ör. `Masaüstü\Şaka Videoları`). Videolar oynuyor mu?
- [ ] **1.5** Alt klasörlerdeki videolar da geldi mi?
- [ ] **1.6** Sol menüde klasöre sağ tıkla → **Kütüphaneden kaldır** → onayla. Beklenen: Videolar listeden çıkar, **diskteki dosyalar silinmez**. Sonra klasörü tekrar ekle.

## 2. Kütüphane ve performans

- [ ] **2.1** Kütüphaneyi hızlıca aşağı yukarı kaydır. Takılma ya da boş beyaz alan oluyor mu?
- [ ] **2.2** Fareyi bir kartın kapak resmi üzerinde sağa sola gezdir. Video kareleri sarılıyor ve alttaki sarı çubuk ilerliyor mu?
- [ ] **2.3** 10 MB'tan büyük videolarda kırmızı **"XX MB"** rozeti, sesi olmayan videolarda kırmızı çarpılı hoparlör var mı?
- [ ] **2.4** Sağ üstteki sıralama menüsünden En eski / İsim / Boyut / Süre'yi dene.
- [ ] **2.5** Pencereyi küçült/büyüt; kart sütun sayısı pencereye göre değişiyor mu?

## 3. Arama

- [ ] **3.1** `Ctrl+F` ile arama kutusuna geç, bir kelimenin sadece başını yaz. Sonuçlar anında süzülüyor mu?
- [ ] **3.2** Adında `ı ş ğ ç ö ü` olan bir videoyu bu harfler olmadan ara (ör. "bastı" için `basti`). Buluyor mu?
- [ ] **3.3** Bir chip adıyla ara (ör. `komik`). O chip'i taşıyan videolar geliyor mu?
- [ ] **3.4** `Esc` aramayı temizliyor mu?

## 4. Chip'ler

- [ ] **4.1** Sol menüde **+ yeni** → ad yaz, renk seç, ikon aramasına `kedi`, `ateş`, `oyun` yazıp ikon seç → **Chip oluştur**. Önizleme çıkartması her değişiklikte zıplıyor mu?
- [ ] **4.2** **Kendi ikonlarım → yükle** ile bir PNG ya da SVG seç. Chip'te görünüyor mu?
- [ ] **4.3** Sol menüde bir chip'e tıkla → filtre çubuğuna eklenir ve kartlar süzülür. İkinci bir chip'e tıkla → aradaki **VE** yazısına basınca **VEYA** olur ve sonuçlar değişir.
- [ ] **4.4** Chip'e sağ tıkla → **Düzenle** ile adını/rengini değiştir. Kartlardaki chip'ler de güncelleniyor mu?
- [ ] **4.5** Chip'e sağ tıkla → **Sil**. Onay penceresi çıkıyor, videolar silinmiyor mu?
- [ ] **4.6** Sol menüdeki chip sayıları doğru mu?

## 5. Oynatıcı

- [ ] **5.1** Bir karta çift tıkla. Video açılıp döngüde oynuyor mu?
- [ ] **5.2** Kısayollar: `Boşluk` oynat/durdur, `←` `→` 5 sn sar (`Shift` ile 1 sn), `M` sessiz, `L` döngü, `F` favori, `F2` yeniden adlandır, `Esc` kapat.
- [ ] **5.3** İlerleme çubuğunu fareyle tutup sürükle. Video takip ediyor mu?
- [ ] **5.4** **Chip ekle** kutusuna yaz: var olan chip önerisi `Enter` ile ekleniyor mu? Olmayan bir ad yazıp `Enter` → yeni chip oluşup ekleniyor mu?
- [ ] **5.5** Tam ekran butonu çalışıyor mu?
- [ ] **5.6** Ses seviyesini değiştir, oynatıcıyı kapatıp başka video aç. Seviye hatırlanıyor mu?

## 6. Discord'a gönderme ⭐ en önemli bölüm

- [ ] **6.1** Kütüphanede bir kartı tutup **Discord mesaj kutusuna sürükle bırak**. Discord dosyayı yükleme ekranı açıyor mu?
- [ ] **6.2** Oynatıcıdaki mavi kesikli **"Buradan sürükle"** alanından da sürükle bırak.
- [ ] **6.3** Bir karta tıkla (seçili olsun), `Ctrl+C` → Discord'da `Ctrl+V`. Video yükleniyor mu?
- [ ] **6.4** `Ctrl` ile 3 video seç → `Ctrl+C` → Discord'da `Ctrl+V`. Üçü birden geliyor mu?
- [ ] **6.5** Çoklu seçimle birden fazla videoyu aynı anda sürükle bırak.
- [ ] **6.6** Gönderdiğin videolar sol menüde **En çok gönderilen**'de çıkıyor mu?
- [ ] **6.7** Adında Türkçe karakter olan bir videoyu Discord'a gönder. Discord'daki dosya adı doğru mu?

## 7. Kırp / Discord'a sığdır / GIF

- [ ] **7.1** 10 MB'tan büyük bir videoya sağ tıkla → **Discord'a sığdır** → **Oluştur ve kopyala**. İlerleme çubuğu doluyor mu? Bitince "Hazır (X MB) ve kopyalandı!" diyor mu?
- [ ] **7.2** Discord'da `Ctrl+V`. **Discord bu dosyayı limit hatası vermeden kabul ediyor mu?** (En kritik adım.)
- [ ] **7.3** Yeni dosya orijinalin yanında `-discord` ekiyle oluştu mu, orijinal duruyor mu, chip'leri kopyaya geçti mi?
- [ ] **7.4** **Kırp**: zaman çizelgesindeki sarı tutamaçları sürükleyip kısa bir parça seç. Önizleme sadece seçili aralığı döngüde oynatıyor mu? Oluştur → süre doğru mu?
- [ ] **7.5** **GIF yap** → oluştur → Discord'a yapıştır. GIF hareket ediyor mu?
- [ ] **7.6** Uzun bir videoda (1 dk+) 10 MB seçip yaklaşık 50 saniyelik bir aralık dene. Kalite kabul edilebilir mi?
- [ ] **7.7** Oluşturma sürerken **Vazgeç**'e bas. İş duruyor ve yarım dosya kalmıyor mu?

## 8. HEVC ve diğer formatlar

- [ ] **8.1** Telefonla (iPhone ya da yeni Android) çekilmiş bir video ya da bildiğin bir HEVC/H.265 video ekle. Kartta mavi **"çevriliyor %"** rozeti çıkıyor mu?
- [ ] **8.2** Dönüştürme bitmeden oynatıcıyı aç. "Oynatılabilir formata çevriliyor…" ekranı var mı? Bitince video oynuyor mu?
- [ ] **8.3** Bu videoyu Discord'a gönder. Discord'da **önizlemesi oynatılabiliyor mu**?
- [ ] **8.4** Varsa bir `.mkv` (ör. OBS kaydı) ekle. O da oynuyor mu?

## 9. Dosya işlemleri

- [ ] **9.1** Karta sağ tıkla → **Yeniden adlandır** (ya da seçip `F2`) → yeni ad, `Enter`. Klasördeki dosyanın adı da değişti mi, chip'leri duruyor mu?
- [ ] **9.2** Aynı klasörde var olan bir adı ver. "Bu klasörde aynı adda bir dosya var" hatası çıkıyor mu?
- [ ] **9.3** Bir videoyu seç → `Delete` → onayla. Video **Geri Dönüşüm Kutusu**'nda mı? Oradan geri yükleyince uygulamada tekrar belirip Gelen Kutusu'na düşüyor mu?
- [ ] **9.4** Karta sağ tıkla → **Klasörde göster**. Explorer dosya seçili hâlde açılıyor mu?
- [ ] **9.5** Explorer'da bir videonun adını değiştir ya da başka bir alt klasöre taşı. Uygulamada birkaç saniye içinde güncelleniyor ve **chip'lerini koruyor** mu?

## 10. Gelen Kutusu ve klasör izleme

- [ ] **10.1** Uygulama açıkken izlenen klasöre Explorer'dan yeni bir video kopyala. Birkaç saniye içinde **Gelen Kutusu** sayacı artıyor mu?
- [ ] **10.2** Gelen Kutusu'nu aç. `1`-`9` tuşları chip'leri açıp kapatıyor mu? Çıkartmalar zıplıyor mu?
- [ ] **10.3** `Enter` ile kaydet: video sola fırlayıp kayboluyor ve sıradaki geliyor mu? `S` ile atla: video sıranın sonuna gidiyor mu?
- [ ] **10.4** **Hepsini etiketsiz kütüphaneye at** onay penceresiyle çalışıyor mu?

## 11. Hızlı arama penceresi

- [ ] **11.1** Uygulama arka plandayken `Ctrl+Shift+Space`. Ekranın ortasında küçük arama penceresi açılıyor mu?
- [ ] **11.2** Yaz, `↑` `↓` ile seç, `Enter`: "Kopyalandı!" deyip kapanıyor mu? Discord'da `Ctrl+V` çalışıyor mu?
- [ ] **11.3** Bir sonucu doğrudan Discord'a sürükle bırak.
- [ ] **11.4** `Ctrl+Enter` ana pencerede o videoyu oynatıyor mu?
- [ ] **11.5** Pencerenin dışına tıklayınca ya da `Esc` ile kapanıyor mu?
- [ ] **11.6** ⭐ **Oyun açıkken** (pencereli ya da kenarlıksız tam ekran) kısayola bas. Pencere açılıyor mu, oyun takılıyor ya da küçülüyor mu?
- [ ] **11.7** Ayarlar'dan kısayolu değiştir (ör. `Ctrl+Alt+M`). Yenisi çalışıp eskisi çalışmıyor mu?

## 12. Oyunlar ve hile koruması

Her oyunda birkaç maç ya da dakika oynarken Meme File arka planda açık kalsın.

- [ ] **12.1** Valorant / LoL (Vanguard): Oyun sorunsuz açıldı mı, uyarı çıktı mı?
- [ ] **12.2** CS2, CoD, FC, Mortal Kombat: Aynı kontrol.
- [ ] **12.3** Oyun sırasında FPS'te fark edilir bir düşüş var mı? (Meme File kapak üretirken işlemci kullanır; klasör ekledikten hemen sonra değil, işlem bitince dene.)

## 13. Sistem tepsisi, başlangıç ve yedek

- [ ] **13.1** Pencereyi X ile kapat. Uygulama tepside kalıyor mu? Tepsi ikonuna tıklayınca geri açılıyor mu?
- [ ] **13.2** Tepsi ikonuna sağ tıkla → **Çıkış**. Tamamen kapanıyor mu?
- [ ] **13.3** Ayarlar → **Windows açılınca arka planda başlat**'ı aç, bilgisayarı yeniden başlat. Uygulama pencere açmadan tepside başlıyor mu?
- [ ] **13.4** Ayarlar → **Yedekle** ile JSON kaydet. Bir chip'i sil, **Yedekten yükle**. Chip ve videolardaki etiketleri geri geliyor mu?
- [ ] **13.5** Uygulama zaten açıkken masaüstü kısayoluna tekrar tıkla. İkinci bir kopya açılmak yerine mevcut pencere öne geliyor mu?

## 14. Genel izlenim

- [ ] **14.1** Animasyonlar akıcı mı, yoksa bir yerde fazla/yavaş mı geliyor?
- [ ] **14.2** Anlaşılmayan, garip duran ya da eksik gördüğün bir şey?
- [ ] **14.3** Windows'ta **Ayarlar → Erişilebilirlik → Görsel efektler → Animasyon efektleri**'ni kapatınca uygulamadaki animasyonlar da sadeleşiyor mu?

---

## Sorun bildirme şablonu

Her sorun için şunu kopyalayıp doldurman yeterli:

```
Adım: (ör. 7.2)
Ne yaptım:
Ne bekliyordum:
Ne oldu:
Ekran görüntüsü / video: (varsa)
Ne sıklıkla: her seferinde / bazen / bir kez
```

Uygulama hata verip kapanırsa şu klasördeki `library.db` hariç dosyaların adını ve tarihini de not al:
`%APPDATA%\Meme File`

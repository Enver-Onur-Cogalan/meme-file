import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Lang = 'tr' | 'en'

const tr = {
  nav: {
    tour: 'Tur',
    features: 'Özellikler',
    themes: 'Temalar',
    faq: 'SSS',
    download: 'İndir',
    langSwitch: 'English'
  },
  hero: {
    title: 'Tepki videon, tam zamanında.',
    lead: 'Meme File, bilgisayarındaki tepki videolarını renkli chip’lerle etiketler, saniyeler içinde buldurur ve tek hareketle sohbete gönderir. Windows için, ücretsiz.',
    cta: 'Windows için indir',
    source: 'Kaynak kodu',
    hintDrag: 'Bir kâğıdı tutup sohbete sürükle.',
    hintTap: 'Bir kâğıda dokun, sohbete gitsin.',
    refill: 'Duvarı yeniden as',
    empty: 'Duvar boşaldı. Uygulamada yüzlercesi bekliyor.',
    channel: 'memeler',
    dropHere: 'Buraya bırak',
    typing: 'yazıyor…',
    composer: 'Bir mesaj yaz…',
    seed: [
      { who: 'Deniz', text: 'adam yine son saniyede ulti attı' },
      { who: 'Kaan', text: 'buna uygun bir video lazım acil' }
    ],
    replies: ['AHAHAHA', 'tam bu durum', 'bunu nereden buluyorsun', 'kaydettim bunu', 'efsane zamanlama', 'sende her şeyin videosu var'],
    you: 'Sen'
  },
  tour: {
    title: 'Uygulamanın kendisi',
    lead: 'Aşağıdakiler gerçek uygulamadan kayıt. Bölümler kendiliğinden ilerler; istediğine tıklayabilirsin.',
    chapters: {
      library: { label: 'Kütüphane', text: 'İmleç kâğıdın üstünde gezdikçe kâğıt eğilir, kapak videoyu sarar. Chip’e tıklayınca liste süzülür.' },
      search: { label: 'Arama', text: 'Ada ya da chip’e göre ara. Türkçe karakterleri yanlış yazsan da bulur.' },
      trim: { label: 'Kırpma', text: '13,5 MB’lık klibi kırp, hedef olarak 10 MB’ı seç. Tahmini boyut canlı güncellenir.' },
      caption: { label: 'Meme yazısı', text: 'Üst ve alt yazıyı klibe bas. Önizlemede ne görüyorsan çıktı da o.' },
      quick: { label: 'Hızlı arama', text: 'Oyunun ortasında bile Ctrl+Shift+Space: yaz, seç, Enter.' },
      themes: { label: 'Temalar', text: 'Dört tema; her birinin kendi kabuğu, hareketi ve sesi var.' },
      inbox: { label: 'Gelen Kutusu', text: 'Yeni gelen videolar burada bekler; rakam tuşlarıyla saniyede etiketlenir.' }
    },
    missing: 'Bu kayıt hazırlanıyor.',
    pause: 'Duraklat',
    play: 'Oynat'
  },
  find: {
    title: 'Aradığını, komikken bul.',
    lead: 'Her videoya istediğin kadar chip yapıştır. Sonra chip’leri birleştir: VE hepsini taşıyanları, VEYA herhangi birini taşıyanları gösterir. Burada dene.',
    search: 'Hangi meme lazım?',
    and: 'VE',
    or: 'VEYA',
    count: (n: number) => `${n} meme bulundu`,
    none: 'Bu chip’lerin hepsini taşıyan video yok. VEYA’ya geç ya da bir chip’i bırak.',
    clear: 'Temizle'
  },
  fit: {
    title: '10 MB sınırına takılma.',
    lead: 'Büyük dosyalar sohbete gitmiyorsa klibin sadece lazım olan kısmını kırp, “sığdır” de. Meme File bit hızını, çözünürlüğü ve kare hızını hedefe göre seçer; sonucu panoya koyar. Orijinal dosyana dokunulmaz.',
    limit: 'Sınır',
    tooBig: 'Gönderilemez',
    fits: 'Sığdı, gönder',
    original: 'Orijinal',
    after: 'Sığdırılmış',
    gif: 'İstersen GIF de yapar.'
  },
  quick: {
    title: 'Her yerden çağır.',
    lead: 'Hızlı arama penceresi ne yapıyorsan onun üstünde açılır, oyunda bile. Yaz, ok tuşlarıyla seç, Enter dosyayı kopyalar; sohbette Ctrl+V yeter.',
    tryIt: 'Şimdi bu sayfada dene:',
    orClick: 'ya da tuşlara tıkla.',
    placeholder: 'Ara…',
    copied: (name: string) => `“${name}” kopyalandı. Sohbette Ctrl+V ile yapıştır.`,
    hint: '↑ ↓ seç · Enter kopyala · Esc kapat',
    empty: 'Eşleşen video yok.'
  },
  themes: {
    title: 'Dört tema, dört ayrı karakter.',
    lead: 'Tema sadece renk değiştirmiyor: kabuk, kart, chip, yazı tipi, hareket ve arayüz sesleri birlikte değişiyor. Chip renklerin her temada tanınır kalıyor.',
    list: {
      sticker: { name: 'Sticker Duvarı', text: 'Çizgili defter, raptiyeli 3B post-it’ler, kâğıt hışırtısı.' },
      cyber: { name: 'Cyberpunk', text: 'Açılış sekansı, hologram chip’ler, kart etrafında elektrik arkı.' },
      modern: { name: 'Modern', text: 'Fırçalanmış çelik plakalar, perçinler, sakin ve yavaş hareket.' },
      classic: { name: 'Old School 98', text: 'Gri kabartmalar, menü çubuğu, sistem bip’leri.' }
    }
  },
  safe: {
    title: 'Hile korumalarıyla yan yana.',
    lead: 'Vanguard, Easy Anti-Cheat, Ricochet ve benzerleri açıkken de rahatça kullan. Meme File oyuna hiç dokunmaz.',
    no: [
      'Oyun süreçlerine ya da belleğe erişmez',
      'Klavyeye kanca atmaz, tuş vuruşlarını dinlemez',
      'Oyunun üstüne overlay çizmez',
      'Senin seçmediğin klasörleri okumaz'
    ],
    yes: 'Kısayol için Windows’un standart RegisterHotKey mekanizmasını kullanır. Tek ağ isteği güncelleme denetimidir.'
  },
  faq: {
    title: 'Sık sorulanlar',
    items: [
      { q: 'Gerçekten ücretsiz mi?', a: 'Evet. Meme File MIT lisanslı açık kaynak bir proje; hesap, abonelik ya da deneme süresi yok.' },
      { q: 'Kurarken neden “Windows kişisel bilgisayarınızı korudu” uyarısı çıkıyor?', a: 'Kurulum dosyası henüz kod imzalı değil; imza sertifikası olmayan her yeni uygulamada SmartScreen bu uyarıyı gösterir. “Ek bilgi”ye, ardından “Yine de çalıştır”a tıkla. Kaynak kodun tamamı GitHub’da, kurulum dosyası da GitHub Actions’ta herkesin görebileceği şekilde derleniyor.' },
      { q: 'Oyun oynarken ban yer miyim?', a: 'Hayır. Meme File oyun süreçlerine, belleğe ya da klavyeye dokunmaz ve overlay çizmez. Global kısayol, Windows’un her uygulamaya sunduğu standart yöntemle kaydedilir.' },
      { q: 'Dosyalarımı taşıyor ya da değiştiriyor mu?', a: 'Hayır. Videolar olduğu yerde kalır; Meme File sadece üstlerine bir etiket katmanı ekler. Kırpma, sığdırma ve meme yazısı her zaman yeni bir dosya üretir. Dışarıda adı değişen ya da taşınan videolar da chip’lerini kaybetmez.' },
      { q: 'Hangi video biçimleri destekleniyor?', a: 'mp4, webm, mov, mkv, avi ve daha fazlası. HEVC, ProRes ya da AC-3 sesli dosyalar için arka planda oynatılabilir bir kopya hazırlanır.' },
      { q: 'Hangi sohbet uygulamalarıyla çalışıyor?', a: 'Dosya kabul eden hepsiyle. Sürükle bırak ve Ctrl+C ile kopyalama dosyanın kendisini taşır; WhatsApp, Telegram, Slack, e-posta ya da bir klasör fark etmez.' },
      { q: 'İnternet bağlantısı gerekiyor mu? Verilerim bir yere gidiyor mu?', a: 'Hayır. Kütüphane bilgisayarındaki bir SQLite veritabanında durur, hiçbir şey yüklenmez. Tek ağ isteği GitHub’a yapılan güncelleme denetimidir.' },
      { q: 'Kütüphanem büyüdükçe yavaşlar mı?', a: 'Sanal liste ve SQLite tam metin arama sayesinde 5.000 videoda arama birkaç milisaniye sürüyor; bu bütçe her sürümde otomatik testlerle denetleniyor.' },
      { q: 'Mac ya da Linux sürümü var mı?', a: 'Şimdilik yalnız Windows. Uygulama Electron ile yazıldığı için ileride diğer sistemler de mümkün.' },
      { q: 'Güncellemeleri nasıl alırım?', a: 'Kendiliğinden. Yeni sürüm çıktığında arka planda indirilir ve uygulamayı bir sonraki açışında kurulur.' }
    ]
  },
  download: {
    title: 'Kütüphaneni kur.',
    lead: 'Kur, meme klasörünü ekle, gerisi kendiliğinden.',
    button: 'Windows için indir',
    meta: (version: string, size: string) => `Sürüm ${version} · ${size} · Windows 10 ve 11`,
    metaFallback: 'Windows 10 ve 11',
    steps: [
      'Kurulum dosyasını indir ve çalıştır.',
      'SmartScreen uyarısında “Ek bilgi”, sonra “Yine de çalıştır”.',
      'Meme klasörünü ekle. Güncellemeler kendiliğinden gelir.'
    ],
    notes: 'Sürüm notları'
  },
  maker: {
    title: 'Bu uygulamayı ben yaptım.',
    text: 'Ben Enver Onur Çoğalan. Meme File’ı, doğru tepki videosunu an henüz komikken bulamamaktan sıkıldığım için yaptım. Birlikte bir şey üretmek istersen yaz.',
    portfolio: 'Portfolyo',
    linkedin: 'LinkedIn',
    github: 'GitHub'
  },
  footer: {
    license: 'MIT lisanslı. Pakete dahil FFmpeg GPL lisanslıdır.',
    privacy: 'Bu site çerez kullanmaz. Yalnızca kaç kişinin geldiği gibi anonim ziyaret sayıları tutulur; kim olduğun bilinmez.',
    credit: 'Demo klipleri: Big Buck Bunny © 2008 Blender Foundation, peach.blender.org, CC BY 3.0 lisanslı.',
    privacyLink: 'Gizlilik',
    top: 'Başa dön'
  }
}

type Dict = typeof tr

const en: Dict = {
  nav: {
    tour: 'Tour',
    features: 'Features',
    themes: 'Themes',
    faq: 'FAQ',
    download: 'Download',
    langSwitch: 'Türkçe'
  },
  hero: {
    title: 'The right reaction, right on time.',
    lead: 'Meme File tags the reaction videos on your PC with colorful chips, finds them in seconds and sends them to any chat in one move. Free, for Windows.',
    cta: 'Download for Windows',
    source: 'Source code',
    hintDrag: 'Grab a note and drag it into the chat.',
    hintTap: 'Tap a note to send it to the chat.',
    refill: 'Pin them back up',
    empty: 'The wall is empty. The app holds hundreds more.',
    channel: 'memes',
    dropHere: 'Drop it here',
    typing: 'is typing…',
    composer: 'Write a message…',
    seed: [
      { who: 'Deniz', text: 'he ulted in the last second AGAIN' },
      { who: 'Kaan', text: 'need a video for this, urgently' }
    ],
    replies: ['LMAOOO', 'literally this', 'where do you even find these', 'saving this one', 'perfect timing', 'you have a video for everything'],
    you: 'You'
  },
  tour: {
    title: 'The real thing',
    lead: 'Everything below is recorded from the actual app. Chapters advance on their own; click any of them.',
    chapters: {
      library: { label: 'Library', text: 'Notes tilt toward your cursor and covers scrub through the clip. Click a chip to filter.' },
      search: { label: 'Search', text: 'Search by name or chip. Accents and typos are forgiven.' },
      trim: { label: 'Trim', text: 'Trim a 13.5 MB clip and pick 10 MB as the target. The size estimate updates live.' },
      caption: { label: 'Meme text', text: 'Stamp top and bottom text onto a clip. What you preview is what you get.' },
      quick: { label: 'Quick search', text: 'Ctrl+Shift+Space, even mid-game: type, pick, Enter.' },
      themes: { label: 'Themes', text: 'Four themes, each with its own shell, motion and sounds.' },
      inbox: { label: 'Inbox', text: 'New videos wait here; tag them in a second with the number keys.' }
    },
    missing: 'This recording is on its way.',
    pause: 'Pause',
    play: 'Play'
  },
  find: {
    title: 'Find it while it’s still funny.',
    lead: 'Stick as many chips on a video as you like, then combine them: AND shows videos carrying all of them, OR shows any. Try it here.',
    search: 'Which meme do you need?',
    and: 'AND',
    or: 'OR',
    count: (n: number) => `${n} ${n === 1 ? 'meme' : 'memes'} found`,
    none: 'No video carries all of these chips. Switch to OR or drop a chip.',
    clear: 'Clear'
  },
  fit: {
    title: 'Never hit the 10 MB wall.',
    lead: 'When a file is too big for the chat, trim the part you need and hit “fit”. Meme File picks bitrate, resolution and frame rate for the target and puts the result on your clipboard. Your original file is never touched.',
    limit: 'Limit',
    tooBig: 'Too big to send',
    fits: 'Fits, send it',
    original: 'Original',
    after: 'Fitted',
    gif: 'It makes GIFs too.'
  },
  quick: {
    title: 'Summon it from anywhere.',
    lead: 'Quick search opens on top of whatever you’re doing, games included. Type, arrow to pick, Enter copies the file; Ctrl+V in any chat.',
    tryIt: 'Try it on this page:',
    orClick: 'or click the keys.',
    placeholder: 'Search…',
    copied: (name: string) => `Copied “${name}”. Paste it in a chat with Ctrl+V.`,
    hint: '↑ ↓ pick · Enter copy · Esc close',
    empty: 'No matching video.'
  },
  themes: {
    title: 'Four themes, four characters.',
    lead: 'A theme isn’t a palette swap: the shell, cards, chips, typeface, motion and UI sounds all change together. Your chip colors stay recognizable in every one.',
    list: {
      sticker: { name: 'Sticker Wall', text: 'Lined notebook, pinned 3D sticky notes, paper rustle.' },
      cyber: { name: 'Cyberpunk', text: 'Boot sequence, hologram chips, an electric arc around cards.' },
      modern: { name: 'Modern', text: 'Brushed steel plates, rivets, calm and slow motion.' },
      classic: { name: 'Old School 98', text: 'Grey bevels, a real menu bar, system beeps.' }
    }
  },
  safe: {
    title: 'Plays nice with anti-cheat.',
    lead: 'Use it with Vanguard, Easy Anti-Cheat, Ricochet and friends running. Meme File never touches your game.',
    no: [
      'No access to game processes or memory',
      'No keyboard hooks, no keystroke logging',
      'No in-game overlay',
      'Reads only the folders you pick'
    ],
    yes: 'The global shortcut uses Windows’ standard RegisterHotKey. The only network request is the update check.'
  },
  faq: {
    title: 'Questions',
    items: [
      { q: 'Is it really free?', a: 'Yes. Meme File is MIT-licensed open source; no account, subscription or trial.' },
      { q: 'Why does Windows say it “protected your PC” during install?', a: 'The installer isn’t code-signed yet, and SmartScreen shows this for every new unsigned app. Click “More info”, then “Run anyway”. The full source is on GitHub and the installer is built publicly on GitHub Actions.' },
      { q: 'Can I get banned while gaming?', a: 'No. Meme File doesn’t touch game processes, memory or your keyboard, and draws no overlay. The global shortcut is registered the standard way Windows offers every app.' },
      { q: 'Does it move or change my files?', a: 'No. Videos stay where they are; Meme File adds a tagging layer on top. Trimming, fitting and meme text always create a new file. Videos renamed or moved outside the app keep their chips.' },
      { q: 'Which formats are supported?', a: 'mp4, webm, mov, mkv, avi and more. For HEVC, ProRes or AC-3 audio a playable copy is prepared in the background.' },
      { q: 'Which chat apps does it work with?', a: 'Any that accept files. Drag and drop and Ctrl+C carry the file itself, so WhatsApp, Telegram, Slack, email or a folder all work.' },
      { q: 'Does it need the internet? Does my data go anywhere?', a: 'No. Your library lives in a SQLite database on your PC and nothing is uploaded. The only request is the update check to GitHub.' },
      { q: 'Will it slow down as my library grows?', a: 'A virtual list and SQLite full-text search keep searches over 5,000 videos at a few milliseconds; that budget is checked by automated tests on every release.' },
      { q: 'Is there a Mac or Linux version?', a: 'Windows only for now. It’s built with Electron, so other systems are possible later.' },
      { q: 'How do I get updates?', a: 'Automatically. New versions download in the background and install the next time you open the app.' }
    ]
  },
  download: {
    title: 'Set up your library.',
    lead: 'Install it, add your meme folder, and it takes care of the rest.',
    button: 'Download for Windows',
    meta: (version: string, size: string) => `Version ${version} · ${size} · Windows 10 and 11`,
    metaFallback: 'Windows 10 and 11',
    steps: [
      'Download and run the installer.',
      'On the SmartScreen prompt: “More info”, then “Run anyway”.',
      'Add your meme folder. Updates arrive on their own.'
    ],
    notes: 'Release notes'
  },
  maker: {
    title: 'I made this.',
    text: 'I’m Enver Onur Çoğalan. I made Meme File because I was tired of not finding the right reaction while it was still funny. If you’d like to build something together, get in touch.',
    portfolio: 'Portfolio',
    linkedin: 'LinkedIn',
    github: 'GitHub'
  },
  footer: {
    license: 'MIT licensed. The bundled FFmpeg is GPL licensed.',
    privacy: 'This site uses no cookies. It only keeps anonymous visit counts, such as how many people came by; nobody knows who you are.',
    credit: 'Demo clips: Big Buck Bunny © 2008 Blender Foundation, peach.blender.org, licensed under CC BY 3.0.',
    privacyLink: 'Privacy',
    top: 'Back to top'
  }
}

const dicts: Record<Lang, Dict> = { tr, en }

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('mf-lang')
    if (saved === 'tr' || saved === 'en') return saved
  } catch {
    /* depolama kapalı olabilir */
  }
  return navigator.language.toLowerCase().startsWith('tr') ? 'tr' : 'en'
}

interface LangState {
  lang: Lang
  t: Dict
  toggle: () => void
}

const LangContext = createContext<LangState | null>(null)

export function LangProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [lang, setLang] = useState<Lang>(initialLang)
  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem('mf-lang', lang)
    } catch {
      /* yok say */
    }
  }, [lang])
  return (
    <LangContext.Provider value={{ lang, t: dicts[lang], toggle: () => setLang((l) => (l === 'tr' ? 'en' : 'tr')) }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang(): LangState {
  const value = useContext(LangContext)
  if (!value) throw new Error('LangProvider eksik')
  return value
}

import type { Lang } from './i18n'

export interface PrivacySection {
  title: string
  body: string[]
}

export interface PrivacyDoc {
  pageTitle: string
  title: string
  updated: string
  intro: string
  sections: PrivacySection[]
  back: string
  contact: string
}

// Tarih değişince iki dilde de güncelle.
export const PRIVACY: Record<Lang, PrivacyDoc> = {
  tr: {
    pageTitle: 'Gizlilik · Meme File',
    title: 'Gizlilik',
    updated: 'Son güncelleme: 15 Kasım 2026',
    intro:
      'Bu site, Meme File uygulamasını tanıtan kişisel ve ticari olmayan bir projedir. Hesap yok, reklam yok, çerez yok. Kim olduğunu bilmiyoruz ve bilmek de istemiyoruz. Aşağıda sitede neyin, nerede ve neden tutulduğunu tek tek yazdık.',
    sections: [
      {
        title: 'Ziyaret sayımı',
        body: [
          'Sitenin kaç kişiye ulaştığını görmek için Umami Cloud kullanıyoruz. Umami çerez kullanmaz, IP adresini saklamaz ve seni başka sitelerde takip etmez.',
          'Tutulanlar şunlar: açılan sayfa, nereden geldiğin (örneğin bir arama motoru), tarayıcı, işletim sistemi ve cihaz türü, ekran boyutu, dil, ülke ve ziyaretin ne kadar sürdüğü.',
          'Sitede yaptıkların da adsız olarak sayılır: indirme düğmesine basmak, sayfada hangi bölüme kadar indiğin, tema ya da dil değiştirmek, bir SSS sorusunu açmak, demodaki meme’i sohbete sürüklemek, yapımcı bağlantılarına tıklamak. Bu sayılar yalnızca toplam olarak görülür; tek tek kişilere bağlanamaz.',
          'Tarayıcında “Do Not Track” (beni izleme) açıksa hiç sayılmazsın. Reklam engelleyiciler de sayımı engeller; bu tamamen senin tercihin.',
          'Bu veriler Umami’nin yurt dışındaki sunucularında en fazla 6 ay saklanır, sonra silinir.'
        ]
      },
      {
        title: 'Barındırma',
        body: [
          'Site Vercel üzerinde yayınlanır. Her web sunucusu gibi Vercel de sayfayı sana ulaştırabilmek ve kötüye kullanımı önlemek için IP adresi gibi teknik kayıtları kısa süreliğine işleyebilir. Bu kayıtlara biz erişmeyiz ve onları kullanmayız.'
        ]
      },
      {
        title: 'GitHub',
        body: [
          'İndirme düğmesi son sürümün bilgisini GitHub’dan okur, kurulum dosyası da GitHub’dan iner. Bu istekler GitHub’ın kendi gizlilik politikasına tabidir.',
          'Yazı tipleri sitenin içinde gelir. Google Fonts gibi dış bir yazı tipi hizmeti kullanılmaz.'
        ]
      },
      {
        title: 'Tarayıcında kalanlar',
        body: [
          'Seçtiğin dil tarayıcında “mf-lang” adıyla saklanır; bir dahaki gelişinde aynı dilde açılsın diye. Son sürüm bilgisi de sekme kapanana kadar önbellekte tutulur. İkisi de hiçbir yere gönderilmez, istediğin an tarayıcı verilerini silerek kaldırabilirsin.'
        ]
      },
      {
        title: 'Uygulamanın kendisi',
        body: [
          'Meme File uygulaması hiçbir veri toplamaz. Kütüphanen bilgisayarındaki bir veritabanında durur, hiçbir şey yüklenmez. Uygulamanın yaptığı tek ağ isteği, GitHub’a yapılan güncelleme denetimidir.'
        ]
      },
      {
        title: 'Hakların',
        body: [
          'Sitede seni tanımlayan bir bilgi tutmadığımız için sana ait bir kaydı bulup gösteremeyiz ya da silemeyiz; çünkü böyle bir kayıt yok. Yine de KVKK ya da GDPR kapsamında bir sorun olursa aşağıdaki bağlantıdan bize yazabilirsin.',
          'Bir gün reklam ya da başka bir hizmet eklenirse bu sayfa önceden güncellenir ve tarih değişir.'
        ]
      }
    ],
    back: 'Siteye dön',
    contact: 'GitHub’da bize yaz'
  },
  en: {
    pageTitle: 'Privacy · Meme File',
    title: 'Privacy',
    updated: 'Last updated: November 15, 2026',
    intro:
      'This site is a personal, non-commercial project that introduces the Meme File app. No accounts, no ads, no cookies. We don’t know who you are and don’t want to. Below is exactly what the site keeps, where and why.',
    sections: [
      {
        title: 'Visit counting',
        body: [
          'We use Umami Cloud to see how many people the site reaches. Umami uses no cookies, does not store your IP address and does not follow you across other sites.',
          'What it keeps: the page you opened, where you came from (for example a search engine), browser, operating system and device type, screen size, language, country and how long the visit lasted.',
          'What you do on the site is also counted anonymously: pressing the download button, how far down the page you scroll, switching theme or language, opening an FAQ question, dragging the demo meme into the chat and clicking the maker links. These numbers are only seen as totals and cannot be tied to individual people.',
          'If “Do Not Track” is on in your browser, you are not counted at all. Ad blockers also block the counting; that is entirely your choice.',
          'This data is stored on Umami’s servers outside Türkiye for up to 6 months and then deleted.'
        ]
      },
      {
        title: 'Hosting',
        body: [
          'The site is served by Vercel. Like any web server, Vercel may briefly process technical logs such as your IP address to deliver the page and prevent abuse. We do not access or use those logs.'
        ]
      },
      {
        title: 'GitHub',
        body: [
          'The download button reads the latest release from GitHub, and the installer is downloaded from GitHub. Those requests fall under GitHub’s own privacy policy.',
          'Fonts are bundled with the site. No external font service such as Google Fonts is used.'
        ]
      },
      {
        title: 'What stays in your browser',
        body: [
          'Your language choice is stored in your browser as “mf-lang” so the site opens in the same language next time. The latest release info is cached until you close the tab. Neither is sent anywhere, and you can remove both by clearing your browser data.'
        ]
      },
      {
        title: 'The app itself',
        body: [
          'The Meme File app collects no data. Your library lives in a database on your PC and nothing is uploaded. The only network request the app makes is the update check to GitHub.'
        ]
      },
      {
        title: 'Your rights',
        body: [
          'Because the site keeps nothing that identifies you, we cannot look up, show or delete a record of you; no such record exists. If you still have a question under GDPR or Türkiye’s KVKK, reach us through the link below.',
          'If ads or another service are ever added, this page will be updated first and its date will change.'
        ]
      }
    ],
    back: 'Back to the site',
    contact: 'Write to us on GitHub'
  }
}

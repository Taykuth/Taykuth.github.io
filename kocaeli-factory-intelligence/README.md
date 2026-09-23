# Kocaeli Factory Intelligence

> A transparent predictive-maintenance portfolio prototype for manufacturing teams: turn machine telemetry into an interpretable risk signal, anomaly score and an operational next step.

[Canlı demo](https://taykuth.github.io/kocaeli-factory-intelligence/) · [Teknik kaynak paketi](./source/) · [Portföy](https://taykuth.github.io/)

**Kısa özet:** Bu proje, Kocaeli'ndeki üretim şirketleriyle yapılacak görüşmeler için tasarlanmış uçtan uca bir kestirimci bakım prototipidir. Sentetik ama tekrar üretilebilir telemetri üretir, iki ayrı model yaklaşımıyla risk/anomali hesabı yapar ve sonucu fabrika operasyonunun anlayacağı sade bir arayüzde açıklar.

## Neyi çözüyor?

Plansız duruş, üretim tesislerinde doğrudan kapasite, kalite ve bakım maliyeti problemidir. Ancak bir bakım analitiği ekranı yalnızca "alarm var" demekle faydalı olmaz; operatörün ve bakım ekibinin şu üç soruya yanıt alması gerekir:

1. Hangi makine önceliklendirilmeli?
2. Riskin arkasındaki sinyaller neler?
3. Vardiya içinde uygulanabilir ilk aksiyon ne?

Kocaeli Factory Intelligence bu akışı gösteren bir MVP'dir. Kullanıcı tesis ve senaryo seçer; ekran aynı telemetri üzerinden **model riski**, **anomali skoru**, **etkileyen sinyaller** ve **önerilen aksiyonu** gösterir.

## Canlı demoda neye bakılmalı?

1. [Canlı demoyu açın](https://taykuth.github.io/kocaeli-factory-intelligence/).
2. Sol panelden *Rulman aşınması*, *Soğutma problemi* ve *Normal çalışma* senaryolarını sırayla deneyin.
3. Risk/anomali kartlarının ve "Model açıklaması" bölümünün beraber değiştiğini kontrol edin.
4. "Vardiya aksiyonu" tablosundaki önceliklendirme ile müdahale sırasını değerlendirin.

Arayüzde **senaryo alarmı** ile **model hesabı** bilerek ayrı gösterilir. Bu ayrım, kullanıcı arayüzündeki sabit bir etiketi model çıktısı gibi sunma hatasını önler.

## Veri seti ve değerlendirme

| Özellik | Değer |
| --- | --- |
| Makine sayısı | 8 |
| Örnekleme aralığı | 15 dakika |
| Veri hacmi | 4.608 telemetri kaydı |
| Simülasyon süresi | 6 gün |
| Arıza olayı | 24 |
| Tahmin ufku | Arıza öncesi 24 saat |
| Ayrım yöntemi | Zamansal %75 eğitim / %25 test |
| Holdout precision | %65,8 |
| Holdout recall | %52,9 |
| Holdout F1 | %58,7 |
| Holdout false-alarm rate | %19,4 |

Telemetri sinyalleri: sıcaklık, titreşim, motor akımı, hidrolik basınç, soğutucu akışı ve üretim hızı.

> **Dürüst kapsam notu:** Bu metrikler üretim tesisinden alınmış gerçek sonuçlar değildir; bu projenin sentetik, deterministik holdout verisindeki ölçümleridir. Gerçek pilotta bunlar tarihsel arıza kayıtları, bakım etiketleri, sınıf dengesizliği ve işletmenin maliyet fonksiyonuna göre yeniden ölçülmelidir.

## Mimari

~~~mermaid
flowchart LR
    A[Deterministik telemetri üretimi] --> B[Öznitelik doğrulama]
    B --> C[Çok değişkenli z-score anomali modeli]
    B --> D[Sınıf-ağırlıklı lojistik regresyon]
    C --> E[JSON model artefaktları]
    D --> E
    E --> F[Tarayıcıda istemci tarafı çıkarım]
    E --> G[İsteğe bağlı Node.js HTTP API]
    F --> H[Operatör odaklı dashboard]
    G --> H
~~~

## Teknik yaklaşım

- **Dil ve çalışma zamanı:** ECMAScript Modules ile JavaScript; Node.js 20+.
- **Modelleme:** Üçüncü taraf ML paketi kullanmadan, denetlenebilir iki referans yaklaşım uygulanır:
  - Çok değişkenli z-score ile davranış sapması/anomali skoru.
  - Gradient descent ile eğitilmiş, sınıf dengesizliğini hesaba katan lojistik regresyon ile arıza riski.
- **Değerlendirme disiplini:** Rastgele karıştırma yerine zamansal holdout kullanılır. Böylece gelecekten geçmişe veri sızıntısı riski azaltılır.
- **Dağıtım yüzeyi:** Dashboard, model artefaktlarını JSON olarak yükler ve tarayıcıda çıkarım yapar. Bu nedenle [GitHub Pages demosu](https://taykuth.github.io/kocaeli-factory-intelligence/) ek bir sunucu gerektirmez.
- **Yerel API:** Node.js'in yerleşik HTTP modülü ile health, model raporu ve tahmin uç noktaları sağlanır.
- **Kalite güvence:** Node test runner ile model çekirdeğinin mantık testleri; GitHub Actions ile her kaynak değişikliğinde doğrulama.
- **Çalışma ortamı:** Dockerfile ve Docker Compose yapılandırması, Docker bulunan makinelerde tekrar üretilebilir yerel çalıştırma için eklenmiştir.

## Kaynak kodu yerelde çalıştırma

Ön koşul: Node.js 20 veya üzeri.

~~~bash
git clone https://github.com/Taykuth/Taykuth.github.io.git
cd Taykuth.github.io/kocaeli-factory-intelligence/source
npm run verify
npm run serve
~~~

Servis varsayılan olarak http://127.0.0.1:8080 adresinde açılır.

**npm run verify** sırasıyla telemetriyi üretir, model artefaktlarını eğitir ve testleri çalıştırır. Böylece kaynak paketi, önceden üretilmiş ikili model dosyasına bağımlı kalmadan doğrulanabilir.

Docker kullanılan bir ortamda:

~~~bash
docker compose up --build
~~~

## API yüzeyi

Yerel servis çalışırken aşağıdaki uç noktalar kullanılabilir:

| Metot | Uç nokta | İşlev |
| --- | --- | --- |
| GET | /api/health | Servis ve model üretim zamanını kontrol eder. |
| GET | /api/model-report | Holdout metriklerini ve model raporunu döndürür. |
| POST | /api/predict | Telemetriyi doğrular; risk, anomali ve açıklama üretir. |

POST gövdesi şu altı sayısal sinyali içerir: temperature_c, vibration_mm_s, motor_current_a, hydraulic_pressure_bar, coolant_flow_l_min ve production_rate_units_h.

## Proje yapısı

~~~
kocaeli-factory-intelligence/
├── index.html                 # GitHub Pages'te yayınlanan statik dashboard
├── data/                      # Tarayıcının kullandığı model artefaktları
└── source/
    ├── src/
    │   ├── generate-telemetry.mjs
    │   ├── train-models.mjs
    │   ├── model-core.mjs
    │   └── server.mjs
    ├── test/model-core.test.mjs
    ├── dist/index.html
    ├── Dockerfile
    └── compose.yaml
~~~

## Neden bu teknik kararlar?

Bu proje, ilk aşamada büyük bir model eğitmek yerine denetlenebilirlik ve iş bağlamını önceliklendirdi. Üretim bakım senaryosunda modelin sadece skoru değil, kararın altında yatan sinyalleri ve yanlış alarm maliyetini de açıklaması gerekir. Bu nedenle başlangıç noktası olarak hafif, tekrar üretilebilir ve incelemesi kolay bir pipeline seçildi.

Gerçek tesis pilotunda sonraki adımlar şunlar olur:

1. Historian/SCADA verisi ile CMMS bakım kayıtlarını makine-zaman ekseninde eşlemek.
2. Arıza tanımını iş birimiyle netleştirmek; yanlış alarm ve kaçırılan arızanın maliyetini sayısallaştırmak.
3. Makine ailesi bazında eşik, kalibrasyon ve drift takibi eklemek.
4. Pilot sonucu ile bakım iş emri, duruş süresi ve parça tüketimi etkisini ölçmek.
5. Yetkilendirme, denetim kaydı ve veri yönetişimi kontrolleriyle kurumsal entegrasyona geçmek.

## Görüşmede 90 saniyelik anlatım

"Bu projede üretim hattı telemetrisinden, arıza öncesi 24 saatlik riski tahmin eden ve aynı anda olağandışı davranışı işaretleyen bir bakım analitiği akışı kurdum. Sentetik veriyi deterministik olarak üretiyorum; bu sayede deney tekrar üretilebiliyor. Zaman bazlı ayırımla lojistik regresyonun precision, recall ve yanlış alarm oranını ölçüyorum. Dashboard, model çıktılarını senaryo etiketinden ayrı gösteriyor ve bakım ekibine hangi sinyalin riski yükselttiğini, ilk neyi kontrol etmesi gerektiğini açıklıyor. Gerçek tesis verisiyle ilk hedefim doğruluğu pazarlamak değil; yanlış alarm maliyeti, kaçırılan arıza ve duruş etkisi üzerinden ölçülebilir bir pilot kurmak olur."

## Sınırlar

Bu bir üretim kontrol sistemi veya gerçek arıza tahmin iddiası değildir. GitHub Pages yalnızca statik dashboard'u barındırır; yerel Node.js API'si burada çalışmaz. Gerçek kullanım için veri kalitesi, etiket doğruluğu, güvenlik, erişim kontrolü, model izleme ve saha doğrulaması gerekir.

---

Teknik kaynak paketine geçmek için [source klasörünü](./source/) açın; hızlı inceleme için [canlı demoyu](https://taykuth.github.io/kocaeli-factory-intelligence/) kullanın.
// AIServices.js
// Yapay Zeka API hizmetleri için gerekli fonksiyonlar

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyD4XHl_tmjeLX4SlENsngRy9auqNGpTuXk";

// API cevapları için cache
const aiCache = {
  cache: {},
  MAX_CACHE_SIZE: 100, // Maksimum önbellek boyutu
  
  // Cache'i temizleme fonksiyonu
  prune() {
    const keys = Object.keys(this.cache);
    if (keys.length > this.MAX_CACHE_SIZE) {
      // En eski 20 girişi sil
      const keysToRemove = keys.slice(0, 20);
      keysToRemove.forEach(key => delete this.cache[key]);
      console.log('API önbelleği temizlendi, 20 eski giriş silindi.');
    }
  },

  // Cache'e kaydetme
  set(key, value) {
    this.cache[key] = {
      timestamp: Date.now(),
      value
    };
    this.prune();
    
    // LocalStorage'a da kaydet (kalıcı depolama)
    try {
      const storageKey = `ai_cache_${key}`;
      localStorage.setItem(storageKey, JSON.stringify({
        timestamp: Date.now(),
        value
      }));
    } catch (e) {
      console.warn('LocalStorage kayıt hatası:', e);
    }
  },

  // Cache'den getirme
  get(key) {
    // Önce memory cache'de kontrol et
    const cachedItem = this.cache[key];
    if (cachedItem) {
      return cachedItem.value;
    }
    
    // Memory cache'de yoksa localStorage'ı kontrol et
    try {
      const storageKey = `ai_cache_${key}`;
      const storedItem = localStorage.getItem(storageKey);
      if (storedItem) {
        const parsed = JSON.parse(storedItem);
        // Memory cache'e de ekle
        this.cache[key] = parsed;
        return parsed.value;
      }
    } catch (e) {
      console.warn('LocalStorage okuma hatası:', e);
    }
    
    return null;
  },

  // Cache anahtarı oluşturma
  createKey(context, question) {
    // Basit bir hash fonksiyonu
    const str = question.trim().toLowerCase() + context.substring(0, 200);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 32bit integer'a dönüştür
    }
    return hash.toString(16);
  }
};

/**
 * Yapay zeka servisine soru sorar ve cevap döndürür
 * @param {string} context - Yapay zekanın kullanacağı bağlam metni
 * @param {string} question - Kullanıcının sorduğu soru
 * @returns {Promise<string>} - Yapay zeka tarafından verilen cevap
 */
export const askAI = async (context, question) => {
  // Cache anahtarı oluştur
  const cacheKey = aiCache.createKey(context, question);
  
  // Önce cache'den kontrol et
  const cachedAnswer = aiCache.get(cacheKey);
  if (cachedAnswer) {
    console.log('AI yanıtı önbellekten alındı');
    return cachedAnswer;
  }
  
  // Uzun dokümanlar için net talimat
  const prompt = `Doküman içeriği:\n${context}\n\n`
    + `Soru: ${question}\n\n`
    + "Yanıtta sadece sorunun kısa ve net cevabını ver. Doküman içeriğini veya soruyu tekrar yazma.";
  
  const data = {
    contents: [
      {
        parts: [
          { text: prompt }
        ]
      }
    ]
  };

  const headers = {
    "Content-Type": "application/json"
  };

  // Retry mekanizması
  const maxRetries = 3;
  const waitTime = 5000; // 5 saniye

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        // Rate limit aşılırsa bekleyip tekrar dene
        if (response.status === 429 && attempt < maxRetries - 1) {
          console.log(`Limit aşıldı. ${waitTime/1000} saniye sonra tekrar denenecek...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        throw new Error(`API hatası: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      const answer = result.candidates?.[0]?.content?.parts?.[0]?.text || "Cevap dönmedi.";
      
      // Cevapta doküman içeriği varsa filtrele (kaba bir kontrol)
      let finalAnswer = answer;
      if (answer.length > 500) {
        finalAnswer = "Cevap çok uzun, kısa bir özet: [Dokümandan ilgili bilgi bulunamadı veya özetlenemedi].";
      } else {
        finalAnswer = answer.trim();
      }
      
      // Cache'e kaydet
      aiCache.set(cacheKey, finalAnswer);
      
      return finalAnswer;
    } catch (error) {
      if (attempt === maxRetries - 1) {
        return `API hatası: ${error.message}`;
      }
      // Son deneme değilse, tekrar dene
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  return "Yanıt alınamadı. Lütfen daha sonra tekrar deneyin.";
};

/**
 * Dosya içeriğini oku (Bu fonksiyon istemci tarafında kullanılamaz, sadece Node.js için)
 * React uygulamasında bu fonksiyon yerine fetch kullanılacak
 */
export const readFile = async (filePath) => {
  try {
    // React uygulamasında, dosyalar genellikle sunucudan fetch edilir
    // Bu sadece konsept gösterimi için
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Dosya bulunamadı: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    return `Dosya okuma hatası: ${error.message}`;
  }
};

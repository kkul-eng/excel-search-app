// AIServices.js
// Yapay Zeka API hizmetleri için gerekli fonksiyonlar

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyD4XHl_tmjeLX4SlENsngRy9auqNGpTuXk";

/**
 * Yapay zeka servisine soru sorar ve cevap döndürür
 * @param {string} context - Yapay zekanın kullanacağı bağlam metni
 * @param {string} question - Kullanıcının sorduğu soru
 * @returns {Promise<string>} - Yapay zeka tarafından verilen cevap
 */
export const askAI = async (context, question) => {
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
      if (answer.length > 500) {
        return "Cevap çok uzun, kısa bir özet: [Dokümandan ilgili bilgi bulunamadı veya özetlenemedi].";
      }
      
      return answer.trim();
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

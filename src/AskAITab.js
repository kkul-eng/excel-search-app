import React, { useState, useRef, useEffect, useCallback } from 'react';
import { askAI } from './AIServices';

/**
 * Yapay Zekaya Sor sekmesi bileşeni - optimize edilmiş
 */
const AskAITab = ({ combinedData, isLoading: initialLoading }) => {
  const [question, setQuestion] = useState('');
  const [searchResults, setSearchResults] = useState({
    gtipResults: [],
    izahnameResults: [],
    izahnameContext: []
  });
  const [isAsking, setIsAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cacheStatus, setCacheStatus] = useState('idle');
  const questionInputRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Önbellek yapısı - global değişken yerine Redux benzeri pattern kullan
  const cacheRef = useRef({
    questions: {},
    searchResults: {},
    contexts: {},
    MAX_CACHE_SIZE: 50
  });

  // LocalStorage'dan önbellek yükle 
  useEffect(() => {
    try {
      const storedCache = localStorage.getItem('aiCache');
      if (storedCache) {
        const parsedCache = JSON.parse(storedCache);
        cacheRef.current = {
          ...cacheRef.current,
          questions: parsedCache.questions || {},
          searchResults: parsedCache.searchResults || {},
          contexts: parsedCache.contexts || {}
        };
        console.log('Cache localStorage\'dan yüklendi.');
      }
    } catch (e) {
      console.warn('LocalStorage yükleme hatası:', e);
    }
  }, []);

  // Önbellekten cevap alma
  const getCachedAnswer = useCallback((q) => {
    const key = q.trim().toLowerCase();
    return {
      answer: cacheRef.current.questions[key] || null,
      searchResults: cacheRef.current.searchResults[key] || null,
      context: cacheRef.current.contexts[key] || null
    };
  }, []);

  // Önbelleğe soru kaydetme
  const cacheQuestion = useCallback((q, answer, results, context) => {
    const key = q.trim().toLowerCase();
    
    // Önbelleğe kaydet
    cacheRef.current.questions[key] = answer;
    cacheRef.current.searchResults[key] = results;
    cacheRef.current.contexts[key] = context;
    
    // Önbellek boyutunu kontrol et
    const questionKeys = Object.keys(cacheRef.current.questions);
    if (questionKeys.length > cacheRef.current.MAX_CACHE_SIZE) {
      // En eski 10 girişi sil
      const keysToRemove = questionKeys.slice(0, 10);
      keysToRemove.forEach(k => {
        delete cacheRef.current.questions[k];
        delete cacheRef.current.searchResults[k];
        delete cacheRef.current.contexts[k];
      });
    }
    
    // LocalStorage'a async olarak kaydet - ana thread'i bloklamasın
    setTimeout(() => {
      try {
        localStorage.setItem('aiCache', JSON.stringify({
          questions: cacheRef.current.questions,
          searchResults: cacheRef.current.searchResults,
          contexts: cacheRef.current.contexts
        }));
      } catch (e) {
        console.warn('LocalStorage kayıt hatası:', e);
      }
    }, 0);
  }, []);

  // Soru kelimelerini ayıklama - optimize edilmiş
  const extractKeywords = useCallback((text) => {
    // Türkçe soru kelimeleri ve bağlaçlar
    const filterWords = new Set([
      'ne', 'nasıl', 'neden', 'niçin', 'niye', 'kim', 'kime', 'kimi', 'kiminle', 'kimden',
      'nerede', 'nereye', 'nereden', 'neresi', 'hangisi', 'hangi', 'kaç', 'kaçta', 'ne zaman',
      'mi', 'mı', 'mu', 'mü', 'değil mi', 'değil mı', 'değil mu', 'değil mü',
      'mıdır', 'midir', 'mudur', 'müdür', 'acaba', 'hiç',
      've', 'veya', 'ile', 'de', 'da', 'ki', 'için', 'gibi', 'ise', 'ama', 'fakat',
      'sınıflandırılır', 'girer', 'olur', 'edilir', 'yapılır', 'bulunur', 'yer alır'
    ]);
    
    // Temizleme ve filtreleme işlemlerini birleştir
    const keywords = new Set();
    text.toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .replace(/\s\s+/g, ' ')
      .split(' ')
      .filter(word => !filterWords.has(word) && word.length > 2)
      .forEach(word => keywords.add(word));
    
    return Array.from(keywords);
  }, []);

  // GTİP araması - optimize edilmiş
  const searchGtip = useCallback(async (keywords, useCache = true) => {
    if (!keywords || keywords.length === 0) return [];
    
    // Tek sorgu yaklaşımıyla arama - birden fazla sorgu yapmak yerine
    const searchText = keywords.join(' ');
    const cacheKey = `gtip:${searchText}`;
    
    // Önbellek kontrolü
    if (useCache) {
      try {
        const cachedResults = sessionStorage.getItem(cacheKey);
        if (cachedResults) {
          return JSON.parse(cachedResults);
        }
      } catch (e) {
        console.warn('Session storage okuma hatası:', e);
      }
    }
    
    try {
      // Tek bir API çağrısı yap
      const response = await fetch(`/api/gtip/search?query=${encodeURIComponent(searchText)}`);
      
      if (!response.ok) {
        throw new Error(`GTİP araması başarısız: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Veriyi önbelleğe asenkron kaydet
      setTimeout(() => {
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(data || []));
        } catch (e) {
          console.warn('Session storage yazma hatası:', e);
        }
      }, 0);
      
      return data || [];
    } catch (error) {
      console.error('GTİP arama hatası:', error);
      return [];
    }
  }, []);
// Sonuçlardan bağlam oluştur
  const prepareContextFromResults = useCallback((gtipResults, izahnameResults, izahnameContext) => {
    // Performans için string birleştirme işlemini optimize et
    const contextParts = [];
    
    if (gtipResults && gtipResults.length > 0) {
      contextParts.push("--- GTİP Verileri ---");
      contextParts.push("Kod\tTanım");
      contextParts.push("-------------------------------");
      
      for (let i = 0; i < gtipResults.length; i++) {
        const item = gtipResults[i];
        if (item.Kod && item.Tanım) {
          contextParts.push(`${item.Kod}\t${item.Tanım}`);
        }
      }
      
      contextParts.push("");
    }
    
    if (izahnameResults && izahnameResults.length > 0) {
      contextParts.push("--- İzahname Sonuçları ---");
      for (let i = 0; i < izahnameResults.length; i++) {
        if (izahnameResults[i].paragraph) {
          contextParts.push(izahnameResults[i].paragraph);
        }
      }
      contextParts.push("");
    }
    
    if (izahnameContext && izahnameContext.length > 0) {
      contextParts.push("--- İzahname Bağlam ---");
      for (let i = 0; i < izahnameContext.length; i++) {
        if (izahnameContext[i].paragraph) {
          contextParts.push(izahnameContext[i].paragraph);
        }
      }
      contextParts.push("");
    }
    
    contextParts.push("");
    contextParts.push("--- Genel Bilgiler ---");
    contextParts.push("GTİP (Gümrük Tarife İstatistik Pozisyonu) kodları, gümrük işlemlerinde kullanılan uluslararası kodlardır. Her ürünün kendine özgü bir GTİP kodu vardır ve bu kod ürünün gümrük işlemlerinde vergilendirme oranını belirler. Armonize Sistem Nomenklatürü, uluslararası ticarette ürünlerin sınıflandırılması için kullanılan standart bir sistemdir. İzahname, gümrük tarife pozisyonlarının detaylı açıklamalarını içerir. Eşya fihristi, alfabetik dizin şeklinde eşyaların hangi GTİP koduna girdiğini gösteren kılavuzdur.");
    
    return contextParts.join("\n");
  }, []);

  // Sohbeti en aşağıya kaydırma - debounce uygulanmış
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      setTimeout(() => {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }, 50);
    }
  }, []);

  // Direk GTİP sonucu göstermeyi işle
  const handleGtipResults = useCallback((results, newChat) => {
    if (!results || results.length === 0) return false;
    
    const currentSearchResults = {
      gtipResults: results,
      izahnameResults: [],
      izahnameContext: []
    };
    
    // Sonuçları göster
    setSearchResults(currentSearchResults);
    
    // Python kodundaki gibi tablo formatında bir sonuç oluştur
    const tableResponse = [
      "GTİP sonuçları:",
      "",
      ...results.map(item => `Kod: ${item.Kod}, Tanım: ${item.Tanım}`)
    ].join("\n");
    
    // Cevabı kullanıcıya göster
    setChatHistory([...newChat, { type: 'answer', text: tableResponse }]);
    
    // Önbelleğe kaydet
    cacheQuestion(question, tableResponse, currentSearchResults, "");
    
    return true;
  }, [question, cacheQuestion]);

  // Soru sorma fonksiyonu - optimize edilmiş
  const askQuestion = useCallback(async () => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) return;
    
    try {
      setIsLoading(true);
      setIsAsking(true);
      setError(null);
      
      // Cache'den kontrol et
      const cachedData = getCachedAnswer(trimmedQuestion);
      if (cachedData.answer) {
        setCacheStatus('hit');
        console.log('Cache hit: Yanıt önbellekten alındı');
        
        // Soruyu geçmişe ekle
        const newChat = [...chatHistory, { type: 'question', text: trimmedQuestion }];
        setChatHistory(newChat);
        
        // Cache'den sonuçları al
        setSearchResults(cachedData.searchResults || {
          gtipResults: [],
          izahnameResults: [],
          izahnameContext: []
        });
        
        // Önbellekten cevabı geçmişe ekle - minimal gecikme
        setTimeout(() => {
          setChatHistory([...newChat, { type: 'answer', text: cachedData.answer }]);
          scrollToBottom();
          setIsLoading(false);
          setIsAsking(false);
        }, 100);
        
        return;
      }
      
      setCacheStatus('miss');
      console.log('Cache miss: Yeni yanıt hazırlanıyor');
      
      // Soruyu geçmişe ekle
      const newChat = [...chatHistory, { type: 'question', text: trimmedQuestion }];
      setChatHistory(newChat);
      
      // Anahtar kelimeleri çıkar
      const keywords = extractKeywords(trimmedQuestion);
      console.log('Anahtar kelimeler:', keywords);
      
      // Önce GTİP araması yap
      const gtipResults = await searchGtip(keywords);
      
      // GTİP sonuçları varsa, bunları direkt göster ve hızlıca dön
      if (handleGtipResults(gtipResults, newChat)) {
        setIsLoading(false);
        setIsAsking(false);
        scrollToBottom();
        return;
      }
      
      // Asenkron işlemleri her zaman try-catch içinde yap
      try {
        // GTİP sonucu yoksa normal akışa devam et
        const izahnameResults = [];
        const izahnameContext = [];
        
        // Sonuçları kaydet
        const currentSearchResults = { gtipResults, izahnameResults, izahnameContext };
        setSearchResults(currentSearchResults);
        
        // API için bağlamı hazırla
        const context = prepareContextFromResults(gtipResults, izahnameResults, izahnameContext);
        
        // API'ye soruyu sor
        const aiAnswer = await askAI(context, trimmedQuestion);
        
        // Cevabı geçmişe ekle
        setChatHistory([...newChat, { type: 'answer', text: aiAnswer }]);
        
        // Önbelleğe kaydet - asenkron
        cacheQuestion(trimmedQuestion, aiAnswer, currentSearchResults, context);
        
        // Sohbet alanını en aşağıya kaydır
        scrollToBottom();
      } catch (innerError) {
        console.error('İç işlem hatası:', innerError);
        setError(`İşlem sırasında bir hata oluştu: ${innerError.message}`);
      }
      
    } catch (err) {
      console.error('Yapay zeka soru hatası:', err);
      setError(`Soru sorulurken bir hata oluştu: ${err.message}`);
    } finally {
      setIsLoading(false);
      setIsAsking(false);
      setCacheStatus('idle');
    }
  }, [question, chatHistory, extractKeywords, searchGtip, prepareContextFromResults, scrollToBottom, getCachedAnswer, cacheQuestion, handleGtipResults]);

  // Enter tuşu ile soru sorma
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  }, [askQuestion]);

  // Focus input on tab selection
  useEffect(() => {
    if (questionInputRef.current) {
      questionInputRef.current.focus();
    }
  }, []);

  // Örnek sorular
  const exampleQuestions = [
    "Pamuklu gömlekler hangi GTİP koduna girer?",
    "İpek kumaşların vergi oranı nedir?",
    "Soğan tohumları ne kadar vergi öder?",
    "Fasıllar arasındaki farklar nelerdir?"
  ];

  // Örnek soru seçildiğinde
  const handleExampleClick = useCallback((exampleQuestion) => {
    setQuestion(exampleQuestion);
    // Gecikmeli olarak focus ve submit yap
    setTimeout(() => {
      if (questionInputRef.current) {
        questionInputRef.current.focus();
        askQuestion();
      }
    }, 100);
  }, [askQuestion]);

  // Styles
  const styles = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      padding: '15px',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    searchResultsContainer: {
      marginBottom: '20px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      overflow: 'hidden',
    },
    searchResultsHeader: {
      padding: '10px 15px',
      backgroundColor: '#2563eb',
      color: 'white',
      fontWeight: '600',
      fontSize: '16px',
      display: 'flex',
      justifyContent: 'space-between',
    },
    searchResultsBody: {
      maxHeight: '200px',
      overflowY: 'auto',
    },
    chatHistoryContainer: {
      flex: 1,
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      marginBottom: '15px',
      maxHeight: '400px',
    },
    userQuestion: {
      alignSelf: 'flex-end',
      backgroundColor: '#e2e8f0',
      padding: '10px 15px',
      borderRadius: '12px 12px 0 12px',
      maxWidth: '80%',
      wordBreak: 'break-word',
    },
    aiAnswer: {
      alignSelf: 'flex-start',
      backgroundColor: '#f0f9ff', 
      padding: '10px 15px',
      borderRadius: '12px 12px 12px 0',
      border: '1px solid #bae6fd',
      maxWidth: '80%',
      wordBreak: 'break-word',
    },
    inputArea: {
      display: 'flex',
      gap: '10px',
      marginTop: 'auto',
    },
    textArea: {
      flex: 1,
      padding: '12px 15px',
      borderRadius: '8px',
      border: '2px solid #e2e8f0',
      resize: 'none',
      fontSize: '15px',
      fontFamily: 'inherit',
      minHeight: '50px',
      maxHeight: '150px',
      overflowY: 'auto',
    },
    button: {
      backgroundColor: '#2563eb',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      padding: '0 20px',
      fontSize: '15px',
      fontWeight: '500',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    disabledButton: {
      backgroundColor: '#e2e8f0',
      cursor: 'not-allowed',
    },
    errorMessage: {
      backgroundColor: '#fee2e2',
      color: '#b91c1c',
      padding: '10px 15px',
      borderRadius: '6px',
      marginBottom: '15px',
      fontSize: '14px',
      fontWeight: '500',
    },
    loadingSpinner: {
      display: 'inline-block',
      width: '16px',
      height: '16px',
      border: '2px solid #bfdbfe',
      borderTopColor: '#3b82f6',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginRight: '8px',
    },
    emptyState: {
      flex: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      padding: '40px 20px',
      textAlign: 'center',
      color: '#64748b',
    },
    emptyStateIcon: {
      fontSize: '32px',
      marginBottom: '20px',
      color: '#94a3b8',
    },
    emptyStateTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '10px',
    },
    emptyStateText: {
      fontSize: '14px',
      maxWidth: '400px',
      lineHeight: '1.6',
    },
    emptyStateExamples: {
      marginTop: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '10px',
      fontSize: '14px',
    },
    emptyStateExample: {
      padding: '10px',
      backgroundColor: '#f1f5f9',
      borderRadius: '6px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
    }
  };

  return (
    <div style={styles.container}>
      {error && <div style={styles.errorMessage}>{error}</div>}
      
      {/* Chat Geçmişi */}
      {chatHistory.length > 0 && (
        <div 
          ref={chatContainerRef}
          style={styles.chatHistoryContainer} 
          className="custom-scrollbar"
        >
          {chatHistory.map((chat, idx) => (
            <div 
              key={idx} 
              style={chat.type === 'question' ? styles.userQuestion : styles.aiAnswer}
            >
              {chat.text}
            </div>
          ))}
        </div>
      )}
      
      {/* GTİP Sonuçları - Tablo olarak göster */}
      {searchResults.gtipResults && searchResults.gtipResults.length > 0 && (
        <div style={styles.searchResultsContainer}>
          <div style={styles.searchResultsHeader}>
            <span>GTİP Arama Sonuçları</span>
            <span>{searchResults.gtipResults.length} sonuç</span>
          </div>
          <div style={styles.searchResultsBody} className="custom-scrollbar">
            <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '14px'}}>
              <thead>
                <tr style={{backgroundColor: '#f1f5f9', textAlign: 'left'}}>
                  <th style={{padding: '8px 10px', borderBottom: '1px solid #e2e8f0', width: '150px'}}>Kod</th>
                  <th style={{padding: '8px 10px', borderBottom: '1px solid #e2e8f0'}}>Tanım</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.gtipResults.map((item, index) => (
                  <tr key={index} style={{borderBottom: '1px solid #e2e8f0'}}>
                    <td style={{padding: '8px 10px', fontWeight: '500'}}>{item.Kod || ''}</td>
                    <td style={{padding: '8px 10px'}}>{item.Tanım || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Boş Durum */}
      {chatHistory.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyStateIcon}>🔍</div>
          <div style={styles.emptyStateTitle}>Yapay Zekaya Sorunuzu Sorun</div>
          <p style={styles.emptyStateText}>
            Gümrük tarifeleri, GTİP kodları, eşya sınıflandırması veya ithalat/ihracat işlemleri hakkında sorularınızı buradan sorabilirsiniz.
          </p>
          
          <div style={styles.emptyStateExamples}>
            <div>Örnek sorular:</div>
            {exampleQuestions.map((q, i) => (
              <div 
                key={i} 
                style={styles.emptyStateExample}
                onClick={() => handleExampleClick(q)}
              >
                {q}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Soru Giriş Alanı */}
      <div style={styles.inputArea}>
        <textarea
          ref={questionInputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Sorunuzu buraya yazın... (Örn: Pamuklu gömlekler hangi GTİP'e girer?)"
          style={styles.textArea}
          disabled={isAsking || isLoading}
        />
        <button
          onClick={askQuestion}
          disabled={isAsking || !question.trim() || isLoading}
          style={{
            ...styles.button,
            ...(isAsking || !question.trim() || isLoading ? styles.disabledButton : {})
          }}
        >
          {isAsking ? (
            <>
              <span style={styles.loadingSpinner}></span>
              {cacheStatus === 'hit' ? 'Önbellekten...' : 'Soruluyor...'}
            </>
          ) : 'Sor'}
        </button>
      </div>
    </div>
  );
};

export default AskAITab;

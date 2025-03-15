import React, { useState, useRef, useEffect } from 'react';
import { askAI } from './AIServices';

/**
 * Yapay Zekaya Sor sekmesi bileşeni
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
  const questionInputRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Soru kelimelerini ayıklama (soru kelimelerini çıkar)
  const extractKeywords = (text) => {
    // Türkçe soru kelimeleri
    const questionWords = [
      'ne', 'nasıl', 'neden', 'niçin', 'niye', 'kim', 'kime', 'kimi', 'kiminle', 'kimden',
      'nerede', 'nereye', 'nereden', 'neresi', 'hangisi', 'hangi', 'kaç', 'kaçta', 'ne zaman',
      'mi', 'mı', 'mu', 'mü', 'değil mi', 'değil mı', 'değil mu', 'değil mü',
      'mıdır', 'midir', 'mudur', 'müdür', 'acaba', 'hiç'
    ];
    
    // Boşlukları temizle, noktalama işaretlerini kaldır, küçük harfe çevir
    const cleanText = text
      .toLowerCase()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '')
      .replace(/\s\s+/g, ' ');
    
    // Kelimelere ayır
    const words = cleanText.split(' ');
    
    // Soru kelimelerini ve 3 karakterden kısa kelimeleri çıkar
    const keywords = words.filter(word => 
      !questionWords.includes(word) && word.length >= 3
    );
    
    // Tekrar eden kelimeleri çıkar
    return [...new Set(keywords)];
  };

  // GTİP araması
  const searchGtip = async (keywords) => {
    try {
      if (!keywords || keywords.length === 0) return [];
      
      // Anahtar kelimelerle arama yap (her kelime için ayrı arama)
      const results = [];
      
      for (const keyword of keywords) {
        const response = await fetch(`/api/gtip/search?query=${encodeURIComponent(keyword)}`);
        
        if (!response.ok) {
          throw new Error(`GTİP araması başarısız: ${response.status}`);
        }
        
        const data = await response.json();
        if (data && data.length > 0) {
          results.push(...data);
        }
      }
      
      // Tekrarlanan sonuçları çıkar
      const uniqueResults = results.filter((item, index, self) =>
        index === self.findIndex((t) => t.Kod === item.Kod)
      );
      
      // En fazla 10 sonuç göster
      return uniqueResults.slice(0, 10);
    } catch (error) {
      console.error('GTİP arama hatası:', error);
      return [];
    }
  };

  // İzahname araması
  const searchIzahname = async (keywords) => {
    try {
      if (!keywords || keywords.length === 0) return { results: [], context: [] };
      
      // Anahtar kelimelerle arama yap (her kelime için ayrı arama)
      const results = [];
      
      for (const keyword of keywords) {
        const response = await fetch(`/api/izahname/search?query=${encodeURIComponent(keyword)}`);
        
        if (!response.ok) {
          throw new Error(`İzahname araması başarısız: ${response.status}`);
        }
        
        const data = await response.json();
        if (data && data.length > 0) {
          results.push(...data);
        }
      }
      
      // Tekrarlanan sonuçları çıkar
      const uniqueResults = results.filter((item, index, self) =>
        index === self.findIndex((t) => t.index === item.index)
      );
      
      // En fazla 5 sonuç göster
      const topResults = uniqueResults.slice(0, 5);
      
      // İlk sonuç için bağlam al (paragraf önce/sonra)
      let context = [];
      if (topResults.length > 0) {
        const firstResult = topResults[0];
        context = await fetchIzahnameContext(firstResult.index);
      }
      
      return { results: topResults, context };
    } catch (error) {
      console.error('İzahname arama hatası:', error);
      return { results: [], context: [] };
    }
  };

  // İzahname bağlam alma
  const fetchIzahnameContext = async (index) => {
    try {
      const response = await fetch(`/api/izahname/context?index=${index}`);
      
      if (!response.ok) {
        throw new Error(`İzahname detayı alınamadı: ${response.status}`);
      }
      
      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('İzahname detay hatası:', error);
      return [];
    }
  };

  // Soru sorma fonksiyonu
  const askQuestion = async () => {
    if (!question.trim()) return;
    
    try {
      setIsLoading(true);
      setIsAsking(true);
      setError(null);
      
      // Soruyu geçmişe ekle
      const newChat = [...chatHistory, { type: 'question', text: question }];
      setChatHistory(newChat);
      
      // Anahtar kelimeleri çıkar
      const keywords = extractKeywords(question);
      console.log('Anahtar kelimeler:', keywords);
      
      // GTİP araması yap
      const gtipResults = await searchGtip(keywords);
      
      // İzahname araması yap
      const { results: izahnameResults, context: izahnameContext } = await searchIzahname(keywords);
      
      // Sonuçları kaydet
      setSearchResults({
        gtipResults,
        izahnameResults,
        izahnameContext
      });
      
      // API için bağlamı hazırla
      let context = prepareContextFromResults(gtipResults, izahnameResults, izahnameContext);
      
      // API'ye soruyu sor
      const aiAnswer = await askAI(context, question);
      
      // Cevabı geçmişe ekle
      setChatHistory([...newChat, { type: 'answer', text: aiAnswer }]);
      
      // Sohbet alanını en aşağıya kaydır
      scrollToBottom();
    } catch (err) {
      console.error('Yapay zeka soru hatası:', err);
      setError(`Soru sorulurken bir hata oluştu: ${err.message}`);
    } finally {
      setIsLoading(false);
      setIsAsking(false);
    }
  };

  // Sonuçlardan bağlam oluştur
  const prepareContextFromResults = (gtipResults, izahnameResults, izahnameContext) => {
    let context = '';
    
    // GTIP verileri
    if (gtipResults && gtipResults.length > 0) {
      context += "--- GTİP Verileri ---\n";
      gtipResults.forEach(item => {
        if (item.Kod && item.Tanım) {
          context += `Kod: ${item.Kod}, Tanım: ${item.Tanım}\n`;
        }
      });
      context += "\n";
    }
    
    // İzahname sonuçları
    if (izahnameResults && izahnameResults.length > 0) {
      context += "--- İzahname Sonuçları ---\n";
      izahnameResults.forEach(item => {
        if (item.paragraph) {
          context += `${item.paragraph}\n`;
        }
      });
      context += "\n";
    }
    
    // İzahname bağlam
    if (izahnameContext && izahnameContext.length > 0) {
      context += "--- İzahname Bağlam ---\n";
      izahnameContext.forEach(item => {
        if (item.paragraph) {
          context += `${item.paragraph}\n`;
        }
      });
      context += "\n";
    }
    
    // Genel bağlam ekle
    context += "\n--- Genel Bilgiler ---\n";
    context += "GTİP (Gümrük Tarife İstatistik Pozisyonu) kodları, gümrük işlemlerinde kullanılan uluslararası kodlardır. ";
    context += "Her ürünün kendine özgü bir GTİP kodu vardır ve bu kod ürünün gümrük işlemlerinde vergilendirme oranını belirler. ";
    context += "Armonize Sistem Nomenklatürü, uluslararası ticarette ürünlerin sınıflandırılması için kullanılan standart bir sistemdir. ";
    context += "İzahname, gümrük tarife pozisyonlarının detaylı açıklamalarını içerir. ";
    context += "Eşya fihristi, alfabetik dizin şeklinde eşyaların hangi GTİP koduna girdiğini gösteren kılavuzdur.";
    
    return context;
  };

  // Sohbeti en aşağıya kaydırma
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      setTimeout(() => {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }, 100);
    }
  };

  // Enter tuşu ile soru sorma
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askQuestion();
    }
  };

  // Focus input on tab selection
  useEffect(() => {
    if (questionInputRef.current) {
      questionInputRef.current.focus();
    }
  }, []);

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
    gtipItem: {
      display: 'flex',
      padding: '10px 15px',
      borderBottom: '1px solid #e2e8f0',
      fontSize: '14px',
    },
    gtipCode: {
      width: '150px',
      fontWeight: '500',
      flexShrink: 0,
    },
    gtipDesc: {
      flex: 1,
    },
    aiAnswerContainer: {
      padding: '15px',
      backgroundColor: '#f0f9ff',
      borderRadius: '8px',
      marginBottom: '20px',
      border: '1px solid #bae6fd',
    },
    aiAnswerHeader: {
      fontWeight: '600',
      marginBottom: '10px',
      color: '#0369a1',
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
    },
    aiAnswerText: {
      lineHeight: '1.6',
      whiteSpace: 'pre-wrap',
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
    noResults: {
      padding: '15px',
      textAlign: 'center',
      color: '#64748b',
      fontStyle: 'italic',
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
    keywordsContainer: {
      display: 'flex',
      gap: '5px',
      flexWrap: 'wrap',
      marginBottom: '10px',
    },
    keywordTag: {
      padding: '2px 8px',
      backgroundColor: '#e2e8f0',
      borderRadius: '12px',
      fontSize: '12px',
      color: '#475569',
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
      ':hover': {
        backgroundColor: '#e2e8f0',
      }
    },
  };

  // Örnek sorular
  const exampleQuestions = [
    "Pamuklu gömlekler hangi GTİP koduna girer?",
    "İpek kumaşların vergi oranı nedir?",
    "Soğan tohumları ne kadar vergi öder?",
    "Fasıllar arasındaki farklar nelerdir?"
  ];

  // Örnek soru seçildiğinde
  const handleExampleClick = (exampleQuestion) => {
    setQuestion(exampleQuestion);
    if (questionInputRef.current) {
      questionInputRef.current.focus();
    }
  };

  return (
    <div style={styles.container}>
      {error && <div style={styles.errorMessage}>{error}</div>}
      
      {/* GTİP Sonuçları */}
      {searchResults.gtipResults && searchResults.gtipResults.length > 0 && (
        <div style={styles.searchResultsContainer}>
          <div style={styles.searchResultsHeader}>
            <span>GTİP Arama Sonuçları</span>
            <span>{searchResults.gtipResults.length} sonuç</span>
          </div>
          <div style={styles.searchResultsBody} className="custom-scrollbar">
            {searchResults.gtipResults.map((item, index) => (
              <div key={index} style={styles.gtipItem}>
                <div style={styles.gtipCode}>{item.Kod || ''}</div>
                <div style={styles.gtipDesc}>{item.Tanım || ''}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Yapay Zeka Cevabı */}
      {chatHistory.length > 0 && chatHistory[chatHistory.length - 1].type === 'answer' && (
        <div style={styles.aiAnswerContainer}>
          <div style={styles.aiAnswerHeader}>
            <span>Yapay Zeka Cevabı</span>
          </div>
          <div style={styles.aiAnswerText}>
            {chatHistory[chatHistory.length - 1].text}
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
              Soruluyor...
            </>
          ) : 'Sor'}
        </button>
      </div>
    </div>
  );
};

export default AskAITab;

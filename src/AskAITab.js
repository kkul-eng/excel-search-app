// İzahname araması
  const searchIzahname = useCallback(async (keywords, useCache = true) => {
    try {
      if (!keywords || keywords.length === 0) return { results: [], context: [] };
      
      // Cache anahtar oluştur
      const cacheKey = `izahname:${keywords.sort().join(',')}`;
      
      // Cache kontrolü
      if (useCache) {
        const cachedResults = sessionStorage.getItem(cacheKey);
        if (cachedResults) {
          return JSON.parse(cachedResults);
        }
      }
      
      // Anahtar kelimelerle arama yap (her kelime için ayrı arama)
      const results = [];
      const promises = keywords.map(keyword => 
        fetch(`/api/izahname/search?query=${encodeURIComponent(keyword)}`)
          .then(response => {
            if (!response.ok) {
              throw new Error(`İzahname araması başarısız: ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            if (data && data.length > 0) {
              results.push(...data);
            }
          })
      );
      
      await Promise.all(promises);
      
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
        context = await fetchIzahnameContext(firstResult.index, useCache);
      }
      
      const finalResults = { results: topResults, context };
      
      // Cache'e kaydet
      sessionStorage.setItem(cacheKey, JSON.stringify(finalResults));
      
      return finalResults;
    } catch (error) {
      console.error('İzahname arama hatası:', error);
      return { results: [], context: [] };
    }
  }, []);

  // İzahname bağlam alma
  const fetchIzahnameContext = useCallback(async (index, useCache = true) => {
    try {
      // Cache anahtar oluştur
      const cacheKey = `izahname-context:${index}`;
      
      // Cache kontrolü
      if (useCache) {
        const cachedContext = sessionStorage.getItem(cacheKey);
        if (cachedContext) {
          return JSON.parse(cachedContext);
        }
      }
      
      const response = await fetch(`/api/izahname/context?index=${index}`);
      
      if (!response.ok) {
        throw new Error(`İzahname detayı alınamadı: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Cache'e kaydet
      sessionStorage.setItem(cacheKey, JSON.stringify(data || []));
      
      return data || [];
    } catch (error) {
      console.error('İzahname detay hatası:', error);
      return [];
    }
  }, []);

  // Sonuçlardan bağlam oluştur
  const prepareContextFromResults = useCallback((gtipResults, izahnameResults, izahnameContext) => {
    let context = '';
    
    // GTIP verileri - tablo formatında
    if (gtipResults && gtipResults.length > 0) {
      context += "--- GTİP Verileri ---\n";
      context += "Kod\tTanım\n";
      context += "-------------------------------\n";
      gtipResults.forEach(item => {
        if (item.Kod && item.Tanım) {
          context += `${item.Kod}\t${item.Tanım}\n`;
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
  }, []);

  // Sohbeti en aşağıya kaydırma
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      setTimeout(() => {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }, 100);
    }
  }, []);

  // Soru sorma fonksiyonu
  const askQuestion = useCallback(async () => {
    if (!question.trim()) return;
    
    try {
      setIsLoading(true);
      setIsAsking(true);
      setError(null);
      
      // Cache'den kontrol et
      const cachedData = window.askAICache?.getAnswer(question) || { answer: null };
      if (cachedData.answer) {
        setCacheStatus('hit');
        console.log('Cache hit: Yanıt önbellekten alındı');
        
        // Soruyu geçmişe ekle
        const newChat = [...chatHistory, { type: 'question', text: question }];
        setChatHistory(newChat);
        
        // Cache'den sonuçları al
        setSearchResults(cachedData.searchResults || {
          gtipResults: [],
          izahnameResults: [],
          izahnameContext: []
        });
        
        // Önbellekten cevabı geçmişe ekle
        setTimeout(() => {
          setChatHistory([...newChat, { type: 'answer', text: cachedData.answer }]);
          scrollToBottom();
          setIsLoading(false);
          setIsAsking(false);
        }, 300);
        
        return;
      }
      
      setCacheStatus('miss');
      console.log('Cache miss: Yanıt API\'den alınacak');
      
      // Soruyu geçmişe ekle
      const newChat = [...chatHistory, { type: 'question', text: question }];
      setChatHistory(newChat);
      
      // Anahtar kelimeleri çıkar
      const keywords = extractKeywords(question);
      console.log('Anahtar kelimeler:', keywords);
      
      // Önce GTİP araması yap ve sonuçları göster
      const gtipResults = await searchGtip(keywords);
      
      // GTİP sonuçları varsa, bunları direkt ekranda göster
      if (gtipResults && gtipResults.length > 0) {
        // Sonuçları kaydet
        const currentSearchResults = {
          gtipResults,
          izahnameResults: [],
          izahnameContext: []
        };
        
        setSearchResults(currentSearchResults);
        
        // Python kodundaki gibi HTML tablo formatında bir sonuç oluştur
        let tableResponse = "";
        
        if (gtipResults.length > 0) {
          tableResponse = "GTİP sonuçları:\n\n";
          gtipResults.forEach(item => {
            tableResponse += `Kod: ${item.Kod}, Tanım: ${item.Tanım}\n`;
          });
        }
        
        // Cevabı kullanıcıya göster
        setChatHistory([...newChat, { type: 'answer', text: tableResponse }]);
        
        // Cache'e kaydet
        if (window.askAICache) {
          window.askAICache.addQuestion(question, tableResponse, currentSearchResults, "");
        }
        
        // Şimdilik işlemi sonlandır, daha fazla API çağrısı yapma
        setIsLoading(false);
        setIsAsking(false);
        scrollToBottom();
        return;
      }
      
      // GTİP sonucu yoksa normal akışa devam et
      // İzahname araması ve diğer adımlar
      const izahnameSearchResults = await searchIzahname(keywords);
      const { results: izahnameResults, context: izahnameContext } = izahnameSearchResults;
      
      // Sonuçları kaydet
      const currentSearchResults = {
        gtipResults,
        izahnameResults,
        izahnameContext
      };
      
      setSearchResults(currentSearchResults);
      
      // API için bağlamı hazırla
      const context = prepareContextFromResults(gtipResults, izahnameResults, izahnameContext);
      
      // API'ye soruyu sor
      const aiAnswer = await askAI(context, question);
      
      // Cevabı geçmişe ekle
      setChatHistory([...newChat, { type: 'answer', text: aiAnswer }]);
      
      // Cache'e kaydet
      if (window.askAICache) {
        window.askAICache.addQuestion(question, aiAnswer, currentSearchResults, context);
      }
      
      // Sohbet alanını en aşağıya kaydır
      scrollToBottom();
    } catch (err) {
      console.error('Yapay zeka soru hatası:', err);
      setError(`Soru sorulurken bir hata oluştu: ${err.message}`);
    } finally {
      setIsLoading(false);
      setIsAsking(false);
      setCacheStatus('idle');
    }
  }, [question, chatHistory, extractKeywords, searchGtip, searchIzahname, prepareContextFromResults, scrollToBottom]);

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

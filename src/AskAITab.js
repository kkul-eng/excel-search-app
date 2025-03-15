import React, { useState, useRef, useEffect } from 'react';
import { askAI } from './AIServices';

/**
 * Yapay Zekaya Sor sekmesi bileşeni
 */
const AskAITab = ({ combinedData, isLoading }) => {
  // İzahname.txt dosyasını almak için state
  const [izahnameText, setIzahnameText] = useState('');
  const [isIzahnameTextLoading, setIsIzahnameTextLoading] = useState(false);
  const [izahnameTextError, setIzahnameTextError] = useState(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [error, setError] = useState(null);
  const questionInputRef = useRef(null);
  const chatContainerRef = useRef(null);

  // Soru sorma fonksiyonu
  const askQuestion = async () => {
    if (!question.trim()) return;
    
    try {
      setIsAsking(true);
      setError(null);
      
      // Soruyu geçmişe ekle
      const newChat = [...chatHistory, { type: 'question', text: question }];
      setChatHistory(newChat);
      
      // Kullanılacak bağlamı seç
      let context;
      
      // İzahname.txt dosyası varsa, onu kullan
      if (izahnameText) {
        context = izahnameText;
      } else {
        // Yoksa, API'den alınan verileri birleştir
        context = prepareContext(combinedData);
      }
      
      // API'ye soruyu sor
      const aiAnswer = await askAI(context, question);
      
      // Cevabı geçmişe ekle
      setChatHistory([...newChat, { type: 'answer', text: aiAnswer }]);
      setQuestion('');
      
      // Sohbet alanını en aşağıya kaydır
      scrollToBottom();
    } catch (err) {
      console.error('Yapay zeka soru hatası:', err);
      setError(`Soru sorulurken bir hata oluştu: ${err.message}`);
    } finally {
      setIsAsking(false);
    }
  };

  // Context hazırlama
  const prepareContext = (data) => {
    if (!data) return '';
    
    let context = '';
    
    // GTIP verisi
    if (data.gtipData && Array.isArray(data.gtipData)) {
      context += "--- GTİP Verileri ---\n";
      data.gtipData.forEach(item => {
        if (item.Kod && item.Tanım) {
          context += `Kod: ${item.Kod}, Tanım: ${item.Tanım}\n`;
        }
      });
      context += "\n";
    }
    
    // İzahname verisi
    if (data.izahnameData && Array.isArray(data.izahnameData)) {
      context += "--- İzahname Verileri ---\n";
      data.izahnameData.forEach(item => {
        if (item.paragraf) {
          context += `${item.paragraf}\n`;
        }
      });
      context += "\n";
    }
    
    // Tarife verisi
    if (data.tarifeData && Array.isArray(data.tarifeData)) {
      context += "--- Tarife Verileri ---\n";
      data.tarifeData.forEach(item => {
        if (item['1. Kolon'] && item['2. Kolon']) {
          context += `${item['1. Kolon']}: ${item['2. Kolon']}\n`;
        }
      });
      context += "\n";
    }
    
    // Eşya Fihristi verisi
    if (data.esyaFihristiData && Array.isArray(data.esyaFihristiData)) {
      context += "--- Eşya Fihristi Verileri ---\n";
      data.esyaFihristiData.forEach(item => {
        if (item['Eşya'] && item['Armonize Sistem']) {
          context += `Eşya: ${item['Eşya']}, Armonize Sistem: ${item['Armonize Sistem']}`;
          if (item['İzahname Notları']) {
            context += `, İzahname Notları: ${item['İzahname Notları']}`;
          }
          context += "\n";
        }
      });
    }
    
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

  // İzahname.txt dosyasını yükle
  useEffect(() => {
    const fetchIzahnameText = async () => {
      try {
        setIsIzahnameTextLoading(true);
        setIzahnameTextError(null);
        
        const response = await fetch('/api/izahname-text');
        
        if (!response.ok) {
          if (response.status === 404) {
            console.log('İzahname.txt dosyası sunucuda bulunamadı');
          } else {
            throw new Error(`İzahname.txt alınamadı: ${response.status}`);
          }
        } else {
          const data = await response.json();
          setIzahnameText(data.content || '');
          console.log('İzahname.txt yüklendi:', Math.floor((data.content?.length || 0) / 1024), 'KB');
        }
      } catch (error) {
        console.error('İzahname.txt yükleme hatası:', error);
        setIzahnameTextError(`İzahname.txt dosyası yüklenirken hata oluştu: ${error.message}`);
      } finally {
        setIsIzahnameTextLoading(false);
      }
    };
    
    fetchIzahnameText();
  }, []);

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
    chatArea: {
      flex: 1,
      overflowY: 'auto',
      marginBottom: '15px',
      padding: '15px',
      backgroundColor: '#f8fafc',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
    },
    questionBubble: {
      alignSelf: 'flex-end',
      backgroundColor: '#2563eb',
      color: 'white',
      padding: '10px 15px',
      borderRadius: '18px 18px 0 18px',
      maxWidth: '80%',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
      wordBreak: 'break-word',
    },
    answerBubble: {
      alignSelf: 'flex-start',
      backgroundColor: '#e2e8f0',
      color: '#1e293b',
      padding: '10px 15px',
      borderRadius: '18px 18px 18px 0',
      maxWidth: '80%',
      boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
      wordBreak: 'break-word',
    },
    inputArea: {
      display: 'flex',
      gap: '10px',
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
    emptyState: {
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#64748b',
      padding: '20px',
    },
    emptyTitle: {
      fontSize: '18px',
      fontWeight: '600',
      marginBottom: '10px',
    },
    emptyText: {
      fontSize: '14px',
      textAlign: 'center',
      maxWidth: '400px',
    },
    loadingText: {
      fontSize: '14px',
      color: '#64748b',
      fontStyle: 'italic',
      textAlign: 'center',
      margin: '20px 0',
    },
  };

  return (
    <div style={styles.container}>
      {error && <div style={styles.errorMessage}>{error}</div>}
      
      <div 
        ref={chatContainerRef} 
        style={styles.chatArea} 
        className="custom-scrollbar"
      >
        {isLoading || isIzahnameTextLoading ? (
          <div style={styles.loadingText}>
            {isIzahnameTextLoading 
              ? 'İzahname.txt dosyası yükleniyor... Bu biraz zaman alabilir.' 
              : 'Veriler yükleniyor... Bu biraz zaman alabilir.'}
          </div>
        ) : chatHistory.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyTitle}>Yapay Zekaya Sorunuzu Sorun</div>
            <p style={styles.emptyText}>
              Gümrük tarife, GTİP, izahname veya eşya fihristi ile ilgili sorularınızı yapay zekaya sorabilirsiniz.
              Örneğin: "Pamuklu gömlek hangi GTİP'e girer?" veya "Şeftali konservesi için vergi oranı nedir?"
            </p>
          </div>
        ) : (
          chatHistory.map((chat, index) => (
            <div 
              key={index} 
              style={chat.type === 'question' ? styles.questionBubble : styles.answerBubble}
            >
              {chat.text}
            </div>
          ))
        )}
        
        {isAsking && (
          <div style={styles.answerBubble}>
            <div>Yanıt hazırlanıyor...</div>
          </div>
        )}
      </div>
      
      <div style={styles.inputArea}>
        <textarea
          ref={questionInputRef}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Sorunuzu buraya yazın... (Örn: Pamuklu gömlekler hangi GTİP'e girer?)"
          style={styles.textArea}
          disabled={isAsking || isLoading || isIzahnameTextLoading}
        />
        <button
          onClick={askQuestion}
          disabled={isAsking || !question.trim() || isLoading || isIzahnameTextLoading}
          style={{
            ...styles.button,
            ...(isAsking || !question.trim() || isLoading || isIzahnameTextLoading ? styles.disabledButton : {})
          }}
        >
          {isAsking ? 'Soruluyor...' : 'Sor'}
        </button>
      </div>
      
      {/* İzahname.txt durum bilgisi */}
      {izahnameText && (
        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '10px', textAlign: 'center' }}>
          İzahname.txt dosyası kullanılıyor ({Math.floor(izahnameText.length / 1024)} KB)
        </div>
      )}
      
      {izahnameTextError && (
        <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '10px', textAlign: 'center' }}>
          {izahnameTextError}
        </div>
      )}
    </div>
  );
};

export default AskAITab;

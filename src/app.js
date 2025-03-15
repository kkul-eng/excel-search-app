import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import VirtualList from './VirtualList';
import AskAITab from './AskAITab';
import './App.css';

/**
 * Gümrük Tarife Arama Uygulaması ana komponenti
 * Tüm arama sekmeleri ve fonksiyonlarını yönetir
 */
function App() {
  // Temel state değişkenleri
  const [activeTab, setActiveTab] = useState('gtip');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [gtipResults, setGtipResults] = useState([]);
  const [searchResultsIndices, setSearchResultsIndices] = useState([]);
  const [detailResults, setDetailResults] = useState([]);
  const [showDetail, setShowDetail] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);
  const [error, setError] = useState(null);
  
  // Tüm veriler için state
  const [combinedData, setCombinedData] = useState({
    gtipData: [],
    izahnameData: [],
    tarifeData: [],
    esyaFihristiData: []
  });

  // Referanslar
  const searchInputRef = useRef(null);
  const listRef = useRef(null);
  const boldParagraphRef = useRef(null);
  const detailContainerRef = useRef(null);
// Türkçe karakter dönüşümü
  const turkceLower = useCallback((text) => {
    if (!text) return '';
    const turkceKarakterler = {
      'İ': 'i', 'I': 'ı', 'Ş': 'ş', 'Ğ': 'ğ',
      'Ü': 'ü', 'Ö': 'ö', 'Ç': 'ç'
    };
    let result = String(text);
    for (const [upper, lower] of Object.entries(turkceKarakterler)) {
      result = result.replace(new RegExp(upper, 'g'), lower);
    }
    return result.toLowerCase();
  }, []);

  // Tab verileri
  const tabs = useMemo(() => [
    { id: 'gtip', name: 'GTİP Arama', label: 'Aradığınız GTİP kodu veya kelimeleri girin:' },
    { id: 'izahname', name: 'İzahname Arama', label: 'Aranacak kelime veya kelimeleri girin:' },
    { id: 'tarife', name: 'Tarife Cetveli', label: 'Aranacak kelime veya rakamı girin:' },
    { id: 'esya-fihristi', name: 'Eşya Fihristi', label: 'Aranacak kelime veya rakamı girin:' },
    { id: 'ask-ai', name: 'Yapay Zekaya Sor', label: 'Sorunuzu yazın:' },
  ], []);

  const activeTabData = useMemo(() => 
    tabs.find((tab) => tab.id === activeTab), 
    [tabs, activeTab]
  );
// Detay sonuçları gösterildiğinde kalın paragrafa kaydır
  useEffect(() => {
    if (showDetail && boldParagraphRef.current && detailContainerRef.current) {
      setTimeout(() => {
        const container = detailContainerRef.current;
        const boldParagraph = boldParagraphRef.current;
        
        const containerHeight = container.clientHeight;
        const boldParagraphHeight = boldParagraph.clientHeight;
        const boldParagraphTop = boldParagraph.offsetTop;
        
        const scrollPosition = boldParagraphTop - (containerHeight / 2) + (boldParagraphHeight / 2);
        
        container.scrollTop = scrollPosition;
      }, 200); // Daha güvenilir olması için timeout arttırıldı
    }
  }, [showDetail, detailResults]);

  // Yapay Zeka için tüm verileri yükleme fonksiyonu
  const loadAllData = useCallback(async () => {
    if (activeTab === 'ask-ai') {
      setIsLoading(true);
      setError(null);
      
      try {
        const newCombinedData = { ...combinedData };
        
        // GTIP verisi
        if (newCombinedData.gtipData.length === 0) {
          const response = await fetch('/api/gtip/search?query=');
          if (response.ok) {
            const data = await response.json();
            newCombinedData.gtipData = data || [];
          }
        }
        
        // Tarife verisi
        if (newCombinedData.tarifeData.length === 0) {
          const response = await fetch('/api/tarife/all');
          if (response.ok) {
            const data = await response.json();
            newCombinedData.tarifeData = data || [];
          }
        }
        
        // Eşya Fihristi verisi
        if (newCombinedData.esyaFihristiData.length === 0) {
          const response = await fetch('/api/esya-fihristi/all');
          if (response.ok) {
            const data = await response.json();
            newCombinedData.esyaFihristiData = data || [];
          }
        }
        
        setCombinedData(newCombinedData);
      } catch (error) {
        console.error('Veri yükleme hatası:', error);
        setError(`Yapay zeka için veri yüklenirken bir hata oluştu: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }
  }, [activeTab, combinedData]);
// Sekme değiştiğinde ilk verileri yükle
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setResults([]);
        setSearchResultsIndices([]);
        setCurrentMatchIndex(-1);
        setTotalMatches(0);
        setShowDetail(false);
        
        if (activeTab === 'gtip') {
          // GTIP sekmesi için önbellekteki sonuçları kullan (varsa)
          if (gtipResults.length > 0) {
            setResults(gtipResults);
          }
        } else if (activeTab === 'tarife') {
          const response = await fetch('/api/tarife/all');
          
          if (!response.ok) {
            throw new Error(`Tarife verileri alınamadı: ${response.status}`);
          }
          
          const data = await response.json();
          setResults(data || []);
          
          // Aynı zamanda combinedData'ya da ekle
          setCombinedData(prev => ({...prev, tarifeData: data || []}));
        } else if (activeTab === 'esya-fihristi') {
          const response = await fetch('/api/esya-fihristi/all');
          
          if (!response.ok) {
            throw new Error(`Eşya fihristi verileri alınamadı: ${response.status}`);
          }
          
          const data = await response.json();
          setResults(data || []);
          
          // Aynı zamanda combinedData'ya da ekle
          setCombinedData(prev => ({...prev, esyaFihristiData: data || []}));
        } else if (activeTab === 'ask-ai') {
          // Yapay zeka için tüm verileri yükle
          await loadAllData();
        }
        // İzahname sekmesi için başlangıçta tüm verileri yüklemeye gerek yok
      } catch (error) {
        console.error('Veri yükleme hatası:', error);
        setError(`Veri yüklenirken bir hata oluştu: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();

    // Arama için klavye kısayolu ayarla (Ctrl+F)
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, gtipResults, loadAllData]);

  // Yükleme durumu CSS sınıfı
  useEffect(() => {
    if (isLoading) {
      document.body.classList.add('is-loading');
    } else {
      document.body.classList.remove('is-loading');
    }
  }, [isLoading]);
// Arama fonksiyonu
  const search = useCallback(async () => {
    if (!query.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      setShowDetail(false); // Yeni aramada detay görünümünü kapat
      
      if (activeTab === 'gtip') {
        const response = await fetch(`/api/gtip/search?query=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
          throw new Error(`GTİP araması başarısız: ${response.status}`);
        }
        
        const data = await response.json();
        setResults(data || []);
        setGtipResults(data || []);
        
        // Aynı zamanda combinedData'ya da ekle
        setCombinedData(prev => ({...prev, gtipData: data || []}));
        
        setSearchResultsIndices([]);
        setCurrentMatchIndex(-1);
      } else if (activeTab === 'izahname') {
        const response = await fetch(`/api/izahname/search?query=${encodeURIComponent(query)}`);
        
        if (!response.ok) {
          throw new Error(`İzahname araması başarısız: ${response.status}`);
        }
        
        const data = await response.json();
        setResults(data || []);
        
        // Aynı zamanda combinedData'ya da ekle
        setCombinedData(prev => ({...prev, izahnameData: data || []}));
        
        setSearchResultsIndices([]);
        setCurrentMatchIndex(-1);
      } else if (activeTab === 'tarife' || activeTab === 'esya-fihristi') {
        // Bu sekmeler zaten veri yüklü, yerel olarak filtreleme yap
        const lowerQuery = turkceLower(query);
        let matchedIndices = [];
        
        if (activeTab === 'tarife') {
          matchedIndices = results.map((row, index) => {
            if (!row) return -1;
            const col1 = turkceLower(row['1. Kolon'] || '');
            const col2 = turkceLower(row['2. Kolon'] || '');
            return col1.includes(lowerQuery) || col2.includes(lowerQuery) ? index : -1;
          }).filter(index => index !== -1);
        } else { // esya-fihristi
          matchedIndices = results.map((row, index) => {
            if (!row) return -1;
            const esya = turkceLower(row['Eşya'] || '');
            const armonize = turkceLower(row['Armonize Sistem'] || '');
            const notlar = turkceLower(row['İzahname Notları'] || '');
            return esya.includes(lowerQuery) || armonize.includes(lowerQuery) || notlar.includes(lowerQuery) ? index : -1;
          }).filter(index => index !== -1);
        }
        
        setSearchResultsIndices(matchedIndices);
        setTotalMatches(matchedIndices.length);
        setCurrentMatchIndex(matchedIndices.length > 0 ? 0 : -1);
        
        // Eşleşme bulunursa ilk eşleşmeye kaydır
        if (matchedIndices.length > 0 && listRef.current) {
          setTimeout(() => {
            listRef.current.scrollToIndex({
              index: matchedIndices[0],
              align: 'center'
            });
          }, 100);
        }
      }
    } catch (error) {
      console.error('Arama hatası:', error);
      setError(`Arama sırasında bir hata oluştu: ${error.message}`);
      setResults([]);
      setSearchResultsIndices([]);
      setCurrentMatchIndex(-1);
      setTotalMatches(0);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, query, results, turkceLower]);
// İzahname detay verisi çekme
  const fetchDetail = useCallback(async (index) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch(`/api/izahname/context?index=${index}`);
      
      if (!response.ok) {
        throw new Error(`İzahname detayı alınamadı: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!data || data.length === 0) {
        throw new Error('İzahname detayı boş döndü');
      }
      
      setDetailResults(data);
      setShowDetail(true);
    } catch (error) {
      console.error('Detay alma hatası:', error);
      setError(`Detay alınırken hata oluştu: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sonraki eşleşmeye git
  const nextMatch = useCallback(() => {
    if (searchResultsIndices.length > 0) {
      setCurrentMatchIndex((prev) => {
        const newIndex = (prev + 1) % searchResultsIndices.length;
        if (listRef.current) {
          listRef.current.scrollToIndex({
            index: searchResultsIndices[newIndex],
            align: 'center'
          });
        }
        return newIndex;
      });
    }
  }, [searchResultsIndices]);

  // Önceki eşleşmeye git
  const previousMatch = useCallback(() => {
    if (searchResultsIndices.length > 0) {
      setCurrentMatchIndex((prev) => {
        const newIndex = (prev - 1 + searchResultsIndices.length) % searchResultsIndices.length;
        if (listRef.current) {
          listRef.current.scrollToIndex({
            index: searchResultsIndices[newIndex],
            align: 'center'
          });
        }
        return newIndex;
      });
    }
  }, [searchResultsIndices]);

  // Sekme değiştiğinde state'i sıfırla
  const resetState = useCallback((tabId) => {
    setActiveTab(tabId);
    setQuery('');
    setError(null);
    setResults([]);
    setSearchResultsIndices([]);
    setShowDetail(false);
    setCurrentMatchIndex(-1);
    setTotalMatches(0);
    setDetailResults([]);
  }, []);

  // Enter tuşu ile arama yapma
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      search();
    }
  }, [search]);
// VirtualList için satır render fonksiyonu
  const rowRenderer = useCallback(({ index, key, style }) => {
    try {
      const row = results[index];
      if (!row) return null;

      const isHighlighted = searchResultsIndices[currentMatchIndex] === index;
      const isMatch = searchResultsIndices.includes(index);
      
      const baseRowStyle = {
        display: 'flex',
        alignItems: 'center',
        padding: '10px 15px',
        borderBottom: '1px solid #e2e8f0',
        fontSize: '14px',
        color: '#1e293b',
        transition: 'all 0.3s ease',
        textAlign: 'left',
        ...style,
      };
      
      const dynamicStyle = isHighlighted 
        ? { backgroundColor: '#3b82f6', color: 'white' } 
        : isMatch 
          ? { backgroundColor: '#dbeafe' } 
          : {};

      const cellStyle = {
        padding: '0 10px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      };

      const cellCodeStyle = {
        ...cellStyle,
        width: '150px',
        flexShrink: 0,
        fontWeight: '500',
      };

      const cellDescriptionStyle = {
        ...cellStyle,
        flex: 1,
        minWidth: '300px',
      };

      const cellItemStyle = {
        ...cellStyle,
        width: '50%',
      };

      const cellHarmonizedStyle = {
        ...cellStyle,
        width: '25%',
      };

      const cellNotesStyle = {
        ...cellStyle,
        width: '25%',
      };

      if (activeTab === 'gtip') {
        return (
          <div key={key} style={{ ...baseRowStyle, ...dynamicStyle }}>
            <div style={cellCodeStyle}>{row.Kod || ''}</div>
            <div style={cellDescriptionStyle}>{row.Tanım || ''}</div>
          </div>
        );
      } else if (activeTab === 'tarife') {
        return (
          <div key={key} style={{ ...baseRowStyle, ...dynamicStyle }}>
            <div style={cellCodeStyle}>{row['1. Kolon'] || ''}</div>
            <div style={cellDescriptionStyle}>{row['2. Kolon'] || ''}</div>
          </div>
        );
      } else if (activeTab === 'esya-fihristi') {
        return (
          <div key={key} style={{ ...baseRowStyle, ...dynamicStyle }}>
            <div style={cellItemStyle}>{row['Eşya'] || ''}</div>
            <div style={cellHarmonizedStyle}>{row['Armonize Sistem'] || ''}</div>
            <div style={cellNotesStyle}>{row['İzahname Notları'] || ''}</div>
          </div>
        );
      }
      return null;
    } catch (err) {
      console.error('Satır render hatası:', err);
      return (
        <div key={key} style={{ 
          ...style, 
          display: 'flex',
          padding: '10px 15px',
          borderBottom: '1px solid #e2e8f0',
          fontSize: '14px' 
        }}>
          <div style={{ padding: '0 10px' }}>Satır gösterilirken hata oluştu</div>
        </div>
      );
    }
  }, [activeTab, results, searchResultsIndices, currentMatchIndex]);
return (
    <div className="app">
      <header className="header">
        <h1 className="header-title">Gümrük Tarife Arama Uygulaması</h1>
      </header>

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'tab-active' : ''}`}
            onClick={() => resetState(tab.id)}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <main className="content custom-scrollbar">
        <h2 className="heading">{activeTabData.name}</h2>
        
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}
{/* Yapay Zeka sekmesi için ayrı bir render */}
        {activeTab === 'ask-ai' ? (
          <AskAITab 
            combinedData={combinedData} 
            isLoading={isLoading} 
          />
        ) : (
          <>
            <div className="search-container">
              <label className="form-label" htmlFor="search-input">{activeTabData.label}</label>
              <div className="search-form">
                {['tarife', 'esya-fihristi'].includes(activeTab) && searchResultsIndices.length > 1 && (
                  <button
                    onClick={previousMatch}
                    className={`nav-button ${searchResultsIndices.length <= 1 ? 'nav-button-disabled' : ''}`}
                    disabled={searchResultsIndices.length <= 1}
                    title="Önceki eşleşme"
                    aria-label="Önceki eşleşme"
                  >
                    ◄
                  </button>
                )}
                <input
                  id="search-input"
                  ref={searchInputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={`${activeTabData.name} ...`}
                  aria-label="Arama"
                  className="search-input"
                  autoComplete="off" 
                />
                <button 
                  onClick={search} 
                  disabled={isLoading}
                  aria-label="Ara"
                  className={`search-button ${isLoading ? 'search-button-disabled' : ''}`}
                >
                  {isLoading ? 'Aranıyor...' : 'Ara'}
                </button>
                {['tarife', 'esya-fihristi'].includes(activeTab) && searchResultsIndices.length > 1 && (
                  <button
                    onClick={nextMatch}
                    className={`nav-button ${searchResultsIndices.length <= 1 ? 'nav-button-disabled' : ''}`}
                    disabled={searchResultsIndices.length <= 1}
                    title="Sonraki eşleşme"
                    aria-label="Sonraki eşleşme"
                  >
                    ►
                  </button>
                )}
              </div>
              {['tarife', 'esya-fihristi'].includes(activeTab) && searchResultsIndices.length > 0 && (
                <div className="match-info">
                  {currentMatchIndex >= 0 ? currentMatchIndex + 1 : 0} / {totalMatches} eşleşme
                </div>
              )}
            </div>
{activeTab === 'gtip' && results.length === 0 && !isLoading && (
              <div className="empty-state">
                <p>Bu sayfada;</p>
                <p>- 3824 veya 382410 şeklinde GTİP kodu ile aralarda noktalama işareti olmadan arama,</p>
                <p>- dokunmuş boyalı poliester pamuk devamsız mensucat şeklinde aramak yerine,
                  yazım sırası önemli olmadan; do bo pa po de me şeklinde arama,</p>
                <p>- sülfirik veya sülfirik asit şeklinde arama yapabilirsiniz.</p>
              </div>
            )}

            {activeTab === 'izahname' && results.length === 0 && !isLoading && !showDetail && (
              <div className="empty-state">
                <p>Bu sayfada;</p>
                <p>- izahnamede aramak istediğiniz kelime veya kelimelerle arama,</p>
                <p>- herhangi bir fasıl için arama yapmak istediğinizde 59.03 gibi arama,</p>
                <p>yapabilirsiniz.</p>
              </div>
            )}

            {isLoading && <div className="loader" aria-label="Yükleniyor"></div>}

            {!isLoading && showDetail ? (
              <div className="results-container">
                <div className="detail-header-container">
                  <h3 className="detail-header-title">İzahname Detay</h3>
                  <button 
                    onClick={() => setShowDetail(false)}
                    className="back-button"
                    aria-label="Geri dön"
                  >
                    <span>←</span> Geri Dön
                  </button>
                </div>
                
                <div 
                  className="izahname-detail-container custom-scrollbar"
                  ref={detailContainerRef}
                >
                  {detailResults.map((result, index) => (
                    <p 
                      key={index} 
                      className={result.isBold ? "bold-text" : ""}
                      ref={result.isBold ? boldParagraphRef : null}
                    >
                      {result.paragraph || ''}
                    </p>
                  ))}
                </div>
              </div>
            ) : (
              <div className="results-container">
                {activeTab === 'gtip' && results.length > 0 && (
                  <div className="list-container">
                    <div className="treeview-header">
                      <div className="header-cell header-cell-code">Kod</div>
                      <div className="header-cell header-cell-description">Tanım</div>
                    </div>
                    <VirtualList
                      items={results}
                      height={350}
                      rowHeight={40}
                      rowRenderer={rowRenderer}
                      ref={listRef}
                    />
                  </div>
                )}

                {activeTab === 'izahname' && results.length > 0 && (
                  <div className="izahname-results">
                    {results.map((r, i) => (
                      <div key={i} className="izahname-result">
                        <p>{r.paragraph || ''}</p>
                        <button 
                          onClick={() => fetchDetail(r.index)} 
                          className="detail-button"
                          aria-label="İzahname detayını görüntüle"
                        >
                          Detay...
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'tarife' && results.length > 0 && (
                  <div className="list-container">
                    <div className="treeview-header">
                      <div className="header-cell header-cell-code">1. Kolon</div>
                      <div className="header-cell header-cell-description">2. Kolon</div>
                    </div>
                    <VirtualList
                      items={results}
                      height={350}
                      rowHeight={40}
                      rowRenderer={rowRenderer}
                      ref={listRef}
                    />
                  </div>
                )}

                {activeTab === 'esya-fihristi' && results.length > 0 && (
                  <div className="list-container">
                    <div className="treeview-header">
                      <div className="header-cell header-cell-item">Eşya</div>
                      <div className="header-cell header-cell-harmonized">Armonize Sistem</div>
                      <div className="header-cell header-cell-notes">İzahname Notları</div>
                    </div>
                    <VirtualList
                      items={results}
                      height={350}
                      rowHeight={40}
                      rowRenderer={rowRenderer}
                      ref={listRef}
                    />
                  </div>
                )}
                
                {results.length === 0 && !isLoading && activeTab !== 'gtip' && activeTab !== 'izahname' && (
                  <div className="empty-state">
                    <p>Arama yapmak için yukarıdaki form alanını kullanın</p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} Gümrük Tarife Arama Uygulaması</p>
      </footer>
    </div>
  );
}

export default App;

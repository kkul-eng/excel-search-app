import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import VirtualList from './VirtualList';

function App() {
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
  const searchInputRef = useRef(null);
  const listRef = useRef(null);
  const boldParagraphRef = useRef(null);
  const detailContainerRef = useRef(null);

  // Added useEffect to scroll to the bold paragraph when detail results are shown
  useEffect(() => {
    if (showDetail && boldParagraphRef.current && detailContainerRef.current) {
      // Wait a bit for rendering to complete
      setTimeout(() => {
        // Get the container and bold paragraph positions
        const container = detailContainerRef.current;
        const boldParagraph = boldParagraphRef.current;
        
        // Calculate the scroll position to center the bold paragraph
        const containerHeight = container.clientHeight;
        const boldParagraphHeight = boldParagraph.clientHeight;
        const boldParagraphTop = boldParagraph.offsetTop;
        
        // Calculate center position
        const scrollPosition = boldParagraphTop - (containerHeight / 2) + (boldParagraphHeight / 2);
        
        // Scroll the container to center the bold paragraph
        container.scrollTop = scrollPosition;
      }, 100);
    }
  }, [showDetail, detailResults]);

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
  ], []);

  const activeTabData = useMemo(() => tabs.find((tab) => tab.id === activeTab), [tabs, activeTab]);
  headerTitle: {
      fontSize: '22px',
      fontWeight: '600',
      marginLeft: '10px',
    },
    tabs: {
      display: 'flex',
      justifyContent: 'center',
      backgroundColor: '#fff',
      borderBottom: '1px solid #e2e8f0',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      padding: 0,
    },
    tab: {
      padding: '12px 20px',
      backgroundColor: 'transparent',
      color: '#64748b',
      border: 'none',
      fontSize: '15px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      position: 'relative',
      outline: 'none',
    },
    tabActive: {
      color: '#2563eb',
      fontWeight: '600',
      boxShadow: 'inset 0 -3px 0 #2563eb',
    },
    content: {
      flex: 1,
      padding: '15px',
      maxWidth: '1200px',
      margin: '10px auto',
      width: '100%',
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      position: 'relative',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column',
    },
    heading: {
      fontSize: '20px',
      color: '#2563eb',
      marginBottom: '15px',
      textAlign: 'center',
      fontWeight: '600',
    },
    searchContainer: {
      marginBottom: '20px',
      backgroundColor: '#f8fafc',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    label: {
      fontSize: '15px',
      color: '#1e293b',
      display: 'block',
      marginBottom: '6px',
      fontWeight: '500',
    },
    searchForm: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '10px',
      marginBottom: '15px',
      flexWrap: 'wrap',
    },
    searchInput: {
      width: '100%',
      maxWidth: '400px',
      padding: '10px 15px',
      fontSize: '15px',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      transition: 'all 0.3s ease',
    },
    searchButton: {
      padding: '10px 25px',
      backgroundColor: '#2563eb',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      minWidth: '110px',
    },
    searchButtonDisabled: {
      backgroundColor: '#e2e8f0',
      cursor: 'not-allowed',
    },
    navButton: {
      width: '45px',
      height: '38px',
      backgroundColor: '#2563eb',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: 'bold',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    navButtonDisabled: {
      backgroundColor: '#e2e8f0',
      cursor: 'not-allowed',
    },
    matchInfo: {
      fontSize: '14px',
      fontWeight: '500',
      textAlign: 'center',
      marginTop: '8px',
      color: '#2563eb',
      backgroundColor: '#dbeafe',
      padding: '5px 10px',
      borderRadius: '20px',
      display: 'inline-block',
    },
        results: {
      padding: '15px',
      borderRadius: '8px',
      backgroundColor: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      flex: 1,
      justifyContent: 'center',
    },
    listContainer: {
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      overflow: 'hidden',
      width: '100%',
      margin: '0 auto',
      maxWidth: '1000px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    treeviewHeader: {
      display: 'flex',
      backgroundColor: '#2563eb',
      color: 'white',
      fontWeight: '600',
      fontSize: '14px',
      padding: '10px 15px',
      textAlign: 'left',
    },
    headerCell: {
      padding: '0 10px',
    },
    headerCellCode: {
      width: '150px',
      flexShrink: 0,
    },
    headerCellDescription: {
      flex: 1,
      minWidth: '300px',
    },
    headerCellItem: {
      width: '50%',
    },
    headerCellHarmonized: {
      width: '25%',
    },
    headerCellNotes: {
      width: '25%',
    },
    izahnameResults: {
      display: 'flex',
      flexDirection: 'column',
      gap: '15px',
      width: '100%',
    },
    izahnameResult: {
      padding: '15px',
      backgroundColor: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      transition: 'all 0.3s ease',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
    },
    // Updated styles for izahname detail container
    izahnameDetailContainer: {
      maxHeight: '500px',
      overflowY: 'auto',
      padding: '15px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      marginBottom: '20px',
      lineHeight: '1.8',
      scrollBehavior: 'smooth', // Added for smooth scrolling
    },
    // New style for the detail header container
    detailHeaderContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: '15px',
    },
    // New style for the detail header title
    detailHeaderTitle: {
      fontSize: '18px',
      color: '#1e293b',
      fontWeight: '500',
    },
    detailButton: {
      backgroundColor: '#2563eb',
      color: 'white',
      border: 'none',
      padding: '8px 15px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.3s ease',
      marginTop: '10px',
      fontWeight: '500',
    },
    // Updated style for the back button
    backButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      backgroundColor: '#f1f5f9',
      color: '#1e293b',
      border: 'none',
      padding: '8px 15px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.3s ease',
      fontWeight: '500',
      marginLeft: '15px', // Added to create spacing between title and button
    },
        footer: {
      backgroundColor: '#2563eb',
      color: 'white',
      textAlign: 'center',
      padding: '10px 15px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
    },
    loader: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '50px',
      height: '50px',
      borderRadius: '50%',
      border: '5px solid rgba(37, 99, 235, 0.2)',
      borderTopColor: '#2563eb',
      animation: 'spin 1s ease-in-out infinite',
      zIndex: 1001,
    },
    emptyState: {
      padding: '30px',
      textAlign: 'left',
      color: '#64748b',
    },
    // Updated style for bold text
    boldText: {
      fontWeight: '700',
      backgroundColor: '#f0f9ff',
      padding: '10px',
      borderRadius: '4px',
      margin: '15px 0',
      scrollMarginTop: '200px', // Added to help center the element when scrolled to
    },
    errorMessage: {
      backgroundColor: '#fee2e2',
      color: '#b91c1c',
      padding: '10px 15px',
      borderRadius: '6px',
      marginBottom: '15px',
      fontSize: '14px',
      fontWeight: '500',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    errorIcon: {
      fontSize: '20px',
    },
  };

  return (
    <div style={styles.app}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>Gümrük Tarife Arama Uygulaması</h1>
      </header>

      <div style={styles.tabs}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTab === tab.id ? styles.tabActive : {})
            }}
            onClick={() => resetState(tab.id)}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <main style={styles.content} className="custom-scrollbar">
        <h2 style={styles.heading}>{activeTabData.name}</h2>
        
        {error && (
          <div style={styles.errorMessage}>
            <span style={styles.errorIcon}>⚠️</span>
            {error}
          </div>
        )}
        
        <div style={styles.searchContainer}>
          <label style={styles.label} htmlFor="search-input">{activeTabData.label}</label>
          <div style={styles.searchForm}>
            {['tarife', 'esya-fihristi'].includes(activeTab) && searchResultsIndices.length > 1 && (
              <button
                onClick={previousMatch}
                style={{
                  ...styles.navButton,
                  ...(searchResultsIndices.length <= 1 ? styles.navButtonDisabled : {})
                }}
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
              style={styles.searchInput}
              autoComplete="off" 
            />
            <button 
              onClick={search} 
              disabled={isLoading}
              aria-label="Ara"
              style={{
                ...styles.searchButton,
                ...(isLoading ? styles.searchButtonDisabled : {})
              }}
            >
              {isLoading ? 'Aranıyor...' : 'Ara'}
            </button>
            {['tarife', 'esya-fihristi'].includes(activeTab) && searchResultsIndices.length > 1 && (
              <button
                onClick={nextMatch}
                style={{
                  ...styles.navButton,
                  ...(searchResultsIndices.length <= 1 ? styles.navButtonDisabled : {})
                }}
                disabled={searchResultsIndices.length <= 1}
                title="Sonraki eşleşme"
                aria-label="Sonraki eşleşme"
              >
                ►
              </button>
            )}
          </div>
          {['tarife', 'esya-fihristi'].includes(activeTab) && searchResultsIndices.length > 0 && (
            <div style={styles.matchInfo}>
              {currentMatchIndex >= 0 ? currentMatchIndex + 1 : 0} / {totalMatches} eşleşme
            </div>
          )}
        </div>
{activeTab === 'gtip' && results.length === 0 && !isLoading && (
          <div style={styles.emptyState}>
            <p>Bu sayfada;</p>
            <p>- 3824 veya 382410 şeklinde GTİP kodu ile aralarda noktalama işareti olmadan arama,</p>
            <p>- dokunmuş boyalı poliester pamuk devamsız mensucat şeklinde aramak yerine,
               yazım sırası önemli olmadan; do bo pa po de me şeklinde arama,</p>
            <p>- sülfirik veya sülfirik asit şeklinde arama yapabilirsiniz.</p>
          </div>
        )}

        {activeTab === 'izahname' && results.length === 0 && !isLoading && !showDetail && (
          <div style={styles.emptyState}>
            <p>Bu sayfada;</p>
            <p>- izahnamede aramak istediğiniz kelime veya kelimelerle arama,</p>
            <p>- herhangi bir fasıl için arama yapmak istediğinizde 59.03 gibi arama,</p>
            <p>yapabilirsiniz.</p>
          </div>
        )}

        {isLoading && <div style={styles.loader} aria-label="Yükleniyor"></div>}

        {/* Updated izahname detail section with the new layout */}
        {!isLoading && showDetail ? (
          <div style={styles.results}>
            {/* New header with back button positioned to the right */}
            <div style={styles.detailHeaderContainer}>
              <h3 style={styles.detailHeaderTitle}>İzahname Detay</h3>
              <button 
                onClick={() => setShowDetail(false)}
                style={styles.backButton}
                aria-label="Geri dön"
              >
                <span>←</span> Geri Dön
              </button>
            </div>
            
            {/* Detail container with reference for scrolling */}
            <div 
              style={styles.izahnameDetailContainer} 
              className="custom-scrollbar"
              ref={detailContainerRef}
            >
              {detailResults.map((result, index) => (
                <p 
                  key={index} 
                  style={result.isBold ? styles.boldText : {}}
                  ref={result.isBold ? boldParagraphRef : null}
                >
                  {result.paragraph || ''}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <div style={styles.results}>
            {activeTab === 'gtip' && results.length > 0 && (
              <div style={styles.listContainer}>
                <div style={styles.treeviewHeader}>
                  <div style={{ ...styles.headerCell, ...styles.headerCellCode }}>Kod</div>
                  <div style={{ ...styles.headerCell, ...styles.headerCellDescription }}>Tanım</div>
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
              <div style={styles.izahnameResults}>
                {results.map((r, i) => (
                  <div key={i} style={styles.izahnameResult}>
                    <p>{r.paragraph || ''}</p>
                    <button 
                      onClick={() => fetchDetail(r.index)} 
                      style={styles.detailButton}
                      aria-label="İzahname detayını görüntüle"
                    >
                      Detay...
                    </button>
                  </div>
                ))}
              </div>
            )}
{activeTab === 'tarife' && results.length > 0 && (
              <div style={{ ...styles.listContainer, margin: '0 auto' }}>
                <div style={styles.treeviewHeader}>
                  <div style={{ ...styles.headerCell, ...styles.headerCellCode }}>1. Kolon</div>
                  <div style={{ ...styles.headerCell, ...styles.headerCellDescription }}>2. Kolon</div>
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
              <div style={{ ...styles.listContainer, margin: '0 auto' }}>
                <div style={styles.treeviewHeader}>
                  <div style={{ ...styles.headerCell, ...styles.headerCellItem }}>Eşya</div>
                  <div style={{ ...styles.headerCell, ...styles.headerCellHarmonized }}>Armonize Sistem</div>
                  <div style={{ ...styles.headerCell, ...styles.headerCellNotes }}>İzahname Notları</div>
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
              <div style={styles.emptyState}>
                <p>Arama yapmak için yukarıdaki form alanını kullanın</p>
              </div>
            )}
          </div>
        )}
      </main>

      <footer style={styles.footer}>
        <p>© {new Date().getFullYear()} Gümrük Tarife Arama Uygulaması</p>
      </footer>
    </div>
  );
}

export default App;
  

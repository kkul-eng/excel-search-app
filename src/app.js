import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import VirtualList from './VirtualList';

function App() {
  const [activeTab, setActiveTab] = useState('gtip');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [gtipResults, setGtipResults] = useState([]); // GTİP sonuçlarını ayrı sakla
  const [searchResultsIndices, setSearchResultsIndices] = useState([]);
  const [detailResults, setDetailResults] = useState([]);
  const [showDetail, setShowDetail] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

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
    { id: 'tarife', name: 'Tarife Cetveli', label: 'Aranacak kelime veya rakamı(izahnamedeki gibi) girin:' },
    { id: 'esya-fihristi', name: 'Eşya Fihristi', label: 'Aranacak kelime veya rakamı girin:' },
  ], []);

  const activeTabData = useMemo(() => tabs.find((tab) => tab.id === activeTab), [tabs, activeTab]);
  // İlk veriler yüklendiğinde
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        if (activeTab === 'gtip') {
          // GTİP sekmesinde, kayıtlı sonuçları kullan
          setResults(gtipResults);
        } else if (activeTab === 'tarife') {
          setIsLoading(true);
          const response = await fetch('/api/tarife/all');
          const data = await response.json();
          setResults(data || []);
          setSearchResultsIndices([]);
          setCurrentMatchIndex(-1);
          setTotalMatches(0);
        } else if (activeTab === 'esya-fihristi') {
          setIsLoading(true);
          const response = await fetch('/api/esya-fihristi/all');
          const data = await response.json();
          setResults(data || []);
          setSearchResultsIndices([]);
          setCurrentMatchIndex(-1);
          setTotalMatches(0);
        } else {
          // İzahname için
          setResults([]);
          setSearchResultsIndices([]);
          setCurrentMatchIndex(-1);
          setTotalMatches(0);
        }
      } catch (error) {
        console.error('Veri yükleme hatası:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();

    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, gtipResults]);

  // Yükleme durumunda body sınıfı
  useEffect(() => {
    if (isLoading) {
      document.body.classList.add('is-loading');
    } else {
      document.body.classList.remove('is-loading');
    }
  }, [isLoading]);

  // Keyframe animasyonu ve özel stiller için style elementi
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes spin {
        to {
          transform: translate(-50%, -50%) rotate(360deg);
        }
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background-color: #f8fafc;
        color: #1e293b;
        line-height: 1.6;
        margin: 0;
        padding: 0;
        overflow-y: hidden;
      }

      * {
        box-sizing: border-box;
      }
      
      body.is-loading {
        overflow: hidden;
      }
      
      .custom-scrollbar::-webkit-scrollbar {
        width: 12px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-track {
        background: #e2e8f0;
        border-radius: 8px;
      }
      
      .custom-scrollbar::-webkit-scrollbar-thumb {
        background-color: #2563eb;
        border-radius: 8px;
        border: 3px solid #e2e8f0;
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);
  // Arama fonksiyonu
  const search = useCallback(async () => {
    if (!query.trim()) {
      return;
    }

    try {
      setIsLoading(true);
      
      if (activeTab === 'gtip') {
        const response = await fetch(`/api/gtip/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        setResults(data || []);
        setGtipResults(data || []); // GTİP sonuçlarını sakla
        setSearchResultsIndices([]);
        setCurrentMatchIndex(-1);
        setShowDetail(false);
      } else if (activeTab === 'izahname') {
        const response = await fetch(`/api/izahname/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        setResults(data || []);
        setSearchResultsIndices([]);
        setCurrentMatchIndex(-1);
        setShowDetail(false);
      } else if (activeTab === 'tarife' || activeTab === 'esya-fihristi') {
        let allData = results;
        if (allData.length === 0) {
          const allDataResponse = await fetch(`/api/${activeTab}/all`);
          allData = await allDataResponse.json();
          setResults(allData || []);
        }
        
        const lowerQuery = turkceLower(query);
        let matchedIndices = [];
        
        if (activeTab === 'tarife') {
          matchedIndices = allData.map((row, index) => {
            if (!row) return -1;
            const col1 = turkceLower(row['1. Kolon'] || '');
            const col2 = turkceLower(row['2. Kolon'] || '');
            return col1.includes(lowerQuery) || col2.includes(lowerQuery) ? index : -1;
          }).filter(index => index !== -1);
        } else { // esya-fihristi
          matchedIndices = allData.map((row, index) => {
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
        
        // Eşleşme varsa, ilk eşleşmeyi ekranın ortasına getir
        if (matchedIndices.length > 0 && listRef.current) {
          listRef.current.scrollToIndex({
            index: matchedIndices[0],
            align: 'center'
          });
        }
      }
    } catch (error) {
      console.error('Arama hatası:', error);
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
      const response = await fetch(`/api/izahname/context?index=${index}`);
      const data = await response.json();
      setDetailResults(data || []);
      setShowDetail(true);
    } catch (error) {
      console.error('Detay alma hatası:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);
  // Sonraki eşleşmeye git
  const nextMatch = useCallback(() => {
    if (searchResultsIndices.length > 0) {
      setCurrentMatchIndex((prev) => {
        const newIndex = (prev + 1) % searchResultsIndices.length;
        // Sonraki eşleşmeyi ekranın ortasına getir
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
        // Önceki eşleşmeyi ekranın ortasına getir
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

  // Sekme değiştiğinde durumu sıfırla
  const resetState = useCallback((tabId) => {
    setActiveTab(tabId);
    
    if (tabId === 'gtip') {
      // GTİP sekmesine geçince önceki sonuçları göster
      setResults(gtipResults);
    } 
    
    setSearchResultsIndices([]);
    setShowDetail(false);
    setCurrentMatchIndex(-1);
    setTotalMatches(0);
  }, [gtipResults]);

  // Enter tuşunda arama yap
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      search();
    }
  }, [search]);

  // Satır render fonksiyonu
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
// Güncellenmiş stiller
  const styles = {
    app: {
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      overflow: 'hidden',
    },
    header: {
      backgroundColor: '#fff',
      color: '#1e293b',
      padding: '10px 15px',
      height: '50px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      display: 'flex',
      alignItems: 'center',
    },
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
      zIndex: 100,
      padding: 0,
    },
    tab: {
      padding: '8px 16px',
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
    },
    izahnameDetailContainer: {
      maxHeight: '500px',
      overflowY: 'auto',
      padding: '15px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      marginBottom: '20px',
      lineHeight: '1.8',
    },
    detailButton: {
      backgroundColor: '#2563eb',
      color: 'white',
      border: 'none',
      padding: '8px 15px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.3s ease',
      marginTop: '10px',
    },
    backButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      backgroundColor: '#f1f5f9',
      color: '#1e293b',
      border: 'none',
      padding: '10px 15px',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'all 0.3s ease',
    },
    footer: {
      backgroundColor: '#2563eb',
      color: 'white',
      textAlign: 'center',
      padding: '10px 15px',
      height: '40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
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
    boldText: {
      fontWeight: '700',
      backgroundColor: '#f0f9ff',
      padding: '10px',
      borderRadius: '4px',
      margin: '15px 0',
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
                aria-label="Ö

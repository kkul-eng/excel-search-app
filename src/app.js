import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import VirtualList from './VirtualList';
import AskAITab from './AskAITab'; // Yeni eklenen bileşen

function App() {
  // Main state variables
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
  
  // Tüm veriler için yeni state
  const [combinedData, setCombinedData] = useState({
    gtipData: [],
    izahnameData: [],
    tarifeData: [],
    esyaFihristiData: []
  });

  // Refs
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
    { id: 'ask-ai', name: 'Yapay Zekaya Sor', label: 'Sorunuzu yazın:' }, // Yeni sekme
  ], []);

  const activeTabData = useMemo(() => tabs.find((tab) => tab.id === activeTab), [tabs, activeTab]);
  
  // Scroll to bold paragraph when detail results are shown
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
      }, 200); // Increased timeout for better reliability
    }
  }, [showDetail, detailResults]);

  // Tüm verileri yükleme fonksiyonu - Yapay Zeka için
  const loadAllData = async () => {
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
        
        // İzahname verisi - sadece yapısal olarak alabiliyoruz
        // Gerçek veri aramalarla gelecek
        
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
  };

  // Load initial data when tab changes
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
          // For GTIP tab, use cached results if available
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
        // For izahname tab, we don't need to load all data initially
      } catch (error) {
        console.error('Veri yükleme hatası:', error);
        setError(`Veri yüklenirken bir hata oluştu: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadInitialData();

    // Set up keyboard shortcut for search
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, gtipResults, loadAllData]);

  // Handle loading state CSS class
  useEffect(() => {
    if (isLoading) {
      document.body.classList.add('is-loading');
    } else {
      document.body.classList.remove('is-loading');
    }
  }, [isLoading]);

  // Add global styles
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @keyframes spin {
        to { transform: translate(-50%, -50%) rotate(360deg); }
      }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        background-color: #f8fafc;
        color: #1e293b;
        line-height: 1.6;
        margin: 0;
        padding: 0;
        height: 100vh;
      }

      * { box-sizing: border-box; }
      
      body.is-loading { overflow: hidden; }
      
      .custom-scrollbar::-webkit-scrollbar { width: 12px; }
      
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
// Search function
  const search = useCallback(async () => {
    if (!query.trim()) return;

    try {
      setIsLoading(true);
      setError(null);
      setShowDetail(false); // Always close detail view on new search
      
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
        // These tabs already have data loaded, so we filter locally
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
        
        // Scroll to first match if found
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

  // Reset state when tab changes
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

  // Handle Enter key press for search
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      search();
    }
  }, [search]);

  // Render row for VirtualList
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

  // Styles
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
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      display: 'flex',
      alignItems: 'center',
      zIndex: 50,
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
      justifyContent: 'flex-start', // Changed from 'center' to 'flex-start' for better layout
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
    izahnameDetailContainer: {
      maxHeight: '500px',
      overflowY: 'auto',
      padding: '15px',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      marginBottom: '20px',
      lineHeight: '1.8',
      scrollBehavior: 'smooth',
      width: '100%', // Ensure full width
    },
    detailHeaderContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: '15px',
    },
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
      marginLeft: '15px',
    },
    boldText: {
      fontWeight: '700',
      backgroundColor: '#f0f9ff',
      padding: '10px',
      borderRadius: '4px',
      margin: '15px 0',
      scrollMarginTop: '200px',
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
        
        {/* Yapay Zeka sekmesi için ayrı bir render */}
        {activeTab === 'ask-ai' ? (
          <AskAITab 
            combinedData={combinedData} 
            isLoading={isLoading} 
          />
        ) : (
          <>
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

            {!isLoading && showDetail ? (
              <div style={styles.results}>
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
          </>
        )}
      </main>

      <footer style={styles.footer}>
        <p>© {new Date().getFullYear()} Gümrük Tarife Arama Uygulaması</p>
      </footer>
    </div>
  );
}

export default App;

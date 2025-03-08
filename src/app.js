import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { List } from 'react-virtualized';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('gtip');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchResultsIndices, setSearchResultsIndices] = useState([]);
  const [detailResults, setDetailResults] = useState([]);
  const [showDetail, setShowDetail] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [totalMatches, setTotalMatches] = useState(0);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  const turkceLower = (text) => {
    if (!text) return '';
    const turkceKarakterler = {
      'İ': 'i', 'I': 'ı', 'Ş': 'ş', 'Ğ': 'ğ',
      'Ü': 'ü', 'Ö': 'ö', 'Ç': 'ç'
    };
    let result = text;
    for (const [upper, lower] of Object.entries(turkceKarakterler)) {
      result = result.replace(new RegExp(upper, 'g'), lower);
    }
    return result.toLowerCase();
  };

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        let response;
        if (activeTab === 'tarife') {
          response = await axios.get('/api/tarife/all');
          console.log('Tarife Cetveli açılış verisi:', response.data);
          setResults(response.data);
          setSearchResultsIndices([]);
          setCurrentMatchIndex(-1);
        } else if (activeTab === 'esya-fihristi') {
          response = await axios.get('/api/esya-fihristi/all');
          console.log('Eşya Fihristi açılış verisi:', response.data);
          setResults(response.data);
          setSearchResultsIndices([]);
          setCurrentMatchIndex(-1);
        } else {
          setResults([]);
          console.log(`${activeTab} sekmesi açılışta boş bırakıldı`);
        }
      } catch (error) {
        console.error('Veri yüklenirken hata:', error);
        showToast('Veri yüklenirken bir hata oluştu: ' + error.message, 'error');
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();

    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'f' && activeTab !== 'gtip') {
        e.preventDefault();
        searchInputRef.current.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  useEffect(() => {
    if (isLoading) {
      document.body.classList.add('is-loading');
    } else {
      document.body.classList.remove('is-loading');
    }
  }, [isLoading]);

  const showToast = (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.className = `toast ${type} show`;
      setTimeout(() => {
        toast.className = `toast ${type}`;
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 300);
      }, 2500);
    }, 100);
  };

  const search = async () => {
    if (!query.trim()) {
      showToast('Lütfen geçerli bir kelime veya ifade girin.', 'error');
      return;
    }

    try {
      setIsLoading(true);
      const response = await axios.get(`/api/${activeTab}/search`, {
        params: { query },
      });
      const data = response.data;
      console.log(`${activeTab} arama verisi:`, data);

      if (activeTab === 'gtip') {
        setResults(data);
        setSearchResultsIndices([]);
        setCurrentMatchIndex(-1);
        setShowDetail(false);
        if (!data.length) {
          showToast('Eşleşme bulunamadı.', 'error');
        }
      } else if (activeTab === 'izahname') {
        setResults(data);
        setSearchResultsIndices([]);
        setCurrentMatchIndex(-1);
        setShowDetail(false);
        if (!data.length) {
          showToast('Eşleşme bulunamadı.', 'error');
        }
      } else if (activeTab === 'tarife' || activeTab === 'esya-fihristi') {
        const matchedIndices = results.map((row, index) => {
          try {
            if (activeTab === 'tarife') {
              const col1 = turkceLower(row['1. Kolon'] || '');
              const col2 = turkceLower(row['2. Kolon'] || '');
              return col1.includes(turkceLower(query)) || col2.includes(turkceLower(query)) ? index : -1;
            } else {
              const esya = turkceLower(row['Eşya'] || '');
              const armonize = turkceLower(row['Armonize Sistem'] || '');
              const notlar = turkceLower(row['İzahname Notları'] || '');
              return esya.includes(turkceLower(query)) || armonize.includes(turkceLower(query)) || notlar.includes(turkceLower(query)) ? index : -1;
            }
          } catch (err) {
            console.error('Row processing error:', err, row);
            return -1;
          }
        }).filter(index => index !== -1);
        setSearchResultsIndices(matchedIndices);
        setTotalMatches(matchedIndices.length);
        setCurrentMatchIndex(matchedIndices.length > 0 ? 0 : -1);
        if (matchedIndices.length > 0 && listRef.current) {
          listRef.current.scrollToRow(matchedIndices[0], { align: 'center' });
        }
        if (!matchedIndices.length) {
          showToast('Eşleşme bulunamadı.', 'error');
        }
      }
    } catch (error) {
      console.error('Arama hatası:', error);
      showToast(`Arama sırasında bir hata oluştu: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDetail = async (index) => {
    try {
      setIsLoading(true);
      const response = await axios.get('/api/izahname/context', {
        params: { index },
      });
      setDetailResults(response.data);
      setShowDetail(true);
    } catch (error) {
      showToast(`Detay alınırken hata oluştu: ${error.message}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const nextMatch = () => {
    if (searchResultsIndices.length > 0) {
      setCurrentMatchIndex((prev) => {
        const newIndex = (prev + 1) % searchResultsIndices.length;
        if (listRef.current) {
          listRef.current.scrollToRow(searchResultsIndices[newIndex], { align: 'center' });
        }
        return newIndex;
      });
    }
  };

  const previousMatch = () => {
    if (searchResultsIndices.length > 0) {
      setCurrentMatchIndex((prev) => {
        const newIndex = (prev - 1 + searchResultsIndices.length) % searchResultsIndices.length;
        if (listRef.current) {
          listRef.current.scrollToRow(searchResultsIndices[newIndex], { align: 'center' });
        }
        return newIndex;
      });
    }
  };

  const resetState = (tabId) => {
    setActiveTab(tabId);
    setResults([]);
    setSearchResultsIndices([]);
    setQuery('');
    setShowDetail(false);
    setCurrentMatchIndex(-1);
    setTotalMatches(0);
  };

  const tabs = [
    { id: 'gtip', name: 'GTİP Arama', label: 'Aradığınız GTİP kodu veya kelimeleri girin:' },
    { id: 'izahname', name: 'İzahname Arama', label: 'Aranacak kelime veya kelimeleri girin:' },
    { id: 'tarife', name: 'Tarife Cetveli Arama', label: 'Aranacak kelime veya rakamı girin:' },
    { id: 'esya-fihristi', name: 'Eşya Fihristi', label: 'Aranacak kelime veya rakamı girin:' },
  ];

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  const rowRenderer = ({ index, key, style }) => {
    try {
      const row = results[index];
      if (!row) return null;

      const isHighlighted = searchResultsIndices[currentMatchIndex] === index;
      const isMatch = searchResultsIndices.includes(index);

      if (activeTab === 'gtip') {
        return (
          <div key={key} style={style} className={`row ${isHighlighted ? 'highlight' : ''}`}>
            <div className="cell code">{row.Kod || ''}</div>
            <div className="cell description">{row.Tanım || ''}</div>
          </div>
        );
      } else if (activeTab === 'tarife') {
        return (
          <div key={key} style={style} className={`row ${isHighlighted ? 'highlight' : isMatch ? 'match' : ''}`}>
            <div className="cell code">{row['1. Kolon'] || ''}</div>
            <div className="cell description">{row['2. Kolon'] || ''}</div>
          </div>
        );
      } else if (activeTab === 'esya-fihristi') {
        return (
          <div key={key} style={style} className={`row ${isHighlighted ? 'highlight' : isMatch ? 'match' : ''}`}>
            <div className="cell item">{row['Eşya'] || ''}</div>
            <div className="cell harmonized">{row['Armonize Sistem'] || ''}</div>
            <div className="cell notes">{row['İzahname Notları'] || ''}</div>
          </div>
        );
      }
      return null;
    } catch (err) {
      console.error('Row rendering error:', err);
      return (
        <div key={key} style={style} className="row">
          <div className="cell">Error displaying row</div>
        </div>
      );
    }
  };

  return (
    <div className="app">
      <div className="header">
        <h1>Gümrük Tarife İstatistik Pozisyonu Arama Uygulaması</h1>
      </div>

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => resetState(tab.id)}
          >
            {tab.name}
          </button>
        ))}
      </div>

      <div className="content">
        <h2>{activeTabData.name}</h2>
        <div className="search-container">
          <label>{activeTabData.label}</label>
          <div className="search">
            {['tarife', 'esya-fihristi'].includes(activeTab) && searchResultsIndices.length > 1 && (
              <button
                onClick={previousMatch}
                className="nav-button"
                disabled={searchResultsIndices.length <= 1}
                title="Önceki eşleşme"
              >
                ◄
              </button>
            )}
            <input
              ref={searchInputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && search()}
              placeholder="Arama yapın..."
            />
            <button onClick={search} disabled={isLoading}>
              {isLoading ? 'Aranıyor...' : 'Ara'}
            </button>
            {['tarife', 'esya-fihristi'].includes(activeTab) && searchResultsIndices.length > 1 && (
              <button
                onClick={nextMatch}
                className="nav-button"
                disabled={searchResultsIndices.length <= 1}
                title="Sonraki eşleşme"
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

        {isLoading && <div className="loader"></div>}

        {!isLoading && showDetail ? (
          <div className="results izahname-detail">
            <h3>İzahname Detay</h3>
            <div className="detail-container">
              {detailResults.map((result, index) => (
                <p key={index} className={result.isBold ? 'bold' : ''}>
                  {result.paragraph || ''}
                </p>
              ))}
            </div>
            <button onClick={() => setShowDetail(false)} className="back-button">
              <span>←</span> Geri Dön
            </button>
          </div>
        ) : (
          <div className="results">
            {activeTab === 'gtip' && results.length > 0 && (
              <div className="list-container">
                <div className="treeview-header">
                  <div className="header-cell code">Kod</div>
                  <div className="header-cell description">Tanım</div>
                </div>
                <List
                  ref={listRef}
                  width={Math.min(1000, window.innerWidth - 40)}
                  height={400}
                  rowCount={results.length}
                  rowHeight={30}
                  rowRenderer={rowRenderer}
                  className="virtual-list"
                />
              </div>
            )}

            {activeTab === 'izahname' && results.length > 0 && (
              <div className="izahname-results">
                {results.map((r, i) => (
                  <div key={i} className="izahname-result">
                    <p>{r.paragraph || ''}</p>
                    <button onClick={() => fetchDetail(r.index)} className="detail-button">
                      Detay...
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'tarife' && results.length > 0 && (
              <div className="list-container">
                <div className="treeview-header">
                  <div className="header-cell code">1. Kolon</div>
                  <div className="header-cell description">2. Kolon</div>
                </div>
                <List
                  ref={listRef}
                  width={Math.min(1000, window.innerWidth - 40)}
                  height={400}
                  rowCount={results.length}
                  rowHeight={30}
                  rowRenderer={rowRenderer}
                  className="virtual-list"
                  scrollToAlignment="center" // Satırları ortada göster
                />
              </div>
            )}

            {activeTab === 'esya-fihristi' && results.length > 0 && (
              <div className="list-container">
                <div className="treeview-header">
                  <div className="header-cell item">Eşya</div>
                  <div className="header-cell harmonized">Armonize Sistem</div>
                  <div className="header-cell notes">İzahname Notları</div>
                </div>
                <List
                  ref={listRef}
                  width={Math.min(1000, window.innerWidth - 40)}
                  height={400}
                  rowCount={results.length}
                  rowHeight={30}
                  rowRenderer={rowRenderer}
                  className="virtual-list"
                  scrollToAlignment="center" // Satırları ortada göster
                />
              </div>
            )}
          </div>
        )}
      </div>

      <div className="footer">
        <p>© {new Date().getFullYear()} Gümrük Tarife Arama Uygulaması</p>
      </div>
    </div>
  );
}

export default App;

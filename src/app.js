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
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  const turkceLower = (text) => {
    const turkceKarakterler = {
      'İ': 'i', 'I': 'ı', 'Ş': 'ş', 'Ğ': 'ğ',
      'Ü': 'ü', 'Ö': 'ö', 'Ç': 'ç'
    };
    let result = text || '';
    for (const [upper, lower] of Object.entries(turkceKarakterler)) {
      result = result.replace(new RegExp(upper, 'g'), lower);
    }
    return result.toLowerCase();
  };

  // Açılışta veri yükleme
  useEffect(() => {
    const loadInitialData = async () => {
      try {
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
          setResults([]); // GTİP ve İzahname açılışta boş
          console.log(`${activeTab} sekmesi açılışta boş bırakıldı`);
        }
      } catch (error) {
        console.error('Veri yüklenirken hata:', error);
      }
    };
    loadInitialData();

    // Ctrl + F ile input’a odaklanma (GTİP hariç)
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'f' && activeTab !== 'gtip') {
        e.preventDefault();
        searchInputRef.current.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab]);

  const search = async () => {
    if (!query.trim()) {
      alert('Lütfen geçerli bir kelime veya ifade girin.');
      return;
    }

    try {
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
          alert('Eşleşme bulunamadı.');
        }
      } else if (activeTab === 'izahname') {
        setResults(data);
        setSearchResultsIndices([]);
        setCurrentMatchIndex(-1);
        setShowDetail(false);
        if (!data.length) {
          alert('Eşleşme bulunamadı.');
        }
      } else if (activeTab === 'tarife' || activeTab === 'esya-fihristi') {
        // Tam veriyi koru, sadece eşleşmeleri işaretle
        const matchedIndices = results.map((row, index) => {
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
        }).filter(index => index !== -1);
        setSearchResultsIndices(matchedIndices);
        setCurrentMatchIndex(matchedIndices.length > 0 ? 0 : -1);
        setShowDetail(false);
        if (matchedIndices.length > 0 && listRef.current) {
          listRef.current.scrollToRow(matchedIndices[0]); // İlk eşleşmeye kaydır
        }
        if (!matchedIndices.length) {
          alert('Eşleşme bulunamadı.');
        }
      }
    } catch (error) {
      alert(`Arama sırasında bir hata oluştu: ${error.message}`);
    }
  };

  const fetchDetail = async (index) => {
    try {
      const response = await axios.get('/api/izahname/context', {
        params: { index },
      });
      setDetailResults(response.data);
      setShowDetail(true);
    } catch (error) {
      alert(`Detay alınırken hata oluştu: ${error.message}`);
    }
  };

  const nextMatch = () => {
    if (searchResultsIndices.length > 0) {
      setCurrentMatchIndex((prev) => {
        const newIndex = (prev + 1) % searchResultsIndices.length;
        if (listRef.current) {
          listRef.current.scrollToRow(searchResultsIndices[newIndex]);
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
          listRef.current.scrollToRow(searchResultsIndices[newIndex]);
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
  };

  const tabs = [
    { id: 'gtip', name: 'GTİP Arama', label: 'Aradığınız GTİP kodu veya kelimeleri girin:' },
    { id: 'izahname', name: 'İzahname Arama', label: 'Aranacak kelime veya kelimeleri girin:' },
    { id: 'tarife', name: 'Tarife Cetveli Arama', label: 'Aranacak kelime veya rakamı girin:' },
    { id: 'esya-fihristi', name: 'Eşya Fihristi', label: 'Aranacak kelime veya rakamı girin:' },
  ];

  const activeTabData = tabs.find((tab) => tab.id === activeTab);

  const rowRenderer = ({ index, key, style }) => {
    const row = results[index];
    const isHighlighted = searchResultsIndices[currentMatchIndex] === index;
    if (activeTab === 'gtip') {
      return (
        <div key={key} style={style} className={`row ${isHighlighted ? 'highlight' : ''}`}>
          <div style={{ width: '100px' }}>{row.Kod || ''}</div>
          <div style={{ width: '900px' }}>{row.Tanım || ''}</div>
        </div>
      );
    } else if (activeTab === 'tarife') {
      return (
        <div key={key} style={style} className={`row ${isHighlighted ? 'highlight' : ''}`}>
          <div style={{ width: '100px' }}>{row['1. Kolon'] || ''}</div>
          <div style={{ width: '900px' }}>{row['2. Kolon'] || ''}</div>
        </div>
      );
    } else if (activeTab === 'esya-fihristi') {
      return (
        <div key={key} style={style} className={`row ${isHighlighted ? 'highlight' : ''}`}>
          <div style={{ width: '800px' }}>{row['Eşya'] || ''}</div>
          <div style={{ width: '200px' }}>{row['Armonize Sistem'] || ''}</div>
          <div style={{ width: '200px' }}>{row['İzahname Notları'] || ''}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="app">
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
        <h1>{activeTabData.name}</h1>
        <label>{activeTabData.label}</label>
        <div className="search">
          <input
            ref={searchInputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && search()}
            placeholder={activeTab === 'gtip' ? 'Arama yapın...' : 'Arama yapın (Ctrl + F ile odaklan)'}
          />
          <button onClick={search}>Ara</button>
        </div>

        {['tarife', 'esya-fihristi'].includes(activeTab) && searchResultsIndices.length > 0 && (
          <div className="nav-buttons">
            <button onClick={previousMatch}>◄</button>
            <button onClick={nextMatch}>►</button>
          </div>
        )}

        {showDetail ? (
          <div className="results">
            <h2>İzahname Detay</h2>
            {detailResults.map((result, index) => (
              <p key={index} className={result.isBold ? 'bold' : ''}>
                {result.paragraph || ''}
              </p>
            ))}
            <button onClick={() => setShowDetail(false)}>Geri Dön</button>
          </div>
        ) : (
          <div className="results">
            {activeTab === 'gtip' && results.length > 0 && (
              <div>
                <div className="treeview-header">
                  <div style={{ width: '100px' }}>Kod</div>
                  <div style={{ width: '900px' }}>Tanım</div>
                </div>
                <List
                  width={1000}
                  height={400}
                  rowCount={results.length}
                  rowHeight={25}
                  rowRenderer={rowRenderer}
                />
              </div>
            )}

            {activeTab === 'izahname' && results.length > 0 && (
              <div className="izahname-results">
                {results.map((r, i) => (
                  <div key={i} className="izahname-result">
                    {r.paragraph || ''}{' '}
                    <span className="detail-link" onClick={() => fetchDetail(r.index)}>
                      Detay...
                    </span>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'tarife' && results.length > 0 && (
              <div>
                <div className="treeview-header">
                  <div style={{ width: '100px' }}>1. Kolon</div>
                  <div style={{ width: '900px' }}>2. Kolon</div>
                </div>
                <List
                  ref={listRef}
                  width={1000}
                  height={400}
                  rowCount={results.length}
                  rowHeight={25}
                  rowRenderer={rowRenderer}
                />
              </div>
            )}

            {activeTab === 'esya-fihristi' && results.length > 0 && (
              <div>
                <div className="treeview-header">
                  <div style={{ width: '800px' }}>Eşya</div>
                  <div style={{ width: '200px' }}>Armonize Sistem</div>
                  <div style={{ width: '200px' }}>İzahname Notları</div>
                </div>
                <List
                  ref={listRef}
                  width={1200}
                  height={400}
                  rowCount={results.length}
                  rowHeight={25}
                  rowRenderer={rowRenderer}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

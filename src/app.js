import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('gtip');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searchResultsIndices, setSearchResultsIndices] = useState([]);
  const [detailResults, setDetailResults] = useState([]);
  const [showDetail, setShowDetail] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  // Türkçe lowercase dönüşümü
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
        if (activeTab === 'gtip') {
          response = await axios.get('/api/gtip/search', { params: { query: '' } });
        } else if (activeTab === 'izahname') {
          response = await axios.get('/api/izahname/search', { params: { query: '' } });
        } else if (activeTab === 'tarife') {
          response = await axios.get('/api/tarife/search', { params: { query: '' } });
        } else if (activeTab === 'esya-fihristi') {
          response = await axios.get('/api/esya-fihristi/search', { params: { query: '' } });
        }
        setResults(response.data);
        setSearchResultsIndices([]);
        setCurrentMatchIndex(-1);
      } catch (error) {
        console.error('Veri yüklenirken hata:', error);
      }
    };
    loadInitialData();
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
      console.log('Backend verisi:', data);

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
      } else if (activeTab === 'tarife') {
        const searchText = turkceLower(query.trim());
        const matchedIndices = [];
        data.forEach((row, index) => {
          const col1 = turkceLower(row.col1 || '');
          const col2 = turkceLower(row.col2 || '');
          if (col1.includes(searchText) || col2.includes(searchText)) {
            matchedIndices.push(index);
          }
        });
        setResults(data);
        setSearchResultsIndices(matchedIndices);
        setCurrentMatchIndex(matchedIndices.length > 0 ? 0 : -1);
        setShowDetail(false);
        if (!matchedIndices.length) {
          alert('Eşleşme bulunamadı.');
        }
      } else if (activeTab === 'esya-fihristi') {
        const searchText = turkceLower(query.trim());
        const matchedIndices = [];
        data.forEach((row, index) => {
          const esya = turkceLower(row.esya || '');
          const armonize = turkceLower(row.armonize || '');
          const notlar = turkceLower(row.notlar || '');
          if (esya.includes(searchText) || armonize.includes(searchText) || notlar.includes(searchText)) {
            matchedIndices.push(index);
          }
        });
        setResults(data);
        setSearchResultsIndices(matchedIndices);
        setCurrentMatchIndex(matchedIndices.length > 0 ? 0 : -1);
        setShowDetail(false);
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
      alert(`Detay alınırken bir hata oluştu: ${error.message}`);
    }
  };

  const nextMatch = () => {
    if (searchResultsIndices.length > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % searchResultsIndices.length);
    }
  };

  const previousMatch = () => {
    if (searchResultsIndices.length > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + searchResultsIndices.length) % searchResultsIndices.length);
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
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && search()}
            placeholder="Arama yapın..."
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
                {result.paragraph}
              </p>
            ))}
            <button onClick={() => setShowDetail(false)}>Geri Dön</button>
          </div>
        ) : (
          <div className="results">
            {activeTab === 'gtip' && results.length > 0 && (
              <table className="treeview">
                <thead>
                  <tr>
                    <th>Kod</th>
                    <th>Tanım</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i}>
                      <td>{r.Kod || ''}</td>
                      <td>{r.Tanım || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
              <table className="treeview">
                <thead>
                  <tr>
                    <th>1. Kolon</th>
                    <th>2. Kolon</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr
                      key={i}
                      className={searchResultsIndices[currentMatchIndex] === i ? 'highlight' : ''}
                    >
                      <td>{r.col1 || ''}</td>
                      <td>{r.col2 || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'esya-fihristi' && results.length > 0 && (
              <table className="treeview">
                <thead>
                  <tr>
                    <th>Eşya</th>
                    <th>Armonize Sistem</th>
                    <th>İzahname Notları</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr
                      key={i}
                      className={searchResultsIndices[currentMatchIndex] === i ? 'highlight' : ''}
                    >
                      <td>{r.esya || ''}</td>
                      <td>{r.armonize || ''}</td>
                      <td>{r.notlar || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

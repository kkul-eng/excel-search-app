import React, { useState } from 'react';
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

  // Turkish lowercase conversion
  const turkceLower = (text) => {
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

  // Arama fonksiyonu
  const search = async () => {
    if (!query.trim()) {
      alert('Lütfen bir arama terimi girin.');
      return;
    }
    try {
      const response = await axios.get(`https://excel-search-app-6.onrender.com/api/${activeTab}/search`, {
        params: { query },
      });
      const data = response.data;

      if (activeTab === 'gtip') {
        const searchText = turkceLower(query.trim());
        const filteredResults = data.filter(row => {
          if (/^\d+$/.test(searchText)) {
            return row.Kod.startsWith(searchText);
          } else {
            const keywords = searchText.split(' ');
            const description = turkceLower(row.Tanım);
            return keywords.every(keyword => description.includes(keyword));
          }
        });
        setResults(filteredResults);
        setSearchResultsIndices([]);
        setCurrentMatchIndex(-1);
        setShowDetail(false);
      } else if (activeTab === 'izahname') {
        const searchText = turkceLower(query.trim());
        const keywords = searchText.split(' ');
        const filteredResults = data.filter(row => {
          const paragraph = turkceLower(row.paragraph);
          return keywords.every(keyword => paragraph.includes(keyword));
        });
        setResults(filteredResults);
        setSearchResultsIndices([]);
        setCurrentMatchIndex(-1);
        setShowDetail(false);
      } else if (activeTab === 'tarife') {
        const searchText = turkceLower(query.trim());
        const matchedIndices = data.reduce((acc, row, index) => {
          const col1 = turkceLower(row.col1 || '');
          const col2 = turkceLower(row.col2 || '');
          if (col1.includes(searchText) || col2.includes(searchText)) {
            acc.push(index);
          }
          return acc;
        }, []);
        setResults(data);
        setSearchResultsIndices(matchedIndices);
        setCurrentMatchIndex(matchedIndices.length > 0 ? 0 : -1);
        setShowDetail(false);
      } else if (activeTab === 'esya-fihristi') {
        const searchText = turkceLower(query.trim());
        const matchedIndices = data.reduce((acc, row, index) => {
          const esya = turkceLower(row.esya || '');
          const armonize = turkceLower(row.armonize || '');
          const notlar = turkceLower(row.notlar || '');
          if (esya.includes(searchText) || armonize.includes(searchText) || notlar.includes(searchText)) {
            acc.push(index);
          }
          return acc;
        }, []);
        setResults(data);
        setSearchResultsIndices(matchedIndices);
        setCurrentMatchIndex(matchedIndices.length > 0 ? 0 : -1);
        setShowDetail(false);
      }
    } catch (error) {
      console.error('Arama hatası:', error);
      alert('Arama sırasında bir hata oluştu.');
    }
  };

  // Detay verisini çekme
  const fetchDetail = async (index) => {
    try {
      const response = await axios.get('https://excel-search-app-6.onrender.com/api/izahname/context', {
        params: { index },
      });
      setDetailResults(response.data);
      setShowDetail(true);
    } catch (error) {
      console.error('Detay hatası:', error);
    }
  };

  // Navigation fonksiyonları
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

  // Sekme değiştirme
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
                      <td>{r.Kod}</td>
                      <td>{r.Tanım}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'izahname' && results.length > 0 && (
              <div className="izahname-results">
                {results.map((r, i) => (
                  <div key={i} className="izahname-result">
                    {r.paragraph}{' '}
                    <span className="detail-link" onClick={() => fetchDetail(r.index)}>
                      Detay...
                    </span>
                  </div>
                ))}
              </div>
            )}

            {['tarife', 'esya-fihristi'].includes(activeTab) && results.length > 0 && (
              <table className="treeview">
                <thead>
                  <tr>
                    <th>{activeTab === 'tarife' ? '1. Kolon' : 'Eşya'}</th>
                    <th>{activeTab === 'tarife' ? '2. Kolon' : 'Armonize Sistem'}</th>
                    {activeTab === 'esya-fihristi' && <th>İzahname Notları</th>}
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr
                      key={i}
                      className={searchResultsIndices[currentMatchIndex] === i ? 'highlight' : ''}
                    >
                      <td>{r.col1 || r.esya}</td>
                      <td>{r.col2 || r.armonize}</td>
                      {activeTab === 'esya-fihristi' && <td>{r.notlar}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {(results.length === 0 || (['tarife', 'esya-fihristi'].includes(activeTab) && searchResultsIndices.length === 0)) && query && (
              <p>Eşleşme bulunamadı.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
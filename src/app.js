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
        const searchText = (query.trim() || '').toLowerCase();
        const keywords = searchText.split(' ');
        const filteredResults = data.filter(row => {
          const paragraph = (row.paragraph || '').toLowerCase();
          return keywords.every(keyword => paragraph.includes(keyword));
        }).map(row => ({
          index: row.index,
          paragraph: row.paragraph
        }));
        setResults(filteredResults);
        setSearchResultsIndices([]);
        setCurrentMatchIndex(-1);
        setShowDetail(false);
        if (!filteredResults.length) {
          alert('Eşleşme bulunamadı.');
        }
      } else if (activeTab === 'tarife') {
        const searchText = (query.trim() || '').toLowerCase();
        const matchedIndices = [];
        data.forEach((row, index) => {
          const col1 = (row.col1 || '').toLowerCase();
          const col2 = (row.col2 || '').toLowerCase();
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
        const searchText = (query.trim() || '').toLowerCase();
        const matchedIndices = [];
        data.forEach((row, index) => {
          const esya = (row.esya || '').toLowerCase();
          const armonize = (row.armonize || '').toLowerCase();
          const notlar = (row.notlar || '').toLowerCase();
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
        <p style={{ color: 'red', textAlign: 'center' }}>Güncelleme Testi: 24 Şubat 2025</p>
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
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('gtip');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [detailResults, setDetailResults] = useState([]);
  const [showDetail, setShowDetail] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  const search = async (endpoint) => {
    try {
      const response = await axios.get(`/api/${endpoint}/search`, { params: { query } });
      setResults(response.data);
      setCurrentMatchIndex(endpoint === 'tarife' || endpoint === 'esya-fihristi' ? 0 : -1);
      setShowDetail(false);
    } catch (error) {
      console.error('Arama hatası:', error);
    }
  };

  const fetchDetail = async (index) => {
    try {
      const response = await axios.get('/api/izahname/context', { params: { index } });
      setDetailResults(response.data);
      setShowDetail(true);
    } catch (error) {
      console.error('Detay hatası:', error);
    }
  };

  const nextMatch = () => {
    if (results.length > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % results.length);
    }
  };

  const previousMatch = () => {
    if (results.length > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + results.length) % results.length);
    }
  };

  const tabs = [
    { id: 'gtip', name: 'GTİP Arama', endpoint: 'gtip', label: 'Aradığınız GTİP kodu veya kısaltılmış kelimeleri girin:' },
    { id: 'izahname', name: 'İzahname Arama', endpoint: 'izahname', label: 'Aranacak kelime veya kelimeleri girin:' },
    { id: 'tarife', name: 'Tarife Cetveli Arama', endpoint: 'tarife', label: 'Aranacak kelime veya rakamı girin:' },
    { id: 'esya-fihristi', name: 'Eşya Fihristi', endpoint: 'esya-fihristi', label: 'Aranacak kelime veya rakamı girin:' },
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="app">
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => { setActiveTab(tab.id); setResults([]); setQuery(''); setShowDetail(false); setCurrentMatchIndex(-1); }}
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
            onKeyPress={(e) => e.key === 'Enter' && search(activeTabData.endpoint)}
            placeholder="Arama yapın..."
          />
          <button onClick={() => search(activeTabData.endpoint)}>Ara</button>
        </div>
        {(activeTab === 'tarife' || activeTab === 'esya-fihristi') && results.length > 0 && (
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
            {activeTab === 'gtip' && (
              <table className="treeview">
                <thead>
                  <tr><th>Kod</th><th>Tanım</th></tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i}><td>{r.Kod}</td><td>{r.Tanım}</td></tr>
                  ))}
                </tbody>
              </table>
            )}
            {activeTab === 'izahname' && (
              <div className="izahname-results">
                {results.map((r, i) => (
                  <div key={i} className="izahname-result">
                    <p>{r.paragraph} <span className="detail-link" onClick={() => fetchDetail(r.index)}>Detay...</span></p>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'tarife' && (
              <table className="treeview">
                <thead>
                  <tr><th>1. Kolon</th><th>2. Kolon</th></tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className={i === currentMatchIndex ? 'highlight' : ''}>
                      <td>{r.col1}</td><td>{r.col2}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {activeTab === 'esya-fihristi' && (
              <table className="treeview">
                <thead>
                  <tr><th>Eşya</th><th>Armonize Sistem</th><th>İzahname Notları</th></tr>
                </thead>
                <tbody>
                  {results.map((r, i) => (
                    <tr key={i} className={i === currentMatchIndex ? 'highlight' : ''}>
                      <td>{r.esya}</td><td>{r.armonize}</td><td>{r.notlar}</td>
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
import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('gtip');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [detailResults, setDetailResults] = useState([]);
  const [showDetail, setShowDetail] = useState(false);

  const search = async (endpoint) => {
    try {
      const response = await axios.get(`/api/${endpoint}/search`, { params: { query } });
      setResults(response.data);
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

  const tabs = [
    { id: 'gtip', name: 'GTİP Arama', endpoint: 'gtip' },
    { id: 'izahname', name: 'İzahname Arama', endpoint: 'izahname' },
    { id: 'tarife', name: 'Tarife Cetveli', endpoint: 'tarife' },
    { id: 'esya-fihristi', name: 'Eşya Fihristi', endpoint: 'esya-fihristi' },
  ];

  return (
    <div className="app">
      <h1>Arama Uygulaması</h1>
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => { setActiveTab(tab.id); setResults([]); setQuery(''); setShowDetail(false); }}
          >
            {tab.name}
          </button>
        ))}
      </div>
      <div className="search">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && search(tabs.find(t => t.id === activeTab).endpoint)}
          placeholder="Arama yapın..."
        />
        <button onClick={() => search(tabs.find(t => t.id === activeTab).endpoint)}>Ara</button>
      </div>
      {showDetail ? (
        <div className="results">
          <h2>İzahname Detay</h2>
          {detailResults.map((result, index) => (
            <p key={index} style={result.isBold ? { fontWeight: 'bold' } : {}}>
              {result.paragraph}
            </p>
          ))}
          <button onClick={() => setShowDetail(false)}>Geri Dön</button>
        </div>
      ) : (
        <div className="results">
          {activeTab === 'gtip' && (
            <table>
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
            <div>
              {results.map((r, i) => (
                <div key={i}>
                  <p>{r.paragraph} <span className="detail-link" onClick={() => fetchDetail(r.index)}>Detay...</span></p>
                </div>
              ))}
            </div>
          )}
          {activeTab === 'tarife' && (
            <table>
              <thead>
                <tr><th>1. Kolon</th><th>2. Kolon</th></tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}><td>{r.col1}</td><td>{r.col2}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          {activeTab === 'esya-fihristi' && (
            <table>
              <thead>
                <tr><th>Eşya</th><th>Armonize Sistem</th><th>İzahname Notları</th></tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}><td>{r.esya}</td><td>{r.armonize}</td><td>{r.notlar}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
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

  // Arama fonksiyonu (Tek bir fonksiyon üzerinden API çağrıları)
  const search = async () => {
    if (!query) return;
    try {
      const response = await axios.get(`/api/${activeTab}/search`, { params: { query } });
      setResults(response.data);
      setCurrentMatchIndex(['tarife', 'esya-fihristi'].includes(activeTab) ? 0 : -1);
      setShowDetail(false);
    } catch (error) {
      console.error('Arama hatası:', error);
    }
  };

  // Detay verisini çekme fonksiyonu
  const fetchDetail = async (index) => {
    try {
      const response = await axios.get('/api/izahname/context', { params: { index } });
      setDetailResults(response.data);
      setShowDetail(true);
    } catch (error) {
      console.error('Detay hatası:', error);
    }
  };

  // Bir sonraki eşleşmeye geçme
  const nextMatch = () => {
    if (results.length > 0) {
      setCurrentMatchIndex((prev) => (prev + 1) % results.length);
    }
  };

  // Önceki eşleşmeye dönme
  const previousMatch = () => {
    if (results.length > 0) {
      setCurrentMatchIndex((prev) => (prev - 1 + results.length) % results.length);
    }
  };

  // Sekme değiştirildiğinde state'i sıfırlayan fonksiyon
  const resetState = (tabId) => {
    setActiveTab(tabId);
    setResults([]);
    setQuery('');
    setShowDetail(false);
    setCurrentMatchIndex(-1);
  };

  // Sekme bilgileri
  const tabs = [
    { id: 'gtip', name: 'GTİP Arama', label: 'Aradığınız GTİP kodu veya kelimeleri girin:' },
    { id: 'izahname', name: 'İzahname Arama', label: 'Aranacak kelime veya kelimeleri girin:' },
    { id: 'tarife', name: 'Tarife Cetveli Arama', label: 'Aranacak kelime veya rakamı girin:' },
    { id: 'esya-fihristi', name: 'Eşya Fihristi', label: 'Aranacak kelime veya rakamı girin:' },
  ];

  const activeTabData = tabs.find(tab => tab.id === activeTab);

  return (
    <div className="app">
      {/* Sekme Seçenekleri */}
      <div className="tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => resetState(tab.id)}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* İçerik Bölümü */}
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

        {/* Önceki / Sonraki Butonları (Tarife & Eşya için) */}
        {['tarife', 'esya-fihristi'].includes(activeTab) && results.length > 0 && (
          <div className="nav-buttons">
            <button onClick={previousMatch}>◄</button>
            <button onClick={nextMatch}>►</button>
          </div>
        )}

        {/* Detay Görünümü */}
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
            {/* GTİP Tablosu */}
            {activeTab === 'gtip' && (
              <table className="treeview">
                <thead><tr><th>Kod</th><th>Tanım</th></tr></thead>
                <tbody>{results.map((r, i) => <tr key={i}><td>{r.Kod}</td><td>{r.Tanım}</td></tr>)}</tbody>
              </table>
            )}

            {/* İzahname Sonuçları */}
            {activeTab === 'izahname' && results.map((r, i) => (
              <p key={i} onClick={() => fetchDetail(r.index)}>{r.paragraph} <span className="detail-link">Detay...</span></p>
            ))}

            {/* Tarife & Eşya Tablosu */}
            {['tarife', 'esya-fihristi'].includes(activeTab) && (
              <table className="treeview">
                <thead><tr><th>1. Kolon</th><th>2. Kolon</th></tr></thead>
                <tbody>{results.map((r, i) => <tr key={i} className={i === currentMatchIndex ? 'highlight' : ''}><td>{r.col1}</td><td>{r.col2}</td></tr>)}</tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

const express = require('express');
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');
const app = express();

// React build dosyalarını sun
const buildPath = path.join(__dirname, 'build');
console.log('Build dosyaları aranacak yol:', buildPath);
app.use(express.static(buildPath));

// Excel dosyalarını bir kez oku ve önbellekte tut
let gtipData, izahnameData, tarifeData, esyaFihristiData;
try {
  gtipData = XLSX.utils.sheet_to_json(XLSX.readFile('gtip.xls').Sheets[XLSX.readFile('gtip.xls').SheetNames[0]]);
  console.log('gtipData yüklendi:', gtipData.length, 'satır');
  izahnameData = XLSX.utils.sheet_to_json(XLSX.readFile('izahname.xlsx').Sheets[XLSX.readFile('izahname.xlsx').SheetNames[0]]);
  console.log('izahnameData yüklendi:', izahnameData.length, 'satır');
  tarifeData = XLSX.utils.sheet_to_json(XLSX.readFile('index.xlsx').Sheets[XLSX.readFile('index.xlsx').SheetNames[0]], { defval: '' });
  console.log('tarifeData yüklendi:', tarifeData.length, 'satır');
  esyaFihristiData = XLSX.utils.sheet_to_json(XLSX.readFile('alfabetik_fihrist.xlsx').Sheets[XLSX.readFile('alfabetik_fihrist.xlsx').SheetNames[0]], { defval: '' });
  console.log('esyaFihristiData yüklendi:', esyaFihristiData.length, 'satır');
} catch (error) {
  console.error('Excel dosyaları yüklenirken hata:', error);
}

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

// Tkinter'daki kelime_arama mantığı
const kelimeArama = (data, searchText, columns) => {
  if (!searchText) return []; // Boşsa veri döndürme
  if (/^\d+$/.test(searchText)) {
    return data.filter(row => String(row[columns[0]] || '').startsWith(searchText));
  } else {
    const searchKeywords = searchText.split(' ');
    return data.filter(row => {
      const text = columns.map(col => turkceLower(row[col] || '')).join(' ');
      return searchKeywords.every(keyword => text.includes(keyword));
    });
  }
};

// GTİP arama endpoint’i
app.get('/api/gtip/search', (req, res) => {
  const query = turkceLower(req.query.query || '');
  const results = kelimeArama(gtipData, query, ['Kod', 'Tanım']);
  res.json(results);
});

// İzahname arama endpoint’i
app.get('/api/izahname/search', (req, res) => {
  const query = turkceLower(req.query.query || '');
  const results = kelimeArama(izahnameData, query, ['paragraf']);
  res.json(results.map(row => ({
    index: row.index,
    paragraph: row.paragraf || ''
  })));
});

// İzahname detay endpoint’i
app.get('/api/izahname/context', (req, res) => {
  const index = parseInt(req.query.index, 10);
  const actualIndex = izahnameData.findIndex(row => row.index === index);
  if (actualIndex === -1) {
    res.status(404).json({ error: 'Index bulunamadı' });
    return;
  }

  const startIndex = Math.max(0, actualIndex - 25);
  const endIndex = Math.min(izahnameData.length - 1, actualIndex + 25);
  const context = izahnameData.slice(startIndex, endIndex + 1).map(row => ({
    paragraph: row.paragraf || '',
    isBold: row.index === index
  }));

  res.json(context);
});

// Tarife tüm veri endpoint’i
app.get('/api/tarife/all', (req, res) => {
  console.log('Tarife tüm veri isteği alındı, satır sayısı:', tarifeData.length);
  res.json(tarifeData);
});

// Tarife arama endpoint’i
app.get('/api/tarife/search', (req, res) => {
  const query = turkceLower(req.query.query || '');
  const results = kelimeArama(tarifeData, query, ['col1', 'col2']);
  res.json(results);
});

// Eşya Fihristi tüm veri endpoint’i
app.get('/api/esya-fihristi/all', (req, res) => {
  console.log('Eşya Fihristi tüm veri isteği alındı, satır sayısı:', esyaFihristiData.length);
  res.json(esyaFihristiData);
});

// Eşya Fihristi arama endpoint’i
app.get('/api/esya-fihristi/search', (req, res) => {
  const query = turkceLower(req.query.query || '');
  const results = kelimeArama(esyaFihristiData, query, ['esya', 'armonize', 'notlar']);
  res.json(results);
});

// Tüm diğer istekleri React’a yönlendir
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'build', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.error('index.html gönderilirken hata:', err);
      res.status(500).send('Sunucu hatası');
    }
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const express = require('express');
const path = require('path');
const XLSX = require('xlsx');
const fs = require('fs');
const app = express();

// React build dosyalarını sun
const buildPath = path.resolve(__dirname, 'build');
console.log('Build dosyaları aranacak yol:', buildPath);
app.use(express.static(buildPath));

// İzahname.txt dosyasının yolu
const izahnameTextPath = path.resolve(__dirname, 'izahname.txt');
console.log('İzahname.txt dosya yolu:', izahnameTextPath);

// Excel dosyalarını bir kez oku ve önbellekte tut
let gtipData, izahnameData, tarifeData, esyaFihristiData, izahnameText;
try {
  gtipData = XLSX.utils.sheet_to_json(XLSX.readFile('gtip.xls').Sheets[XLSX.readFile('gtip.xls').SheetNames[0]], { defval: '' });
  console.log('gtipData yüklendi:', gtipData.length, 'satır, sütunlar:', Object.keys(gtipData[0] || {}));
  izahnameData = XLSX.utils.sheet_to_json(XLSX.readFile('izahname.xlsx').Sheets[XLSX.readFile('izahname.xlsx').SheetNames[0]], { defval: '' });
  console.log('izahnameData yüklendi:', izahnameData.length, 'satır, sütunlar:', Object.keys(izahnameData[0] || {}));
  tarifeData = XLSX.utils.sheet_to_json(XLSX.readFile('index.xlsx').Sheets[XLSX.readFile('index.xlsx').SheetNames[0]], { defval: '' });
  console.log('tarifeData yüklendi:', tarifeData.length, 'satır, sütunlar:', Object.keys(tarifeData[0] || {}));
  esyaFihristiData = XLSX.utils.sheet_to_json(XLSX.readFile('alfabetik_fihrist.xlsx').Sheets[XLSX.readFile('alfabetik_fihrist.xlsx').SheetNames[0]], { defval: '' });
  console.log('esyaFihristiData yüklendi:', esyaFihristiData.length, 'satır, sütunlar:', Object.keys(esyaFihristiData[0] || {}));
  
  // İzahname.txt dosyasını oku (varsa)
  if (fs.existsSync(izahnameTextPath)) {
    izahnameText = fs.readFileSync(izahnameTextPath, 'utf8');
    console.log('izahnameText yüklendi:', Math.floor(izahnameText.length / 1024), 'KB');
  } else {
    console.log('izahnameText bulunamadı, bu dosya yapay zeka soruları için gerekli olabilir.');
    izahnameText = '';
  }
} catch (error) {
  console.error('Excel dosyaları yüklenirken hata:', error);
}

// Türkçe lowercase dönüşümü
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

// Tkinter'daki kelime_arama mantığı
const kelimeArama = (data, searchText, columns) => {
  if (!searchText) return data; // Boşsa tüm veriyi dön
  if (!data || !Array.isArray(data)) {
    console.error('Geçersiz veri:', data);
    return [];
  }
  if (/^\d+$/.test(searchText)) {
    return data.filter(row => {
      const value = row[columns[0]];
      return value !== undefined && value !== null && String(value).startsWith(searchText);
    });
  } else {
    const searchKeywords = searchText.split(' ');
    return data.filter(row => {
      try {
        const text = columns.map(col => {
          const value = row[col];
          return value !== undefined && value !== null ? turkceLower(value) : '';
        }).join(' ');
        return searchKeywords.every(keyword => text.includes(keyword));
      } catch (err) {
        console.error('Kelime arama hatası, satır:', row, 'hata:', err);
        return false;
      }
    });
  }
};

// GTİP arama endpoint'i
app.get('/api/gtip/search', (req, res) => {
  const query = turkceLower(req.query.query || '');
  console.log('GTİP arama sorgusu:', query);
  try {
    const results = kelimeArama(gtipData, query, ['Kod', 'Tanım']);
    console.log('GTİP arama sonuçları:', results.length);
    res.json(results);
  } catch (error) {
    console.error('GTİP arama hatası:', error);
    res.status(500).json({ error: 'Arama sırasında bir hata oluştu: ' + error.message });
  }
});

// İzahname arama endpoint'i
app.get('/api/izahname/search', (req, res) => {
  const query = turkceLower(req.query.query || '');
  console.log('İzahname arama sorgusu:', query);
  try {
    const results = kelimeArama(izahnameData, query, ['paragraf']);
    console.log('İzahname arama sonuçları:', results.length);
    res.json(results.map(row => ({
      index: row.index,
      paragraph: row.paragraf || ''
    })));
  } catch (error) {
    console.error('İzahname arama hatası:', error);
    res.status(500).json({ error: 'Arama sırasında bir hata oluştu: ' + error.message });
  }
});

// İzahname detay endpoint'i
app.get('/api/izahname/context', (req, res) => {
  const index = parseInt(req.query.index, 10);
  console.log('İzahname detay sorgusu, index:', index);
  try {
    const actualIndex = izahnameData.findIndex(row => row.index === index);
    if (actualIndex === -1) {
      console.log('İzahname index bulunamadı:', index);
      res.status(404).json({ error: 'Index bulunamadı' });
      return;
    }

    const startIndex = Math.max(0, actualIndex - 25);
    const endIndex = Math.min(izahnameData.length - 1, actualIndex + 25);
    const context = izahnameData.slice(startIndex, endIndex + 1).map(row => ({
      paragraph: row.paragraf || '',
      isBold: row.index === index
    }));

    console.log('İzahname detay sonuçları:', context.length);
    res.json(context);
  } catch (error) {
    console.error('İzahname detay hatası:', error);
    res.status(500).json({ error: 'Detay alınırken hata oluştu: ' + error.message });
  }
});

// Tarife tüm veri endpoint'i
app.get('/api/tarife/all', (req, res) => {
  console.log('Tarife tüm veri isteği alındı, satır sayısı:', tarifeData?.length || 0);
  try {
    if (!tarifeData) throw new Error('Tarife verisi yüklenmedi');
    res.json(tarifeData);
  } catch (error) {
    console.error('Tarife tüm veri hatası:', error);
    res.status(500).json({ error: 'Veri gönderilirken hata oluştu: ' + error.message });
  }
});

// Tarife arama endpoint'i
app.get('/api/tarife/search', (req, res) => {
  const query = turkceLower(req.query.query || '');
  console.log('Tarife arama sorgusu:', query);
  try {
    const results = kelimeArama(tarifeData, query, ['1. Kolon', '2. Kolon']);
    console.log('Tarife arama sonuçları:', results.length);
    res.json(results);
  } catch (error) {
    console.error('Tarife arama hatası:', error);
    res.status(500).json({ error: 'Arama sırasında bir hata oluştu: ' + error.message });
  }
});

// Eşya Fihristi tüm veri endpoint'i
app.get('/api/esya-fihristi/all', (req, res) => {
  console.log('Eşya Fihristi tüm veri isteği alındı, satır sayısı:', esyaFihristiData?.length || 0);
  try {
    if (!esyaFihristiData) throw new Error('Eşya Fihristi verisi yüklenmedi');
    res.json(esyaFihristiData);
  } catch (error) {
    console.error('Eşya Fihristi tüm veri hatası:', error);
    res.status(500).json({ error: 'Veri gönderilirken hata oluştu: ' + error.message });
  }
});

// Eşya Fihristi arama endpoint'i
app.get('/api/esya-fihristi/search', (req, res) => {
  const query = turkceLower(req.query.query || '');
  console.log('Eşya Fihristi arama sorgusu:', query);
  try {
    if (!esyaFihristiData) throw new Error('Eşya Fihristi verisi yüklenmedi');
    const results = kelimeArama(esyaFihristiData, query, ['Eşya', 'Armonize Sistem', 'İzahname Notları']);
    console.log('Eşya Fihristi arama sonuçları:', results.length);
    res.json(results);
  } catch (error) {
    console.error('Eşya Fihristi arama hatası:', error);
    res.status(500).json({ error: 'Arama sırasında bir hata oluştu: ' + error.message });
  }
});

// İzahname.txt alma endpoint'i - Yapay Zeka için
app.get('/api/izahname-text', (req, res) => {
  console.log('İzahname.txt isteği alındı');
  try {
    if (!izahnameText) {
      console.log('İzahname.txt verisi bulunamadı');
      res.status(404).json({ error: 'İzahname.txt dosyası bulunamadı' });
      return;
    }
    
    res.json({ content: izahnameText });
  } catch (error) {
    console.error('İzahname.txt gönderme hatası:', error);
    res.status(500).json({ error: 'Veri gönderilirken hata oluştu: ' + error.message });
  }
});

// Tüm diğer istekleri React'a yönlendir
app.get('*', (req, res) => {
  const indexPath = path.resolve(__dirname, 'build', 'index.html');
  console.log('index.html gönderiliyor, yol:', indexPath);
  fs.access(indexPath, fs.constants.F_OK, (err) => {
    if (err) {
      console.error('index.html bulunamadı:', err);
      res.status(500).send('Sunucu hatası: index.html bulunamadı. Build işlemi doğru çalışmamış olabilir.');
      return;
    }
    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('index.html gönderilirken hata:', err);
        res.status(500).send('Sunucu hatası');
      }
    });
  });
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

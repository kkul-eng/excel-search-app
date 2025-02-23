import express from 'express';
import XLSX from 'xlsx';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public'))); // Doğru yol tanımı

// Türkçe karakter dönüşümü
const turkceLower = (text) => {
  const turkceKarakterler = {
    'İ': 'i', 'I': 'ı', 'Ş': 'ş', 'Ğ': 'ğ', 'Ü': 'ü', 'Ö': 'ö', 'Ç': 'ç'
  };
  let result = text;
  for (const [buyuk, kucuk] of Object.entries(turkceKarakterler)) {
    result = result.replace(new RegExp(buyuk, 'g'), kucuk);
  }
  return result.toLowerCase();
};

// Excel dosyasını yükleme fonksiyonu
const loadExcel = (filePath) => {
  try {
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);
    console.log(`Dosya yüklendi: ${filePath}, İlk satır:`, data[0]);
    return data;
  } catch (error) {
    console.error(`Hata: ${filePath} yüklenemedi`, error);
    return [];
  }
};

// Arama fonksiyonu
const kelime_arama = (data, searchText) => {
  const results = [];
  if (!searchText) return results;

  const searchKeywords = turkceLower(searchText).split(' ');
  if (searchText.match(/^\d+$/)) {
    data.forEach(row => {
      const kod = String(row.Kod || '');
      if (kod.startsWith(searchText)) {
        results.push({ Kod: row.Kod, Tanım: row.Tanım });
      }
    });
  } else {
    data.forEach(row => {
      const description = turkceLower(String(row.Tanım || row.paragraf || row['2. Kolon'] || row.Eşya || ''));
      if (searchKeywords.every(keyword => description.includes(keyword))) {
        results.push(row);
      }
    });
  }
  return results;
};

// Excel dosyalarını yükle
const gtipData = loadExcel(path.join(__dirname, 'gtip.xls'));
const izahnameData = loadExcel(path.join(__dirname, 'izahname.xlsx'));
const tarifeData = loadExcel(path.join(__dirname, 'index.xlsx'));
const esyaFihristiData = loadExcel(path.join(__dirname, 'alfabetik_fihrist.xlsx'));

// GTİP Arama
app.get('/api/gtip/search', (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Arama metni gereklidir' });
  
  // Hata ayıklama için konsola yazdırma
  console.log('Arama metni:', query);
  console.log('GTİP verisi:', gtipData);

  const results = kelime_arama(gtipData, query);
  res.json(results);
});

// İzahname Arama
app.get('/api/izahname/search', (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Arama metni gereklidir' });

  console.log('Arama metni:', query);
  console.log('İzahname verisi:', izahnameData);

  const results = kelime_arama(izahnameData, query).map(row => ({
    index: row.index,
    paragraph: row.paragraf
  }));
  res.json(results);
});

// Tarife Arama
app.get('/api/tarife/search', (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Arama metni gereklidir' });

  console.log('Arama metni:', query);
  console.log('Tarife verisi:', tarifeData);

  const results = kelime_arama(tarifeData, query).map(row => ({
    col1: row['1. Kolon'],
    col2: row['2. Kolon']
  }));
  res.json(results);
});

// Eşya Fihristi Arama
app.get('/api/esya-fihristi/search', (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Arama metni gereklidir' });

  console.log('Arama metni:', query);
  console.log('Eşya Fihristi verisi:', esyaFihristiData);

  const results = kelime_arama(esyaFihristiData, query).map(row => ({
    esya: row.Eşya,
    armonize: row['Armonize Sistem'],
    notlar: row['İzahname Notları']
  }));
  res.json(results);
});

// İzahname Detay
app.get('/api/izahname/context', (req, res) => {
  const { index } = req.query;
  const actualIndex = parseInt(index);
  if (isNaN(actualIndex)) return res.status(400).json({ error: 'Geçersiz indeks' });

  const startIndex = Math.max(0, actualIndex - 25);
  const endIndex = Math.min(izahnameData.length - 1, actualIndex + 25);
  const results = izahnameData
    .slice(startIndex, endIndex + 1)
    .map((row, i) => ({
      index: startIndex + i,
      paragraph: row.paragraf,
      isBold: startIndex + i === actualIndex
    }));
  res.json(results);
});

// Sunucuyu başlat
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
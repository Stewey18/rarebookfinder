import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, deleteDoc, doc, onSnapshot, query } from 'firebase/firestore';
import { 
  Search, 
  BookOpen, 
  DollarSign, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  ExternalLink, 
  Filter, 
  Award, 
  Book, 
  Scale, 
  Plus, 
  Sparkles, 
  Clipboard, 
  Loader2, 
  Info, 
  Camera, 
  Image as ImageIcon, 
  X, 
  List, 
  ArrowRight, 
  MapPin, 
  Calendar, 
  Bookmark, 
  Check, 
  AlertTriangle, 
  XCircle, 
  RefreshCw, 
  Wand2, 
  Settings, 
  Key, 
  Globe, 
  Bell, 
  Trash2, 
  Play, 
  Cloud, 
  Heart, 
  Save, 
  Cpu, 
  LayoutGrid, 
  Table as TableIcon, 
  Link as LinkIcon, 
  Sliders, 
  BookOpenText,
  BarChart3,
  Download
} from 'lucide-react';

const BookScoutApp = () => {
  // --- Firebase Init ---
  const [user, setUser] = useState(null);
  const firebaseConfig = JSON.parse(__firebase_config);
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

  // --- Auth Effect ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  const [queryText, setQueryText] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [listings, setListings] = useState([]);
  const [view, setView] = useState('search'); 
  const [sortMethod, setSortMethod] = useState('score');
  const [resultsLayout, setResultsLayout] = useState('grid');
  
  // --- Advanced Search State ---
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showBatchAdvanced, setShowBatchAdvanced] = useState(false);
  const [advForm, setAdvForm] = useState({
    title: '', author: '', publisher: '', minYear: '', maxYear: '', keywords: '',
    isFirstEdition: false, isSigned: false, isDustJacket: false
  });

  // --- Persistent Settings State ---
  const [ebayAppId, setEbayAppId] = useState(() => localStorage.getItem('bs_ebay_id') || '');
  const [googleSearchKey, setGoogleSearchKey] = useState(() => localStorage.getItem('bs_google_key') || '');
  const [googleCxId, setGoogleCxId] = useState(() => localStorage.getItem('bs_google_cx') || '');
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('bs_gemini_key') || '');
  const [useLiveApi, setUseLiveApi] = useState(() => localStorage.getItem('bs_use_live') === 'true');

  useEffect(() => { localStorage.setItem('bs_ebay_id', ebayAppId); }, [ebayAppId]);
  useEffect(() => { localStorage.setItem('bs_google_key', googleSearchKey); }, [googleSearchKey]);
  useEffect(() => { localStorage.setItem('bs_google_cx', googleCxId); }, [googleCxId]);
  useEffect(() => { localStorage.setItem('bs_gemini_key', geminiApiKey); }, [geminiApiKey]);
  useEffect(() => { localStorage.setItem('bs_use_live', useLiveApi); }, [useLiveApi]);

  // UI State
  const [curatorReport, setCuratorReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [importText, setImportText] = useState('');
  const [importImage, setImportImage] = useState(null); 
  const [analyzingImport, setAnalyzingImport] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(true);

  // Batch Mode State
  const [batchInput, setBatchInput] = useState('');
  const [batchResults, setBatchResults] = useState([]);
  const [validatingBatch, setValidatingBatch] = useState(false);

  // Alerts & Wishlist State
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [savedListings, setSavedListings] = useState([]);
  const [alertForm, setAlertForm] = useState({ keywords: '', maxPrice: '', minCondition: 'Any' });
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  useEffect(() => {
    if (!user) return;
    const alertsQuery = query(collection(db, 'artifacts', appId, 'users', user.uid, 'alerts'));
    const unsubAlerts = onSnapshot(alertsQuery, (snapshot) => {
      const alerts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActiveAlerts(alerts);
      setLoadingAlerts(false);
    }, (error) => setLoadingAlerts(false));
    
    const wishlistQuery = query(collection(db, 'artifacts', appId, 'users', user.uid, 'saved_listings'));
    const unsubWishlist = onSnapshot(wishlistQuery, (snapshot) => {
      const saved = snapshot.docs.map(doc => ({ firebaseId: doc.id, ...doc.data() }));
      setSavedListings(saved);
    });
    
    return () => { unsubAlerts(); unsubWishlist(); };
  }, [user]);
  
  const [newListing, setNewListing] = useState({
    price: '', condition: 'Good', details: '', sellerRating: '4.5',
    author: '', year: '', publisher: '', location: '', binding: '', missingPages: 'None', link: ''
  });

  const pasteAreaRef = useRef(null);

  // --- Helper to Generate Links ---
  const generateSearchUrl = (source, title, author) => {
    const q = encodeURIComponent(`${title} ${author}`);
    if (source.includes('eBay')) return `https://www.ebay.com/sch/i.html?_nkw=${q}&_category=29223`;
    if (source.includes('AbeBooks')) return `https://www.abebooks.com/servlet/SearchResults?sts=t&tn=${encodeURIComponent(title||'')}&an=${encodeURIComponent(author||'')}`;
    if (source.includes('Biblio')) return `https://www.biblio.com/search.php?stage=1&title=${encodeURIComponent(title||'')}&author=${encodeURIComponent(author||'')}`;
    return `https://www.google.com/search?q=${q}`;
  };

  const getScanLink = (title, author, googlePreviewLink) => {
    if (googlePreviewLink) return googlePreviewLink;
    return `https://archive.org/search.php?query=title:(${encodeURIComponent(title || '')}) AND creator:(${encodeURIComponent(author || '')})&mediatype=texts`;
  };

  // --- CSV Export Logic ---
  const exportBatchToCSV = () => {
    if (batchResults.length === 0) return;

    const headers = ["Title/Query", "Status", "Suggestion", "Found Count", "Lowest Price", "Avg Price", "Search URL", "eBay URL"];
    const rows = batchResults.map(item => [
      `"${item.original.replace(/"/g, '""')}"`,
      item.status,
      `"${(item.suggestion || "").replace(/"/g, '""')}"`,
      item.liveStats ? item.liveStats.count : 0,
      item.liveStats ? item.liveStats.min : "",
      item.liveStats ? item.liveStats.avg : "",
      item.google,
      item.ebay
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `book_scout_batch_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- Logic ---
  const fetchRealEbayListings = async (searchQuery) => {
    if (!ebayAppId) return [];
    const url = `https://svcs.ebay.com/services/search/FindingService/v1?OPERATION-NAME=findItemsByKeywords&SERVICE-VERSION=1.0.0&SECURITY-APPNAME=${ebayAppId}&RESPONSE-DATA-FORMAT=JSON&REST-PAYLOAD&keywords=${encodeURIComponent(searchQuery)}&paginationInput.entriesPerPage=25&itemFilter(0).name=ListingType&itemFilter(0).value=FixedPrice`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      const items = data?.findItemsByKeywordsResponse?.[0]?.searchResult?.[0]?.item || [];
      return items.map((item, index) => {
        const price = parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 0);
        const link = item.viewItemURL?.[0] || "#";
        const title = item.title?.[0] || "Unknown Title";
        const conditionRaw = item.condition?.[0]?.conditionDisplayName?.[0] || "Good";
        let condition = "Good";
        if (conditionRaw.toLowerCase().includes("new")) condition = "Fine";
        else if (conditionRaw.toLowerCase().includes("very good")) condition = "Very Good";
        else if (conditionRaw.toLowerCase().includes("acceptable")) condition = "Fair";
        else if (conditionRaw.toLowerCase().includes("parts")) condition = "Poor";
        return {
          id: `ebay-${index}-${Date.now()}`, source: 'eBay', title: title, price: price, condition: condition, details: ['Live Listing'], sellerRating: "4.5", link: link,
          author: '', year: '', publisher: '', location: '', binding: '', missingPages: 'None', score: 0
        };
      });
    } catch (error) { return []; }
  };

  const fetchCustomSearchListings = async (searchQuery) => {
    if (!googleSearchKey || !googleCxId) return [];
    const url = `https://www.googleapis.com/customsearch/v1?key=${googleSearchKey}&cx=${googleCxId}&q=${encodeURIComponent(searchQuery)}`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (!data.items) return [];
      return data.items.map((item, index) => {
        // Corrected Regex for price matching
        const priceMatch = (item.snippet + item.title).match(/(\$|£|€)(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
        const price = priceMatch ? parseFloat(priceMatch[2].replace(/,/g, '')) : 0;
        let source = "Web Market";
        if (item.link.includes("abebooks")) source = "AbeBooks";
        else if (item.link.includes("biblio")) source = "Biblio";
        else if (item.link.includes("alibris")) source = "Alibris";
        else if (item.link.includes("strandbooks")) source = "Strand";
        if (price === 0) return null;
        return {
          id: `gcs-${index}-${Date.now()}`, source: source, title: item.title, price: price, condition: item.snippet.toLowerCase().includes("fine") ? "Fine" : "Good", details: ['Web Detected'], sellerRating: "4.0", link: item.link,
          author: '', year: '', publisher: '', location: '', binding: '', missingPages: 'None', score: 0
        };
      }).filter(Boolean); 
    } catch (error) { return []; }
  };

  const callGeminiVision = async (prompt, imageBase64 = null) => {
    const keyToUse = geminiApiKey; 
    if (!keyToUse) return null; 
    try {
      const parts = [{ text: prompt }];
      if (imageBase64) {
        // Fixed syntax error here
        const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        parts.push({ inlineData: { mimeType: "image/png", data: cleanBase64 } });
      }
      
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${keyToUse}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: parts }] }) });
      if (!response.ok) throw new Error('Gemini API Error');
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (error) { return null; }
  };

  const handleToggleSave = async (listing) => {
    if (!user) return;
    const existing = savedListings.find(l => (l.link !== '#' && l.link === listing.link) || (l.price === listing.price && l.source === listing.source));
    if (existing) {
        try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'saved_listings', existing.firebaseId)); } catch (e) { console.error(e); }
    } else {
        try { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'saved_listings'), { ...listing, savedAt: Date.now() }); } catch (e) { console.error(e); }
    }
  };
  const isSaved = (listing) => savedListings.some(l => (l.link !== '#' && l.link === listing.link) || (l.price === listing.price && l.source === listing.source));

  const handlePaste = (e) => {
    if (!showAddForm && view !== 'batch') return;
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        if (showAddForm) {
            const blob = items[i].getAsFile();
            const reader = new FileReader();
            reader.onload = (event) => { setImportImage(event.target.result); handleAiVisionAnalysis(event.target.result); };
            reader.readAsDataURL(blob);
            e.preventDefault(); return;
        }
      }
    }
  };

  const handleAiVisionAnalysis = async (imageData = null) => {
    setAnalyzingImport(true);
    const imgToUse = imageData || importImage;
    if (!imgToUse && !importText) { setAnalyzingImport(false); return; }
    const prompt = `Extract info JSON: { "price": (number), "condition": (string), "details": (string), "sellerRating": (string), "author": (string), "year": (string), "publisher": (string), "location": (string), "binding": (string), "missingPages": (string), "url": (string, extract full http link if present in text) }`;
    const result = await callGeminiVision(prompt, imgToUse);
    try {
      if (result) {
          const cleanJson = result.replace(/```json/g, '').replace(/```/g, '').trim();
          const data = JSON.parse(cleanJson);
          setNewListing(prev => ({ ...prev, ...data, price: data.price || prev.price, condition: data.condition || 'Good', link: data.url || prev.link }));
      }
    } catch (e) { console.error(e); } finally { setAnalyzingImport(false); }
  };

  const handleAdvancedSearch = () => {
    let constructedQuery = "";
    if (advForm.title) constructedQuery += `${advForm.title} `;
    if (advForm.author) constructedQuery += `+author:"${advForm.author}" `;
    if (advForm.publisher) constructedQuery += `+publisher:"${advForm.publisher}" `;
    
    if (advForm.minYear && advForm.maxYear) constructedQuery += `${advForm.minYear}..${advForm.maxYear} `;
    else if (advForm.minYear) constructedQuery += `after:${advForm.minYear} `;

    if (advForm.isFirstEdition) constructedQuery += `"First Edition" `;
    if (advForm.isSigned) constructedQuery += `"Signed" `;
    if (advForm.isDustJacket) constructedQuery += `"Dust Jacket" `;
    if (advForm.keywords) constructedQuery += `${advForm.keywords} `;

    const finalQuery = constructedQuery.trim();
    if (finalQuery) {
        setQueryText(finalQuery);
        performSearch(finalQuery);
    }
  };

  const performSearch = async (overrideQuery = null) => {
    const q = overrideQuery || queryText;
    if (!q) return;
    setLoading(true); setCuratorReport(null); setListings([]); 
    try {
      const response = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}`);
      const data = await response.json();
      let bookData = null;
      if (data.items && data.items.length > 0) {
        const bestMatch = data.items[0].volumeInfo;
        bookData = {
          title: bestMatch.title, author: bestMatch.authors ? bestMatch.authors.join(', ') : 'Unknown',
          year: bestMatch.publishedDate ? bestMatch.publishedDate.substring(0, 4) : 'N/A', publisher: bestMatch.publisher || 'Unknown',
          description: bestMatch.description || 'No description.', image: bestMatch.imageLinks?.thumbnail || null, category: bestMatch.categories ? bestMatch.categories[0] : 'Rare Book',
          previewLink: bestMatch.previewLink || bestMatch.infoLink || null
        };
        setSelectedBook(bookData);
      } else {
        setSelectedBook({ title: q, author: 'Unknown', description: 'Search Result', year: '', image: null, category: 'Search', previewLink: null });
      }
      let allListings = [];
      if (useLiveApi) {
          if (ebayAppId) allListings = [...allListings, ...await fetchRealEbayListings(q)];
          if (googleSearchKey && googleCxId) allListings = [...allListings, ...await fetchCustomSearchListings(q)];
      }
      if (allListings.length === 0) if (bookData) allListings = generateMockListings(bookData);
      setListings(sortListings(allListings, sortMethod)); setView('results');
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const generateCuratorReport = async () => {
    if (!selectedBook) return; setLoadingReport(true);
    const prompt = `Write insight about '${selectedBook.title}' by '${selectedBook.author}'. Significance & First Edition markers. Concise.`;
    const result = await callGeminiVision(prompt);
    setCuratorReport(result || "AI Insights unavailable."); setLoadingReport(false);
  };

  const generateMockListings = (book) => {
    const conditions = ['Fine', 'Very Good', 'Good', 'Fair', 'Poor'];
    const sources = ['AbeBooks', 'Biblio', 'Sothebys', 'Local Estate'];
    const basePrice = Math.floor(Math.random() * 200) + 50; 
    return Array.from({ length: 12 }).map((_, i) => {
        const source = sources[Math.floor(Math.random() * sources.length)];
        return {
            id: `mock-${i}`, source: source,
            price: Math.floor(basePrice * (1 + (Math.random() * 0.5 - 0.2))), condition: conditions[Math.floor(Math.random() * conditions.length)],
            details: ['Simulated Result'], sellerRating: "4.5", author: book.author || 'Unknown', year: book.year || '', publisher: book.publisher || '',
            location: 'London', binding: 'Hardcover', missingPages: 'None', 
            link: generateSearchUrl(source, book.title, book.author),
            score: 0,
            title: book.title
        };
    });
  };

  const handleAddAlert = async (e) => { e.preventDefault(); if (!alertForm.keywords || !user) return; try { await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'alerts'), { ...alertForm, createdAt: Date.now() }); setAlertForm({ keywords: '', maxPrice: '', minCondition: 'Any' }); } catch (error) {} };
  const handleDeleteAlert = async (id) => { if(!user) return; try { await deleteDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'alerts', id)); } catch (error) {} };
  const handleCheckAlert = (alert) => { setQueryText(alert.keywords); performSearch(alert.keywords); };

  const processBatchInput = async () => {
    if (!batchInput.trim()) return; setValidatingBatch(true); setBatchResults([]);
    const lines = batchInput.split('\n').filter(line => line.trim().length > 0);
    const results = [];
    
    let advancedSuffix = "";
    if (showBatchAdvanced) {
        if (advForm.minYear && advForm.maxYear) advancedSuffix += ` ${advForm.minYear}..${advForm.maxYear}`;
        else if (advForm.minYear) advancedSuffix += ` after:${advForm.minYear}`;
        if (advForm.isFirstEdition) advancedSuffix += ' "First Edition"';
        if (advForm.isSigned) advancedSuffix += ' "Signed"';
        if (advForm.isDustJacket) advancedSuffix += ' "Dust Jacket"';
        if (advForm.keywords) advancedSuffix += ` ${advForm.keywords}`;
    }

    for (const line of lines) {
      const q = line.trim(); 
      let status = 'unknown'; let suggestion = null; let liveStats = null; let scanLink = null;

      try {
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          const info = data.items[0].volumeInfo;
          const full = `${info.title} ${info.authors ? info.authors.join(', ') : ''}`.trim();
          if (full.toLowerCase() !== q.toLowerCase() && full.length < q.length + 20) { status = 'suggestion'; suggestion = full; } else { status = 'verified'; }
          scanLink = getScanLink(info.title, info.authors ? info.authors.join(', ') : '', info.previewLink);
        } else { status = 'not_found'; }
      } catch (e) {}
      
      const term = suggestion || q;
      const searchTerm = term + advancedSuffix;

      if (useLiveApi) {
          let batch = [];
          if (ebayAppId) batch = [...batch, ...await fetchRealEbayListings(searchTerm)];
          if (googleSearchKey) batch = [...batch, ...await fetchCustomSearchListings(searchTerm)];
          if (batch.length > 0) {
              const prices = batch.map(l => l.price).filter(p => p > 0);
              if (prices.length > 0) liveStats = { count: batch.length, min: Math.min(...prices), avg: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length) };
          }
      }
      
      results.push({ 
          original: q, suggestion, status, liveStats, scanLink,
          ebay: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchTerm)}&_category=29223`, 
          abebooks: `https://www.abebooks.com/servlet/SearchResults?sts=t&tn=${encodeURIComponent(searchTerm)}`, 
          google: `https://www.google.com/search?q=${encodeURIComponent(searchTerm)}` 
      });
    }
    setBatchResults(results); setValidatingBatch(false);
  };
  const applyAllSuggestions = () => { setBatchResults(batchResults.map(i => i.suggestion ? { ...i, original: i.suggestion, suggestion: null, status: 'verified', liveStats: null } : i)); };
  const applySuggestion = (idx) => { const updated = [...batchResults]; if(updated[idx].suggestion) { updated[idx].original = updated[idx].suggestion; updated[idx].suggestion = null; updated[idx].status = 'verified'; updated[idx].liveStats = null; setBatchResults(updated); } };

  const handleManualAdd = (e) => { e.preventDefault(); if(!newListing.price) return; const m = { id: Date.now(), source: importImage ? 'Visual Scan' : 'Manual', ...newListing, details: newListing.details.split(',').filter(Boolean), link: newListing.link || '#' }; setListings(sortListings([...listings, m], sortMethod)); setShowAddForm(false); setNewListing({ price: '', condition: 'Good', details: '', sellerRating: '4.5', author: '', year: '', publisher: '', location: '', binding: '', missingPages: 'None', link: '' }); setImportText(''); setImportImage(null); };
  const calculateScore = (l) => { let s = 50 - (l.price / 100); const c = { 'Fine': 40, 'Very Good': 30, 'Good': 15, 'Fair': 0, 'Poor': -20 }; s += c[l.condition] || 0; if(l.details.some(d => d.includes('Signed'))) s += 50; if(l.missingPages !== 'None') s -= 50; return Math.max(0, Math.round(s)); };
  const sortListings = (l, m) => { const ls = l.map(i => ({ ...i, score: calculateScore(i) })); if(m === 'price-asc') return ls.sort((a, b) => a.price - b.price); if(m === 'price-desc') return ls.sort((a, b) => b.price - a.price); return ls.sort((a, b) => b.score - a.score); };
  const handleSortChange = (m) => { setSortMethod(m); setListings(sortListings([...listings], m)); };
  const getMarketUrl = (market) => { const q = encodeURIComponent(selectedBook ? `${selectedBook.title} ${selectedBook.author}` : queryText); if(market==='eBay') return `https://www.ebay.com/sch/i.html?_nkw=${q}&_category=29223`; if(market==='AbeBooks') return `https://www.abebooks.com/servlet/SearchResults?sts=t&tn=${q}`; if(market==='Biblio') return `https://www.biblio.com/search.php?stage=1&term=${q}`; return '#'; };
  const Badge = ({ children, color }) => ( <span className={`px-2 py-0.5 rounded text-xs font-semibold ${color}`}>{children}</span> );

  // --- ANALYTICS DASHBOARD COMPONENT ---
  const AnalyticsDashboard = ({ items }) => {
    if (items.length === 0) return null;
    
    const prices = items.map(i => i.price).filter(p => p > 0).sort((a, b) => a - b);
    if (prices.length === 0) return null;

    const min = prices[0];
    const max = prices[prices.length - 1];
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const median = prices[Math.floor(prices.length / 2)];
    
    const bucketCount = 5;
    const range = max - min;
    const step = Math.max(10, range / bucketCount);
    const buckets = Array.from({ length: bucketCount }).map((_, i) => {
        const start = min + (i * step);
        const end = start + step;
        const count = prices.filter(p => p >= start && p < end).length;
        return { start, end, count, height: 0 }; 
    });
    
    const maxCount = Math.max(...buckets.map(b => b.count));
    buckets.forEach(b => b.height = maxCount > 0 ? (b.count / maxCount) * 100 : 0);

    return (
        <div className="bg-slate-900 text-white p-5 rounded-xl shadow-lg mb-6">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-amber-500 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5"/> Market Analytics
                </h3>
                <div className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">
                    Based on {prices.length} data points
                </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-slate-800 p-3 rounded-lg">
                    <div className="text-xs text-slate-400 uppercase">Lowest</div>
                    <div className="text-xl font-bold">${min}</div>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg">
                    <div className="text-xs text-slate-400 uppercase">Average</div>
                    <div className="text-xl font-bold text-amber-400">${avg}</div>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg">
                    <div className="text-xs text-slate-400 uppercase">Median</div>
                    <div className="text-xl font-bold">${median}</div>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg">
                    <div className="text-xs text-slate-400 uppercase">Volatility</div>
                    <div className="text-xl font-bold text-slate-300">{(range/avg * 100).toFixed(0)}%</div>
                </div>
            </div>

            <div className="h-32 flex items-end gap-2 border-b border-slate-700 pb-2 px-2">
                {buckets.map((b, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
                        <div 
                            className="w-full bg-indigo-500 hover:bg-indigo-400 rounded-t transition-all relative group" 
                            style={{ height: `${Math.max(b.height, 5)}%` }}
                        >
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white text-slate-900 text-xs font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 shadow-lg">
                                {b.count} items (${Math.round(b.start)}-${Math.round(b.end)})
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-2">
                <span>Cheap (${Math.round(min)})</span>
                <span>Expensive (${Math.round(max)})</span>
            </div>
        </div>
    );
  };

  const ListingCard = ({ item, showRemove = false }) => {
    const scanLink = getScanLink(item.title || selectedBook?.title, item.author || selectedBook?.author, selectedBook?.previewLink);
    return (
        <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col md:flex-row gap-4 relative overflow-hidden group hover:shadow-md transition-shadow">
        <div className={`absolute top-0 right-0 px-3 py-1 text-xs font-bold rounded-bl-lg ${item.score > 80 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>Score: {item.score || calculateScore(item)}</div>
        <button onClick={() => handleToggleSave(item)} className="absolute bottom-4 right-4 p-2 rounded-full hover:bg-slate-100 transition-colors z-10" title="Toggle Wishlist"><Heart className={`w-5 h-5 ${isSaved(item) ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} /></button>
        <div className="md:w-32 border-r border-slate-100 pr-4">
            <div className="text-2xl font-bold text-slate-800">${item.price}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center">
                {item.source} 
                {item.source === 'Visual Scan' && <Camera className="w-3 h-3 ml-1 text-indigo-500" />}
                {item.source === 'eBay' && <ExternalLink className="w-3 h-3 ml-1 text-blue-500" />}
                {(item.source.includes('Abe') || item.source.includes('Biblio') || item.source === 'Strand') && <Globe className="w-3 h-3 ml-1 text-amber-500" />}
            </div>
            {item.link && item.link !== '#' && <a href={item.link} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-2 block flex items-center gap-1">View Listing <ExternalLink className="w-3 h-3"/></a>}
            <a href={scanLink} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline mt-1 block flex items-center gap-1 bg-indigo-50 px-1 py-0.5 rounded w-fit"><BookOpenText className="w-3 h-3"/> Digital Copy</a>
        </div>
        <div className="flex-1">
            <div className="flex justify-between mb-1"><span className="font-medium text-slate-800">{item.condition}</span><span className="text-xs text-amber-500 font-bold">{item.sellerRating} ★</span></div>
            <div className="text-xs text-slate-500 mb-2">
                {item.title && (item.link && item.link !== '#' ? <a href={item.link} target="_blank" rel="noreferrer" className="font-semibold block mb-1 hover:text-amber-600 hover:underline">{item.title}</a> : <span className="font-semibold block mb-1">{item.title}</span>)}
                {item.year && <span className="mr-2">Year: {item.year}</span>}{item.publisher && <span className="mr-2">Pub: {item.publisher}</span>}
            </div>
            <div className="flex flex-wrap gap-1">{item.details.map((d, i) => <Badge key={i} color="bg-slate-100 text-slate-600">{d}</Badge>)}</div>
        </div>
        </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans" onPaste={handlePaste}>
      <header className="bg-slate-900 text-amber-50 p-4 shadow-lg sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={() => setView('search')}>
            <BookOpen className="w-6 h-6 text-amber-500" />
            <h1 className="text-xl font-bold tracking-wider font-serif">BIBLIOPHILE SCOUT</h1>
          </div>
          <div className="flex items-center space-x-4">
             <button onClick={() => setView('batch')} className={`text-xs flex items-center gap-1 px-3 py-1 rounded transition-colors ${view === 'batch' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}><List className="w-4 h-4" /> Batch</button>
             <button onClick={() => setView('alerts')} className={`text-xs flex items-center gap-1 px-3 py-1 rounded transition-colors ${view === 'alerts' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}><Bell className="w-4 h-4" /> Alerts</button>
             <button onClick={() => setView('wishlist')} className={`text-xs flex items-center gap-1 px-3 py-1 rounded transition-colors ${view === 'wishlist' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}><Heart className="w-4 h-4" /> Wishlist</button>
             <button onClick={() => setView('settings')} className={`text-xs flex items-center gap-1 px-3 py-1 rounded transition-colors ${view === 'settings' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'}`}><Settings className="w-4 h-4" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-6">
        
        {view === 'settings' && (
             <div className="animate-fade-in max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-xl border border-slate-200">
                <h2 className="text-2xl font-serif text-slate-800 mb-6 flex items-center gap-2"><Key className="w-6 h-6 text-amber-600" /> API Configuration</h2>
                <div className="mb-6 bg-blue-50 border border-blue-200 p-4 rounded-lg flex gap-3"><Info className="w-5 h-5 text-blue-500 flex-shrink-0" /><div className="text-xs text-blue-700"><strong>To run a "Real Test":</strong> Enter your API keys. They will be saved to your browser. Then use the "Search" tab.</div></div>
                <div className="space-y-6">
                    <div className="flex items-center justify-between bg-slate-100 p-4 rounded-lg">
                        <label className="font-bold text-slate-700">Enable Live Data Fetching</label>
                        <label className="relative inline-flex items-center cursor-pointer"><input type="checkbox" className="sr-only peer" checked={useLiveApi} onChange={(e) => setUseLiveApi(e.target.checked)} /><div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:bg-amber-600"></div></label>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200"><h3 className="font-bold text-slate-700 flex items-center gap-2 mb-2">1. eBay Finding API {ebayAppId ? <CheckCircle className="w-4 h-4 text-green-500"/> : <div/>}</h3><input type="text" className="w-full p-2 text-sm border border-slate-300 rounded" placeholder="App ID (Client ID)" value={ebayAppId} onChange={(e) => setEbayAppId(e.target.value)} /></div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200"><h3 className="font-bold text-slate-700 flex items-center gap-2 mb-2">2. Google Custom Search {(googleSearchKey && googleCxId) ? <CheckCircle className="w-4 h-4 text-green-500"/> : <div/>}</h3><input type="text" className="w-full p-2 text-sm border border-slate-300 rounded mb-2" placeholder="API Key" value={googleSearchKey} onChange={(e) => setGoogleSearchKey(e.target.value)} /><input type="text" className="w-full p-2 text-sm border border-slate-300 rounded" placeholder="Engine ID (CX)" value={googleCxId} onChange={(e) => setGoogleCxId(e.target.value)} /></div>
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200"><h3 className="font-bold text-slate-700 flex items-center gap-2 mb-2">3. Gemini API (AI Features) {geminiApiKey ? <CheckCircle className="w-4 h-4 text-green-500"/> : <div/>}</h3><input type="password" className="w-full p-2 text-sm border border-slate-300 rounded" placeholder="Gemini API Key" value={geminiApiKey} onChange={(e) => setGeminiApiKey(e.target.value)} /></div>
                    <button onClick={() => setView('search')} className="w-full py-2 bg-slate-900 text-white rounded flex items-center justify-center gap-2"><Save className="w-4 h-4"/> Save & Return</button>
                </div>
             </div>
        )}

        {view === 'wishlist' && (
            <div className="animate-fade-in max-w-4xl mx-auto">
                <div className="bg-white p-8 rounded-xl shadow-xl border border-slate-200 min-h-[60vh]">
                    <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-serif text-slate-800 flex items-center gap-2"><Heart className="w-6 h-6 text-red-500 fill-current" /> My Wishlist</h2><div className="text-xs text-slate-500">{savedListings.length} items saved</div></div>
                    {savedListings.length === 0 ? <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg"><Heart className="w-12 h-12 mb-2 opacity-20" /><p className="text-sm">Your wishlist is empty.</p></div> : <div className="grid grid-cols-1 gap-4">{savedListings.map(item => <ListingCard key={item.firebaseId || item.id} item={item} showRemove={true} />)}</div>}
                </div>
            </div>
        )}

        {view === 'alerts' && (
            <div className="animate-fade-in max-w-4xl mx-auto">
                <div className="bg-white p-8 rounded-xl shadow-xl border border-slate-200">
                    <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-serif text-slate-800 flex items-center gap-2"><Bell className="w-6 h-6 text-amber-600" /> Market Watch Alerts</h2>{user ? <div className="text-xs text-green-600 flex items-center gap-1 font-bold"><Cloud className="w-3 h-3"/> Sync Active</div> : <div className="text-xs text-slate-400">Syncing...</div>}</div>
                    <div className="flex flex-col lg:flex-row gap-8">
                        <div className="w-full lg:w-1/3 bg-slate-50 p-6 rounded-lg border border-slate-200 h-fit"><h3 className="font-bold text-slate-700 mb-4">Create New Alert</h3><form onSubmit={handleAddAlert} className="space-y-4"><input type="text" required className="w-full p-2 text-sm border border-slate-300 rounded" placeholder="Keywords" value={alertForm.keywords} onChange={e => setAlertForm({...alertForm, keywords: e.target.value})} /><input type="number" className="w-full p-2 text-sm border border-slate-300 rounded" placeholder="Max Price" value={alertForm.maxPrice} onChange={e => setAlertForm({...alertForm, maxPrice: e.target.value})} /><select className="w-full p-2 text-sm border border-slate-300 rounded" value={alertForm.minCondition} onChange={e => setAlertForm({...alertForm, minCondition: e.target.value})}><option value="Any">Any</option><option value="Good">Good+</option><option value="Fine">Fine</option></select><button type="submit" className="w-full bg-amber-600 text-white py-2 rounded">Create Alert</button></form></div>
                        <div className="flex-1">{loadingAlerts ? <div className="h-64 flex items-center justify-center"><Loader2 className="w-8 h-8 text-amber-500 animate-spin" /></div> : activeAlerts.length === 0 ? <div className="h-64 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-lg"><Bell className="w-12 h-12 mb-2 opacity-20" /><p className="text-sm">No active alerts.</p></div> : <div className="space-y-3">{activeAlerts.map(alert => (<div key={alert.id} className="flex items-center justify-between bg-white border border-slate-200 p-4 rounded-lg shadow-sm"><div><div className="font-bold text-slate-800">{alert.keywords}</div><div className="text-xs text-slate-500">Max: ${alert.maxPrice || 'Any'} | Min: {alert.minCondition}</div></div><div className="flex items-center gap-2"><button onClick={() => handleCheckAlert(alert)} className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-md text-xs font-bold"><Play className="w-3 h-3" /></button><button onClick={() => handleDeleteAlert(alert.id)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button></div></div>))}</div>}
                        </div>
                    </div>
                </div>
            </div>
        )}

        {view === 'batch' && (
             <div className="animate-fade-in max-w-5xl mx-auto space-y-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start mb-4">
                        <div><h2 className="text-2xl font-serif text-slate-800 flex items-center gap-2"><List className="w-6 h-6 text-amber-600" /> Bulk Scanner</h2><p className="text-slate-500 text-sm mt-1">Paste a list of titles (one per line) to instantly validate metadata and check market prices.</p></div>
                        <button onClick={() => setShowBatchAdvanced(!showBatchAdvanced)} className={`text-xs flex items-center gap-1 px-4 py-2 rounded-lg border transition-all ${showBatchAdvanced ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300'}`}><Sliders className="w-4 h-4" /> Global Filters</button>
                    </div>
                    {showBatchAdvanced && (<div className="mb-6 bg-slate-50 p-4 rounded-lg border border-slate-200 animate-fade-in-down grid grid-cols-1 md:grid-cols-4 gap-4"><div className="md:col-span-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Apply to all items</div><div><label className="block text-xs font-semibold text-slate-600 mb-1">Year Range</label><div className="flex gap-2"><input type="number" className="w-full p-2 text-sm border border-slate-300 rounded" placeholder="Min" value={advForm.minYear} onChange={e => setAdvForm({...advForm, minYear: e.target.value})} /><input type="number" className="w-full p-2 text-sm border border-slate-300 rounded" placeholder="Max" value={advForm.maxYear} onChange={e => setAdvForm({...advForm, maxYear: e.target.value})} /></div></div><div className="md:col-span-2"><label className="block text-xs font-semibold text-slate-600 mb-1">Keywords</label><input className="w-full p-2 text-sm border border-slate-300 rounded" placeholder="e.g. Leather, Rare, Fine Binding" value={advForm.keywords} onChange={e => setAdvForm({...advForm, keywords: e.target.value})} /></div><div className="flex flex-col justify-end pb-2"><div className="flex gap-3"><label className="flex items-center gap-1 cursor-pointer text-sm text-slate-700"><input type="checkbox" checked={advForm.isFirstEdition} onChange={e => setAdvForm({...advForm, isFirstEdition: e.target.checked})} className="rounded text-amber-600"/> 1st Ed</label><label className="flex items-center gap-1 cursor-pointer text-sm text-slate-700"><input type="checkbox" checked={advForm.isSigned} onChange={e => setAdvForm({...advForm, isSigned: e.target.checked})} className="rounded text-amber-600"/> Signed</label></div></div></div>)}
                    <div className="relative"><textarea className="w-full h-32 p-4 border border-slate-300 rounded-lg text-sm font-mono resize-y bg-slate-50 focus:bg-white" placeholder={"The Great Gatsby\n1984 George Orwell"} value={batchInput} onChange={(e) => setBatchInput(e.target.value)} /><button onClick={processBatchInput} disabled={validatingBatch || !batchInput.trim()} className="absolute bottom-4 right-4 bg-slate-900 text-white px-6 py-2 rounded-md font-medium hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50">{validatingBatch ? <Loader2 className="w-4 h-4 animate-spin"/> : <RefreshCw className="w-4 h-4" />} {validatingBatch ? "Processing..." : "Run Batch Scan"}</button></div>
                </div>
                {batchResults.length > 0 && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in-up">
                        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center"><h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">Analysis Results ({batchResults.length})</h3><div className="flex gap-2"><button onClick={exportBatchToCSV} className="text-xs flex items-center gap-1 bg-white border border-slate-300 text-slate-600 px-3 py-1 rounded hover:bg-slate-50 font-bold transition-colors"><Download className="w-3 h-3"/> Export CSV</button>{batchResults.some(r => r.suggestion) && <button onClick={applyAllSuggestions} className="text-xs flex items-center gap-1 bg-amber-100 text-amber-800 px-3 py-1 rounded hover:bg-amber-200 font-bold transition-colors"><Wand2 className="w-3 h-3" /> Auto-Fix All Issues</button>}</div></div>
                        <div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead className="bg-white text-slate-500 font-semibold border-b border-slate-100"><tr><th className="p-4 w-8">Status</th><th className="p-4">Title / Query</th><th className="p-4 w-48">Market Data</th><th className="p-4 text-right">Actions</th></tr></thead><tbody className="divide-y divide-slate-50">{batchResults.map((item, idx) => (<tr key={idx} className="hover:bg-slate-50 group transition-colors"><td className="p-4 align-top">{item.status === 'verified' && <div className="bg-green-100 text-green-600 p-1.5 rounded-full w-fit"><Check className="w-4 h-4"/></div>}{item.status === 'suggestion' && <div className="bg-amber-100 text-amber-600 p-1.5 rounded-full w-fit"><AlertTriangle className="w-4 h-4"/></div>}{item.status === 'not_found' && <div className="bg-red-100 text-red-600 p-1.5 rounded-full w-fit"><X className="w-4 h-4"/></div>}{item.status === 'unknown' && <div className="bg-slate-100 text-slate-400 p-1.5 rounded-full w-fit"><Loader2 className="w-4 h-4 animate-spin"/></div>}</td><td className="p-4 align-top"><div className="font-medium text-slate-800 text-base">{item.original}</div>{item.suggestion && <div onClick={() => applySuggestion(idx)} className="mt-2 text-sm bg-amber-50 text-amber-700 border border-amber-200 p-2 rounded cursor-pointer hover:bg-amber-100 inline-flex items-center gap-2"><ArrowRight className="w-4 h-4" /> <span><strong>Suggestion:</strong> {item.suggestion}</span></div>}{item.scanLink && <a href={item.scanLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-700 mt-1"><BookOpenText className="w-3 h-3" /> Read Online</a>}</td><td className="p-4 align-top">{item.liveStats ? <div className="bg-slate-100 rounded p-2 text-xs space-y-1 min-w-[120px]"><div className="flex justify-between text-slate-500"><span>Found:</span> <span className="font-bold text-slate-700">{item.liveStats.count}</span></div><div className="flex justify-between text-slate-500"><span>Lowest:</span> <span className="font-bold text-green-600">${item.liveStats.min}</span></div><div className="flex justify-between text-slate-500"><span>Avg:</span> <span className="font-bold text-slate-700">${item.liveStats.avg}</span></div></div> : <span className="text-xs text-slate-400 italic">No live data</span>}</td><td className="p-4 align-top text-right"><div className="flex gap-2 justify-end"><a href={item.ebay} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-white border border-slate-200 hover:border-blue-300 hover:text-blue-600 rounded text-xs font-medium transition-colors">eBay</a><a href={item.abebooks} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-white border border-slate-200 hover:border-red-300 hover:text-red-600 rounded text-xs font-medium transition-colors">Abe</a><a href={item.google} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-400 hover:text-slate-800 rounded text-xs font-medium transition-colors">Google</a></div></td></tr>))}</tbody></table></div>
                    </div>
                )}
             </div>
        )}

        {view === 'search' && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-fade-in">
            <div className="w-full max-w-2xl bg-white p-8 rounded-xl shadow-xl border border-slate-200">
              <h2 className="text-3xl font-serif text-slate-800 mb-2 text-center">Find Your Treasure</h2>
              {useLiveApi && <div className="mb-4 text-center flex justify-center gap-2">{ebayAppId && <Badge color="bg-green-100 text-green-800 border border-green-200">eBay Live</Badge>}{(googleSearchKey && googleCxId) && <Badge color="bg-blue-100 text-blue-800 border border-blue-200">Web Live</Badge>}{geminiApiKey && <Badge color="bg-purple-100 text-purple-800 border border-purple-200">AI Active</Badge>}</div>}
              <div className="flex justify-end mb-2"><button onClick={() => setShowAdvanced(!showAdvanced)} className={`text-xs flex items-center gap-1 px-3 py-1 rounded transition-colors ${showAdvanced ? 'bg-amber-100 text-amber-700 font-bold' : 'text-slate-400 hover:text-amber-600'}`}><Sliders className="w-3 h-3" /> {showAdvanced ? 'Simple Search' : 'Advanced Rare Search'}</button></div>
              {!showAdvanced ? (
                  <div className="relative"><input type="text" value={queryText} onChange={(e) => setQueryText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && performSearch()} placeholder="Enter Title, ISBN, or Author" className="w-full pl-12 pr-4 py-4 rounded-lg bg-slate-50 border-2 border-slate-200 focus:border-amber-500 outline-none text-lg" /><Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-6 h-6" /><button onClick={() => performSearch()} disabled={loading} className="absolute right-2 top-2 bottom-2 bg-slate-900 text-white px-6 rounded-md font-medium hover:bg-slate-800 disabled:opacity-50">{loading ? 'Scouting...' : 'Scout'}</button></div>
              ) : (
                  <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 animate-fade-in-down">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Title</label><input className="w-full p-2 text-sm border border-slate-300 rounded" placeholder="e.g. The Great Gatsby" value={advForm.title} onChange={e => setAdvForm({...advForm, title: e.target.value})} /></div>
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Author</label><input className="w-full p-2 text-sm border border-slate-300 rounded" placeholder="e.g. F. Scott Fitzgerald" value={advForm.author} onChange={e => setAdvForm({...advForm, author: e.target.value})} /></div>
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Publisher</label><input className="w-full p-2 text-sm border border-slate-300 rounded" placeholder="e.g. Scribner" value={advForm.publisher} onChange={e => setAdvForm({...advForm, publisher: e.target.value})} /></div>
                          <div className="flex gap-2"><div className="flex-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Min Year</label><input type="number" className="w-full p-2 text-sm border border-slate-300 rounded" placeholder="1900" value={advForm.minYear} onChange={e => setAdvForm({...advForm, minYear: e.target.value})} /></div><div className="flex-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Max Year</label><input type="number" className="w-full p-2 text-sm border border-slate-300 rounded" placeholder="1950" value={advForm.maxYear} onChange={e => setAdvForm({...advForm, maxYear: e.target.value})} /></div></div>
                      </div>
                      <div className="mb-4"><label className="block text-xs font-bold text-slate-500 uppercase mb-2">Rarity Attributes</label><div className="flex flex-wrap gap-4"><label className="flex items-center gap-2 text-sm cursor-pointer hover:text-amber-600"><input type="checkbox" checked={advForm.isFirstEdition} onChange={e => setAdvForm({...advForm, isFirstEdition: e.target.checked})} className="rounded text-amber-600 focus:ring-amber-500" /> First Edition</label><label className="flex items-center gap-2 text-sm cursor-pointer hover:text-amber-600"><input type="checkbox" checked={advForm.isSigned} onChange={e => setAdvForm({...advForm, isSigned: e.target.checked})} className="rounded text-amber-600 focus:ring-amber-500" /> Signed</label><label className="flex items-center gap-2 text-sm cursor-pointer hover:text-amber-600"><input type="checkbox" checked={advForm.isDustJacket} onChange={e => setAdvForm({...advForm, isDustJacket: e.target.checked})} className="rounded text-amber-600 focus:ring-amber-500" /> Dust Jacket</label></div></div>
                      <div className="mb-4"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Additional Keywords</label><input className="w-full p-2 text-sm border border-slate-300 rounded" placeholder="e.g. Leather, Rare, Fine Binding" value={advForm.keywords} onChange={e => setAdvForm({...advForm, keywords: e.target.value})} /></div>
                      <button onClick={handleAdvancedSearch} disabled={loading} className="w-full py-3 bg-amber-600 text-white rounded-lg font-bold hover:bg-amber-700 transition-colors flex items-center justify-center gap-2 shadow-sm">{loading ? <Loader2 className="w-5 h-5 animate-spin"/> : <Search className="w-5 h-5" />} Scout Rare Books</button>
                  </div>
              )}
            </div>
          </div>
        )}

        {view === 'results' && selectedBook && (
          <div className="animate-fade-in-up">
            <button onClick={() => setView('search')} className="text-sm text-slate-500 hover:text-amber-600 mb-4 flex items-center">← Back to Search</button>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-24">
                  <div className="flex flex-col items-center text-center mb-6">
                    {selectedBook.image ? <img src={selectedBook.image} alt={selectedBook.title} className="w-32 h-auto shadow-md mb-4" /> : <div className="w-32 h-48 bg-slate-200 mb-4 flex items-center justify-center"><Book className="text-slate-400"/></div>}
                    <h2 className="text-xl font-bold font-serif text-slate-900">{selectedBook.title}</h2><p className="text-slate-600">{selectedBook.author}</p>
                  </div>
                  <div className="border-t border-slate-100 pt-4">
                     <h4 className="text-xs font-bold text-indigo-500 uppercase mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Curator's Insight</h4>
                     {!curatorReport && !loadingReport && <button onClick={generateCuratorReport} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded w-full">Generate Insight</button>}
                     {loadingReport && <Loader2 className="w-4 h-4 animate-spin text-indigo-400 mx-auto" />}
                     {curatorReport && <p className="text-xs text-slate-600 leading-relaxed max-h-40 overflow-y-auto">{curatorReport}</p>}
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 grid gap-2">
                    {['eBay', 'AbeBooks', 'Biblio'].map(m => (<a key={m} href={getMarketUrl(m)} target="_blank" rel="noreferrer" className="flex items-center justify-between px-3 py-2 bg-slate-50 text-xs font-medium text-slate-600 hover:bg-blue-50 hover:text-blue-600 rounded"><span>Search {m}</span> <ExternalLink className="w-3 h-3" /></a>))}
                    {/* Main Sidebar Digital Copy */}
                    <a href={getScanLink(selectedBook.title, selectedBook.author, selectedBook.previewLink)} target="_blank" rel="noreferrer" className="flex items-center justify-between px-3 py-2 bg-indigo-50 text-xs font-medium text-indigo-600 hover:bg-indigo-100 rounded border border-indigo-100">
                        <span>Read Online</span> <BookOpenText className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2 space-y-6">
                
                {/* NEW ANALYTICS DASHBOARD */}
                {showAnalytics && <AnalyticsDashboard items={listings} />}

                <div className="flex flex-wrap justify-between items-center bg-white p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center space-x-2 text-slate-600"><Filter className="w-4 h-4" /><span className="text-sm font-medium">Sort By:</span></div>
                  <div className="flex items-center space-x-2">
                    {['score', 'price-asc', 'price-desc'].map(m => (<button key={m} onClick={() => handleSortChange(m)} className={`px-3 py-1.5 text-xs rounded-md uppercase font-bold ${sortMethod === m ? 'bg-amber-100 text-amber-800' : 'text-slate-400'}`}>{m === 'score' ? 'Value' : m === 'price-asc' ? 'Low' : 'High'}</button>))}
                    <div className="border-l border-slate-200 pl-2 ml-2 flex space-x-1">
                        <button onClick={() => setResultsLayout('grid')} className={`p-1.5 rounded ${resultsLayout === 'grid' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid className="w-4 h-4" /></button>
                        <button onClick={() => setResultsLayout('table')} className={`p-1.5 rounded ${resultsLayout === 'table' ? 'bg-slate-200 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}><TableIcon className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
                {showAddForm && (
                  <div ref={pasteAreaRef} className={`bg-white border-2 border-dashed ${importImage ? 'border-green-400' : 'border-indigo-300'} rounded-xl p-6 relative transition-all`}>
                    <button onClick={() => setShowAddForm(false)} className="absolute top-2 right-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
                    <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2"><Camera className="w-5 h-5 text-indigo-600" /> Visual Scanner</h3>
                    {!importImage ? (
                      <div className="text-center py-8">
                        <div className="mb-3 text-indigo-300"><ImageIcon className="w-12 h-12 mx-auto" /></div><p className="text-slate-600 font-medium">Screenshot any listing & <span className="text-indigo-600 font-bold">Paste (Ctrl+V)</span> here</p>
                        <input type="text" placeholder="Paste text description..." className="w-full p-2 text-sm border border-indigo-200 rounded mt-4" value={importText} onChange={(e) => setImportText(e.target.value)} />
                        <button onClick={() => handleAiVisionAnalysis()} disabled={!importText} className="mt-2 bg-indigo-600 text-white px-4 py-1 rounded text-sm disabled:opacity-50">Analyze Text</button>
                      </div>
                    ) : (
                      <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="w-full md:w-1/3"><img src={importImage} alt="Pasted" className="w-full rounded shadow-lg border" /><button onClick={() => {setImportImage(null); setImportText('')}} className="mt-2 text-xs text-red-500 hover:underline w-full text-center">Clear</button></div>
                        <div className="flex-1 w-full">{analyzingImport ? <div className="h-full flex items-center justify-center"><Loader2 className="w-8 h-8 text-indigo-600 animate-spin" /></div> : 
                            <form onSubmit={handleManualAdd} className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-xs font-bold text-slate-500">Price</label><input type="number" className="w-full p-1.5 border rounded" value={newListing.price} onChange={e => setNewListing({...newListing, price: e.target.value})} /></div>
                                <div><label className="text-xs font-bold text-slate-500">Condition</label><select className="w-full p-1.5 border rounded" value={newListing.condition} onChange={e => setNewListing({...newListing, condition: e.target.value})}>{['Fine', 'Very Good', 'Good', 'Fair', 'Poor'].map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                              </div>
                              <div><label className="text-xs font-bold text-slate-500">Listing URL</label><input type="text" className="w-full p-1.5 border rounded" placeholder="https://..." value={newListing.link} onChange={e => setNewListing({...newListing, link: e.target.value})} /></div>
                              <button type="submit" className="w-full bg-green-600 text-white py-2 rounded font-bold">Add Scanned Listing</button>
                            </form>
                        }</div>
                      </div>
                    )}
                  </div>
                )}
                {resultsLayout === 'grid' ? (
                    <div className="space-y-3">{listings.map((item) => <ListingCard key={item.id} item={item} />)}</div>
                ) : (
                    <div className="overflow-x-auto bg-white rounded-lg border border-slate-200">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                                <tr>
                                    <th className="p-3">Source</th>
                                    <th className="p-3">Price</th>
                                    <th className="p-3">Condition</th>
                                    <th className="p-3">Score</th>
                                    <th className="p-3">Details</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {listings.map(item => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 flex items-center gap-2">
                                            {item.source}
                                            {item.source === 'Visual Scan' && <Camera className="w-3 h-3 text-indigo-500" />}
                                            {item.source === 'eBay' && <ExternalLink className="w-3 h-3 text-blue-500" />}
                                            {(item.source.includes('Abe') || item.source.includes('Biblio')) && <Globe className="w-3 h-3 text-amber-500" />}
                                        </td>
                                        <td className="p-3 font-bold text-slate-800">${item.price}</td>
                                        <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-semibold ${item.condition==='Fine'?'bg-green-100 text-green-700':item.condition==='Poor'?'bg-red-100 text-red-700':'bg-slate-100 text-slate-600'}`}>{item.condition}</span></td>
                                        <td className="p-3 font-bold text-slate-700">{item.score || calculateScore(item)}</td>
                                        <td className="p-3 text-xs text-slate-500">
                                            {item.title && (item.link && item.link !== '#' ? <a href={item.link} target="_blank" rel="noreferrer" className="truncate w-32 block font-semibold hover:text-blue-600 hover:underline">{item.title}</a> : <div className="truncate w-32" title={item.title}>{item.title}</div>)}
                                            <div className="flex flex-wrap gap-1 mt-1">{item.details.slice(0,2).map((d,i)=><span key={i} className="bg-slate-100 px-1 rounded">{d}</span>)}</div>
                                        </td>
                                        <td className="p-3 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleToggleSave(item)} title="Wishlist"><Heart className={`w-4 h-4 ${isSaved(item) ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} /></button>
                                                {item.link && item.link !== '#' && <a href={item.link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline"><LinkIcon className="w-4 h-4" /></a>}
                                                <a href={getScanLink(item.title || selectedBook?.title, item.author || selectedBook?.author, selectedBook?.previewLink)} target="_blank" rel="noreferrer" className="text-indigo-500 hover:text-indigo-700" title="Digital Copy"><BookOpenText className="w-4 h-4"/></a>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {!showAddForm && <button onClick={() => setShowAddForm(true)} className="w-full py-4 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-400 font-medium hover:bg-indigo-50 flex items-center justify-center gap-2"><Camera className="w-5 h-5" /> Scan / Import Listing</button>}
              </div>
            </div>
          </div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around p-3 pb-safe z-30 shadow-lg">
        <button onClick={() => setView('search')} className={`flex flex-col items-center gap-1 ${view === 'search' || view === 'results' ? 'text-amber-600' : 'text-slate-400'}`}><Search className="w-6 h-6" /><span className="text-[10px] font-medium">Search</span></button>
        <button onClick={() => setView('batch')} className={`flex flex-col items-center gap-1 ${view === 'batch' ? 'text-amber-600' : 'text-slate-400'}`}><List className="w-6 h-6" /><span className="text-[10px] font-medium">Batch</span></button>
        <button onClick={() => setView('alerts')} className={`flex flex-col items-center gap-1 ${view === 'alerts' ? 'text-amber-600' : 'text-slate-400'}`}><Bell className="w-6 h-6" /><span className="text-[10px] font-medium">Alerts</span></button>
        <button onClick={() => setView('wishlist')} className={`flex flex-col items-center gap-1 ${view === 'wishlist' ? 'text-amber-600' : 'text-slate-400'}`}><Heart className="w-6 h-6" /><span className="text-[10px] font-medium">Saved</span></button>
        <button onClick={() => setView('settings')} className={`flex flex-col items-center gap-1 ${view === 'settings' ? 'text-amber-600' : 'text-slate-400'}`}><Settings className="w-6 h-6" /><span className="text-[10px] font-medium">Config</span></button>
      </nav>
    </div>
  );
};

export default BookScoutApp;
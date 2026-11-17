import React, { useEffect, useMemo, useState } from "react";

const tabs = [
  { id: "gif", label: "GIFs" },
  { id: "sticker", label: "Stickers" },
];
const recentKey = "quickchat-media-recent";
const favoriteKey = "quickchat-sticker-favorites";

export default function MediaPicker({ stickers, onSendSticker, onSendGif, onClose, sending }) {
  const [tab, setTab] = useState("sticker");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [gifQuery, setGifQuery] = useState("");
  const [gifs, setGifs] = useState([]);
  const [gifLoading, setGifLoading] = useState(false);
  const [gifError, setGifError] = useState("");
  const [recent, setRecent] = useState(() => {
    try { return JSON.parse(localStorage.getItem(recentKey) || "[]"); } catch { return []; }
  });
  const [favorites, setFavorites] = useState(() => {
    try { return JSON.parse(localStorage.getItem(favoriteKey) || "[]"); } catch { return []; }
  });
  const categories = useMemo(() => [{ id: "all", label: "All" }, ...Array.from(new Map(stickers.map(s => [s.category, { id: s.category, label: s.categoryLabel }])).values())], [stickers]);
  const visibleStickers = useMemo(() => {
    let items = stickers.filter(s => (category === "all" || s.category === category) && (!query || `${s.label} ${s.categoryLabel}`.toLowerCase().includes(query.toLowerCase())));
    if (category === "recent") items = stickers.filter(s => recent.includes(s.id));
    if (category === "favorites") items = stickers.filter(s => favorites.includes(s.id));
    return items;
  }, [stickers, category, query, recent, favorites]);

  useEffect(() => {
    if (tab !== "gif") return;
    const apiKey = import.meta.env.VITE_KLIPY_API_KEY;
    if (!apiKey) {
      setGifError("Add VITE_KLIPY_API_KEY to the client environment to enable GIF search.");
      setGifs([]);
      return;
    }
    const controller = new AbortController();
    const loadGifs = async () => {
      setGifLoading(true);
      setGifError("");
      try {
        const endpoint = gifQuery.trim() ? "search" : "featured";
        const params = new URLSearchParams({
          key: apiKey,
          limit: "24",
          media_filter: "gif,tinygif,mediumgif",
          contentfilter: "medium",
          country: "IN",
          locale: "en_IN",
        });
        if (gifQuery.trim()) params.set("q", gifQuery.trim().slice(0, 80));
        const response = await fetch(`https://api.klipy.com/v2/${endpoint}?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? "KLIPY rejected this API key. Check your VITE_KLIPY_API_KEY." : "KLIPY GIF search is temporarily unavailable.");
        const payload = await response.json();
        const items = (payload.results || []).flatMap((item) => {
          if (item.type === "ad") return [item];
          const formats = item.media_formats || {};
          const url = formats.gif?.url;
          const preview = formats.tinygif?.url || formats.mediumgif?.url || url;
          if (!url || !preview) return [];
          return [{ id: String(item.id), title: String(item.title || item.content_description || "").slice(0, 100), url, preview, slug: item.slug || "" }];
        });
        if (!controller.signal.aborted) setGifs(items);
      } catch (error) {
        if (error.name !== "AbortError" && !controller.signal.aborted) {
          setGifError(error.message || "Unable to search GIFs right now.");
          setGifs([]);
        }
      } finally {
        if (!controller.signal.aborted) setGifLoading(false);
      }
    };
    loadGifs();
    return () => controller.abort();
  }, [tab, gifQuery]);

  const remember = (id) => {
    setRecent(old => { const next = [id, ...old.filter(x => x !== id)].slice(0, 18); localStorage.setItem(recentKey, JSON.stringify(next)); return next; });
  };
  const toggleFavorite = (id) => {
    setFavorites(old => { const next = old.includes(id) ? old.filter(x => x !== id) : [id, ...old]; localStorage.setItem(favoriteKey, JSON.stringify(next)); return next; });
  };
  const chooseSticker = (sticker) => { remember(sticker.id); onSendSticker(sticker); };
  const chooseGif = (gif) => { onSendGif(gif.url); remember(`gif:${gif.id}`); };

  return (
    <section className="qc-emoji-popover qc-media-picker absolute bottom-14 left-0 z-50 flex w-[min(440px,calc(100vw-24px))] max-h-[min(620px,76vh)] flex-col overflow-hidden rounded-[22px] border text-white shadow-2xl" role="dialog" aria-label="GIF and sticker picker">
      <header className="qc-media-header flex items-center justify-between px-5 py-4">
        <div><div className="flex items-center gap-2"><strong className="text-[15px] font-bold tracking-tight">Media studio</strong><span className="qc-media-live-dot" /></div><p className="mt-1 text-[11px]">GIFs, stickers & little reactions</p></div>
        <button type="button" onClick={onClose} className="qc-media-close rounded-xl px-2.5 py-1.5" aria-label="Close media picker">×</button>
      </header>
      <nav className="qc-media-tabs grid grid-cols-2 gap-1 p-1.5 mx-4 mb-1 rounded-xl">
        {tabs.map(item => <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`rounded-lg px-3 py-2.5 text-[13px] font-semibold transition ${tab === item.id ? "qc-media-tab-active" : "qc-media-tab"}` }>{item.label}</button>)}
      </nav>
      {tab === "sticker" ? (
        <>
          <div className="qc-media-categories flex gap-2 overflow-x-auto px-4 pt-3 pb-2">
            {[["all","All"],["recent","Recent"],["favorites","Saved"],...categories.slice(1).map(c=>[c.id,c.label])].map(([id,label])=><button key={id} type="button" onClick={()=>setCategory(id)} className={`shrink-0 rounded-full px-3 py-2 text-[11px] font-medium ${category===id?"qc-media-category-active":"qc-media-category"}` }>{label}</button>)}
          </div>
          <div className="qc-media-search-wrap px-4 py-2"><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search stickers…" className="qc-media-search w-full rounded-xl px-3.5 py-3 text-xs outline-none" /></div>
          <div className="qc-sticker-grid grid grid-cols-4 gap-2.5 overflow-y-auto px-4 pb-4 pt-2">
            {visibleStickers.map(sticker=><div key={sticker.id} className="group relative">
              <button type="button" disabled={sending} onClick={()=>chooseSticker(sticker)} title={sticker.label} className="qc-sticker-tile flex min-h-[104px] w-full flex-col items-center justify-center rounded-2xl p-2.5 disabled:opacity-50"><span className="qc-sticker-art text-[34px] leading-none">{sticker.art}</span><span className="qc-sticker-label mt-2 text-center text-[10px] font-medium">{sticker.label}</span></button>
              <button type="button" onClick={()=>toggleFavorite(sticker.id)} aria-label={favorites.includes(sticker.id)?"Remove favorite":"Save sticker"} className="qc-sticker-favorite absolute right-1.5 top-1.5 rounded-full px-1.5 py-1 text-[11px]">{favorites.includes(sticker.id)?"★":"☆"}</button>
            </div>)}
            {!visibleStickers.length && <p className="col-span-4 py-8 text-center text-xs text-white/45">No stickers found.</p>}
          </div>
        </>
      ) : (
        <>
          <div className="qc-media-search-row flex gap-2 px-4 pt-3 pb-2"><input value={gifQuery} onChange={e=>setGifQuery(e.target.value)} placeholder="Search KLIPY" className="qc-media-search min-w-0 flex-1 rounded-xl px-3.5 py-3 text-xs outline-none" /><button type="button" onClick={()=>setGifQuery("")} className="qc-media-trending rounded-xl px-3.5 text-xs font-semibold">Trending</button></div>
          {gifError && <p className="px-3 pb-2 text-xs text-amber-300">{gifError}</p>}
          <div className="qc-media-provider flex items-center justify-between px-4 pb-3"><span>Trending & search</span><span>Powered by <b>KLIPY</b></span></div>
          {gifLoading ? <p className="py-10 text-center text-xs text-white/50">Finding GIFs…</p> : <div className="qc-gif-grid grid grid-cols-2 gap-3 overflow-y-auto px-4 pb-4 pt-1">{gifs.map((gif,index)=>gif.type === "ad" ? <div key={gif.id || `klipy-ad-${index}`} className="flex min-h-28 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 px-3 text-center"><span className="text-[10px] text-white/45">Sponsored</span><span className="mt-1 text-xs text-white/70">{gif.title || "KLIPY promotion"}</span></div> : <button key={gif.id} type="button" disabled={sending} onClick={()=>chooseGif(gif)} className="qc-gif-card overflow-hidden rounded-2xl text-left"><img src={gif.preview || gif.url} alt={gif.title || "GIF"} loading="lazy" className="qc-gif-image aspect-[4/3] w-full object-cover"/><span className="qc-gif-caption block truncate px-2.5 py-2 text-[10px]">GIF · {gif.title || "Tap to send"}</span></button>)}</div>}
        </>
      )}
    </section>
  );
}

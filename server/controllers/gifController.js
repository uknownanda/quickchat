const TENOR_API = "https://tenor.googleapis.com/v2";

export const searchGifs = async (req, res) => {
  const apiKey = process.env.TENOR_API_KEY;
  if (!apiKey) return res.status(503).json({ success: false, message: "GIF search is not configured yet. Add TENOR_API_KEY to the backend environment." });
  try {
    const query = String(req.query.q || "").trim().slice(0, 80);
    const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 24, 1), 30);
    const endpoint = query ? "search" : "featured";
    const params = new URLSearchParams({ key: apiKey, client_key: "quickchat", limit: String(limit), media_filter: "gif,tinygif", contentfilter: "medium" });
    if (query) params.set("q", query);
    const response = await fetch(`${TENOR_API}/${endpoint}?${params}`);
    if (!response.ok) return res.status(502).json({ success: false, message: "GIF provider is temporarily unavailable." });
    const payload = await response.json();
    const gifs = (payload.results || []).flatMap(item => {
      const formats = item.media_formats || {};
      const url = formats.gif?.url || formats.tinygif?.url;
      const preview = formats.tinygif?.url || formats.gif?.url;
      if (!url || !/^https:\/\/media(?:\d+)?\.tenor\.com\//i.test(url)) return [];
      return [{ id: String(item.id), title: String(item.content_description || "").slice(0, 100), url, preview }];
    });
    return res.json({ success: true, gifs });
  } catch (error) {
    console.error("GIF search error:", error);
    return res.status(500).json({ success: false, message: "Unable to search GIFs right now." });
  }
};

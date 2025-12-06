
import { GoogleGenAI, Type } from "@google/genai";
import { Song } from "../types";
import { INITIAL_SONGS } from "../constants";

let ai: GoogleGenAI | null = null;
let isDemoMode = false;

// Initialize AI Client
try {
  let apiKey = null;
  // Check for process.env safely
  if (typeof process !== 'undefined' && process.env) {
      apiKey = process.env.API_KEY;
  }
  
  // Validate Key
  if (apiKey && apiKey !== 'undefined' && apiKey.trim() !== '') {
     ai = new GoogleGenAI({ apiKey });
  } else {
     throw new Error("API Key missing or invalid");
  }
} catch (e) {
  isDemoMode = true;
  console.warn("uMusic: Running in Demo Mode (No valid API Key found).");
}

// Helper: Clean title for better matching
const cleanMetadata = (str: string): string => {
    if (!str) return "";
    return str
        .replace(/[「」]/g, "")
        .replace(/【.*?】/g, "")
        .replace(/\(Official.*?\)/gi, "")
        .replace(/\[Official.*?\]/gi, "")
        .replace(/\(Music Video\)/gi, "")
        .replace(/\(Lyric Video\)/gi, "")
        .replace(/\[MV\]/gi, "")
        .replace(/\(MV\)/gi, "")
        .replace(/Official Video/gi, "")
        .replace(/Official Audio/gi, "")
        .replace(/\(Audio\)/gi, "")
        .replace(/\[Audio\]/gi, "")
        .replace(/ft\./gi, "feat.")
        .replace(/feat\./gi, "feat.")
        .replace(/\s+/g, " ") // Collapse multiple spaces
        .trim();
};

const extractVideoId = (url: string): string | null => {
  if (!url) return null;
  // Robust match for standard YouTube and YouTube Music URLs
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  return match ? match[1] : null;
};

// Helper for Mock Data
const getMockData = (query: string): Song[] => {
    console.log(`[Demo Mode] Searching local library for: "${query}"`);
    const lowerQ = query.toLowerCase();
    return INITIAL_SONGS.filter(s => 
        s.title.toLowerCase().includes(lowerQ) || 
        s.artist.toLowerCase().includes(lowerQ)
    );
};

export const searchYouTube = async (query: string): Promise<Song[]> => {
  if (isDemoMode || !ai) {
      await new Promise(resolve => setTimeout(resolve, 600));
      return getMockData(query);
  }

  try {
    const directVideoId = extractVideoId(query);
    const isUrlSearch = !!directVideoId;
    let prompt = "";

    if (isUrlSearch) {
        prompt = `You are a music metadata extractor.
        Identify the Song Title and Artist for this YouTube video ID: "${directVideoId}".
        
        Return a strictly valid JSON array containing exactly one object:
        [
          {
            "title": "Song Title",
            "artist": "Artist Name",
            "videoId": "${directVideoId}"
          }
        ]
        
        If you cannot identify it, use "Unknown Title" and "Unknown Artist".
        Do NOT include "Official Video" in the title.
        `;
    } else {
        prompt = `Search YouTube for "${query}".
        Return a list of 6 top music video results.
        Prefer "Official Audio" or "Lyric Video".
        
        Return a strictly valid JSON array.
        Each object must have:
        - "title": string (The song title ONLY. Do NOT include the artist name.)
        - "artist": string (The artist name ONLY.)
        - "videoId": string (The 11-character YouTube ID)
        
        Example: [{"title": "Song", "artist": "Artist", "videoId": "xxxxxxxxxxx"}]
        `;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    let songs: Song[] = [];

    // Clean and Parse JSON
    let jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const jsonMatch = jsonString.match(/\[[\s\S]*\]/);
    if (jsonMatch) jsonString = jsonMatch[0];

    try {
        const parsed = JSON.parse(jsonString);
        if (Array.isArray(parsed)) {
            songs = parsed.map((item: any) => {
                const videoId = item.videoId || extractVideoId(item.url);
                // Strict ID check
                if (!videoId || videoId.length !== 11) return null;

                const rawArtist = item.artist || 'Unknown Artist';
                let artist = cleanMetadata(rawArtist);
                
                let title = cleanMetadata(item.title);
                
                // Heuristic: Remove artist from title if duplicated
                if (title.toLowerCase().startsWith(artist.toLowerCase() + " - ")) {
                    title = title.substring(artist.length + 3).trim();
                } else if (title.toLowerCase().startsWith(artist.toLowerCase() + "-")) {
                    title = title.substring(artist.length + 1).trim();
                }
                if (title.toLowerCase().endsWith(" - " + artist.toLowerCase())) {
                    title = title.substring(0, title.length - (artist.length + 3)).trim();
                }

                return {
                    id: videoId,
                    videoId: videoId,
                    title: title || 'Unknown Title',
                    artist: artist || 'Unknown Artist',
                    thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                };
            }).filter((s): s is Song => s !== null);
        }
    } catch (e) {
        console.warn("Gemini Search: JSON parse failed, parsing chunks.", e);
    }

    // Fallback to Grounding Metadata (only if JSON failed or returned empty)
    if (songs.length === 0) {
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && chunks.length > 0) {
             chunks.forEach((chunk, i) => {
                 if (chunk.web?.uri && (chunk.web.uri.includes('youtube.com') || chunk.web.uri.includes('youtu.be'))) {
                     const vid = extractVideoId(chunk.web.uri);
                     if (vid) {
                         // Parse Title/Artist from the web title
                         let fullTitle = chunk.web.title || `Result ${i + 1}`;
                         // Remove common suffixes
                         fullTitle = fullTitle.replace(/- YouTube$/, '').replace(/\| Official Video$/, '').replace(/\| Official Audio$/, '').trim();
                         
                         let title = fullTitle;
                         let artist = 'Unknown Artist';

                         // Try to split "Artist - Title"
                         const separator = fullTitle.includes(" - ") ? " - " : fullTitle.includes(" | ") ? " | " : null;
                         
                         if (separator) {
                             const parts = fullTitle.split(separator);
                             if (parts.length >= 2) {
                                 // Heuristic: Artist is usually the one that matches query, or just assume Artist - Title
                                 artist = parts[0].trim();
                                 title = parts.slice(1).join(' ').trim();
                             }
                         }

                         songs.push({
                             id: vid,
                             videoId: vid,
                             title: cleanMetadata(title),
                             artist: cleanMetadata(artist),
                             thumbnail: `https://img.youtube.com/vi/${vid}/hqdefault.jpg`
                         });
                     }
                 }
             });
        }
    }

    // Deduplicate
    const uniqueSongs = songs.filter((song, index, self) => 
        index === self.findIndex((t) => (t.videoId === song.videoId))
    );

    // If direct URL search, ensure we return it even if standard parsing failed, 
    // provided we have the ID.
    if (isUrlSearch && uniqueSongs.length === 0 && directVideoId) {
         return [{
             id: directVideoId,
             videoId: directVideoId,
             title: "Unknown Title",
             artist: "Unknown Artist",
             thumbnail: `https://img.youtube.com/vi/${directVideoId}/hqdefault.jpg`
         }];
    }

    return uniqueSongs;

  } catch (error) {
    console.error("Gemini Search API Failed:", error);
    isDemoMode = true; 
    return getMockData(query);
  }
};

export interface LyricLine {
    time: number;
    text: string;
}

const parseLRC = (lrc: string): LyricLine[] => {
    const lines = lrc.split('\n');
    const result: LyricLine[] = [];
    const timeReg = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;
    
    for (const line of lines) {
        const match = line.match(timeReg);
        if (match) {
            const min = parseInt(match[1]);
            const sec = parseInt(match[2]);
            const frac = match[3];
            const ms = frac.length === 2 ? parseInt(frac) * 10 : parseInt(frac);
            const time = min * 60 + sec + (ms / 1000);
            const text = line.replace(/\[.*?\]/g, '').trim();
            if (text && !text.startsWith('ar:') && !text.startsWith('ti:')) {
                result.push({ time, text });
            }
        }
    }
    return result;
};

export const getLyrics = async (title: string, artist: string, duration: number = 200): Promise<LyricLine[]> => {
    let cleanTitle = cleanMetadata(title);
    const cleanArtist = cleanMetadata(artist);

    // Filter: Remove artist name from title if present
    if (cleanArtist && cleanTitle.toLowerCase().includes(cleanArtist.toLowerCase())) {
         cleanTitle = cleanTitle.replace(new RegExp(cleanArtist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '');
         cleanTitle = cleanTitle.replace(/^[\s\-\/]+|[\s\-\/]+$/g, '').trim();
    }

    try {
        const url = new URL('https://lrclib.net/api/get');
        url.searchParams.append('artist_name', cleanArtist);
        url.searchParams.append('track_name', cleanTitle);
        url.searchParams.append('duration', Math.floor(duration).toString());

        const res = await fetch(url.toString());
        if (res.ok) {
            const data = await res.json();
            if (data && data.syncedLyrics) {
                return parseLRC(data.syncedLyrics);
            }
        }

        const searchUrl = new URL('https://lrclib.net/api/search');
        searchUrl.searchParams.append('q', `${cleanTitle} ${cleanArtist}`);
        const searchRes = await fetch(searchUrl.toString());
        if (searchRes.ok) {
            const searchData = await searchRes.json();
             if (Array.isArray(searchData)) {
                 const bestMatch = searchData
                    .filter((item: any) => item.syncedLyrics)
                    .sort((a: any, b: any) => Math.abs(a.duration - duration) - Math.abs(b.duration - duration))[0];
                 
                 if (bestMatch) {
                     return parseLRC(bestMatch.syncedLyrics);
                 }
             }
        }
    } catch (e) {
        console.warn("LRCLIB fetch failed, falling back to Gemini.", e);
    }

    if (isDemoMode || !ai) {
        return getMockLyrics(duration);
    }

    try {
        const prompt = `Generate synchronized lyrics for "${cleanTitle}" by "${cleanArtist}".
        Duration: ${Math.floor(duration)}s.
        Output strictly a JSON array of {time: number, text: string}.
        `;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            time: { type: Type.NUMBER },
                            text: { type: Type.STRING }
                        }
                    }
                }
            }
        });

        const text = response.text || "[]";
        try {
            const data = JSON.parse(text);
            if (!Array.isArray(data) || data.length === 0) return getMockLyrics(duration);
            return data;
        } catch (e) {
            return getMockLyrics(duration);
        }

    } catch (error) {
        return getMockLyrics(duration);
    }
}

const getMockLyrics = (duration: number): LyricLine[] => {
    return [
        { time: 5, text: "Lyrics not available" },
        { time: 10, text: "Enjoy the music" }
    ];
};

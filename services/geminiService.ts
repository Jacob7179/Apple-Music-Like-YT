
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
  
  // Validate Key: Must exist, not be empty, and not be the string "undefined"
  if (apiKey && apiKey !== 'undefined' && apiKey.trim() !== '') {
     ai = new GoogleGenAI({ apiKey });
  } else {
     throw new Error("API Key missing or invalid");
  }
} catch (e) {
  isDemoMode = true;
  console.warn("uMusic: Running in Demo Mode (No valid API Key found).");
}

const extractVideoId = (url: string): string | null => {
  if (!url) return null;
  // Match standard YouTube ID patterns
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  // YouTube IDs are 11 characters
  return (match && match[2] && match[2].length === 11) ? match[2] : null;
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
  // 1. Immediate Demo Mode check
  if (isDemoMode || !ai) {
      await new Promise(resolve => setTimeout(resolve, 600)); // Simulate network latency
      return getMockData(query);
  }

  try {
    const prompt = `Search YouTube for "${query}".
    Return a list of 6 top music video results.
    Prefer "Official Audio" or "Lyric Video" versions to ensure playback.
    
    You MUST output a raw JSON array.
    Do not use Markdown code blocks.
    
    Each object in the array must have:
    - "title": string
    - "artist": string
    - "videoId": string (the 11-character YouTube ID)
    - "thumbnail": string (optional)
    
    If you cannot find exact videoIds, provide the full YouTube "url" instead.`;

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
                if (!videoId) return null;
                return {
                    id: videoId,
                    videoId: videoId,
                    title: item.title,
                    artist: item.artist || 'Unknown Artist',
                    thumbnail: item.thumbnail || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
                };
            }).filter((s): s is Song => s !== null);
        }
    } catch (e) {
        console.warn("Gemini Search: JSON parse failed, parsing chunks.", e);
    }

    // Fallback to Grounding Metadata
    if (songs.length === 0) {
        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && chunks.length > 0) {
             chunks.forEach((chunk, i) => {
                 if (chunk.web?.uri && (chunk.web.uri.includes('youtube.com') || chunk.web.uri.includes('youtu.be'))) {
                     const vid = extractVideoId(chunk.web.uri);
                     if (vid) {
                         songs.push({
                             id: vid,
                             videoId: vid,
                             title: chunk.web.title || `Result ${i + 1}`,
                             artist: 'YouTube Result',
                             thumbnail: `https://img.youtube.com/vi/${vid}/hqdefault.jpg`
                         });
                     }
                 }
             });
        }
    }

    const uniqueSongs = songs.filter((song, index, self) => 
        index === self.findIndex((t) => (t.videoId === song.videoId))
    );

    console.log(`Gemini Search found ${uniqueSongs.length} results for "${query}"`);
    return uniqueSongs;

  } catch (error) {
    console.error("Gemini Search API Failed:", error);
    console.warn("Switching to Demo Mode due to API error (likely Invalid Key or Network).");
    isDemoMode = true; // Auto-switch to demo mode for subsequent requests
    return getMockData(query); // Return mock data for this request
  }
};

export interface LyricLine {
    time: number;
    text: string;
}

// Parse standard LRC format: [mm:ss.xx] Lyrics
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
            // ms can be 2 digits (centiseconds) or 3 digits (milliseconds)
            const ms = frac.length === 2 ? parseInt(frac) * 10 : parseInt(frac);
            
            const time = min * 60 + sec + (ms / 1000);
            // Remove timestamp and any potential metadata tags
            const text = line.replace(/\[.*?\]/g, '').trim();
            
            // Filter out empty lines or common metadata headers if strictly parsing song text
            if (text && !text.startsWith('ar:') && !text.startsWith('ti:')) {
                result.push({ time, text });
            }
        }
    }
    return result;
};

// Helper: Clean title for better matching (remove Official Video, symbols, etc.)
const cleanMetadata = (str: string): string => {
    if (!str) return "";
    return str
        .replace(/\(Official.*?\)/gi, "")
        .replace(/\[Official.*?\]/gi, "")
        .replace(/\(Music Video\)/gi, "")
        .replace(/\(Lyric Video\)/gi, "")
        .replace(/\[MV\]/gi, "")
        .replace(/\(MV\)/gi, "")
        .replace(/Official Video/gi, "")
        .replace(/Official Audio/gi, "")
        .replace(/ft\..*/i, "")
        .replace(/feat\..*/i, "")
        .replace(/[\(\)\[\]]/g, " ") // Remove brackets
        .replace(/\s+/g, " ") // Collapse multiple spaces
        .trim();
};

export const getLyrics = async (title: string, artist: string, duration: number = 200): Promise<LyricLine[]> => {
    
    const cleanTitle = cleanMetadata(title);
    const cleanArtist = cleanMetadata(artist);

    // 1. Try LRCLIB (Highest Priority)
    try {
        console.log(`Fetching lyrics from LRCLIB for: "${cleanTitle}" by "${cleanArtist}"`);
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

        // 1b. Fallback to LRCLIB Search (Fuzzy Match)
        const searchUrl = new URL('https://lrclib.net/api/search');
        searchUrl.searchParams.append('q', `${cleanTitle} ${cleanArtist}`);
        const searchRes = await fetch(searchUrl.toString());
        if (searchRes.ok) {
            const searchData = await searchRes.json();
             // Find best match with synced lyrics
             if (Array.isArray(searchData)) {
                 // Sort by how close the duration is
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

    // 2. Fallback to Gemini
    if (isDemoMode || !ai) {
        return getMockLyrics(duration);
    }

    try {
        const prompt = `You are a professional lyrics synchronization engine.
        Provide the ACTUAL synchronized lyrics for the song "${cleanTitle}" by "${cleanArtist}".
        The song duration is approximately ${Math.floor(duration)} seconds.

        Output strictly a JSON array of objects with "time" (number in seconds) and "text" (string).
        
        Rules:
        1. "time": Precise start time of the line in seconds.
        2. "text": The exact lyric line. No conversational filler.
        3. Structure the lyrics logically (Verse, Chorus, Bridge) but do not include headers like [Chorus] in the text.
        4. If you don't know the lyrics, provide a "Lyrics not available" message at time 0.
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
            console.error("Failed to parse lyrics JSON", e);
            return getMockLyrics(duration);
        }

    } catch (error) {
        console.error("Gemini Lyrics API Failed:", error);
        return getMockLyrics(duration);
    }
}

const getMockLyrics = (duration: number): LyricLine[] => {
    const lines = [
        "...",
        "[Lyrics Unavailable]",
        "Could not fetch synchronized lyrics",
        "Enjoy the music",
        "..."
    ];
    
    const step = (duration * 0.8) / lines.length;
    const startOffset = 5;

    return lines.map((text, i) => ({
        time: startOffset + (i * step),
        text
    }));
};

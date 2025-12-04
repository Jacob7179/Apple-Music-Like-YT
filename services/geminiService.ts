import { GoogleGenAI } from "@google/genai";
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

export const getLyrics = async (title: string, artist: string): Promise<string> => {
    // 1. Immediate Demo Mode check
    if (isDemoMode || !ai) {
        return getMockLyrics();
    }

    try {
        const prompt = `Return the lyrics for the song "${title}" by "${artist}". 
        Return ONLY the lyrics in plain text with stanza breaks. 
        Do not add any conversational text.`;

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        return response.text || "Lyrics not available.";
    } catch (error) {
        console.error("Gemini Lyrics API Failed:", error);
        isDemoMode = true; // Auto-switch
        return getMockLyrics();
    }
}

const getMockLyrics = () => `[Demo Mode - Lyrics Unavailable]

(Verse 1)
This is a demo version of the app
Running without a valid API key map
The design is sleek, the player works
But real lyrics are hidden in the murk

(Chorus)
Please configure your API Key
To unlock the full functionality
For now enjoy the visual vibe
And the music that we prescribe
`;
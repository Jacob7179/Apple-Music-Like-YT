

export interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: string;
  videoId: string;
}

export interface Playlist {
  id: string;
  title: string;
  cover?: string;
  songs: Song[];
  isCustom: boolean;
  description?: string;
}

export enum RepeatMode {
  OFF = 'OFF',
  ALL = 'ALL',
  ONE = 'ONE'
}

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  queue: Song[];
  volume: number;
  progress: number; // 0 to 100
  duration: number; // in seconds
  currentTime: number; // in seconds
  isLyricsVisible: boolean;
  isQueueVisible: boolean;
  likedSongs: Song[]; // Cache full objects for library
  playlists: Playlist[]; // User playlists
  seekTime: number | null; // Signal to PlayerBar to seek
  unplayableIds: string[]; // List of video IDs that failed to play
  repeatMode: RepeatMode;
  isShuffle: boolean;
  followedArtists: string[];
  artistMapping: Record<string, string>; // Map alias -> master name
}

export enum View {
  HOME = 'HOME',
  SEARCH = 'SEARCH',
  LIBRARY = 'LIBRARY',
  LIBRARY_SONGS = 'LIBRARY_SONGS',
  LIBRARY_ARTISTS = 'LIBRARY_ARTISTS',
  LIBRARY_ALBUMS = 'LIBRARY_ALBUMS',
  LIBRARY_ARTIST_DETAIL = 'LIBRARY_ARTIST_DETAIL',
  LIBRARY_PLAYLISTS = 'LIBRARY_PLAYLISTS', 
  PLAYLIST_DETAILS = 'PLAYLIST_DETAILS',
  SEE_ALL = 'SEE_ALL',
  RADIO = 'RADIO',
  SETTINGS = 'SETTINGS'
}
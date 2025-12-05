

export interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  duration?: string;
  videoId: string;
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
  seekTime: number | null; // Signal to PlayerBar to seek
  unplayableIds: string[]; // List of video IDs that failed to play
}

export enum View {
  HOME = 'HOME',
  SEARCH = 'SEARCH',
  LIBRARY = 'LIBRARY',
  LIBRARY_SONGS = 'LIBRARY_SONGS',
  LIBRARY_ARTISTS = 'LIBRARY_ARTISTS',
  LIBRARY_ALBUMS = 'LIBRARY_ALBUMS',
  LIBRARY_ARTIST_DETAIL = 'LIBRARY_ARTIST_DETAIL',
  PLAYLIST_CHILL = 'PLAYLIST_CHILL',
  PLAYLIST_TOP = 'PLAYLIST_TOP'
}
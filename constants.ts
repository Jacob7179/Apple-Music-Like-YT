import { Song } from './types';

// Updated with Video IDs that are typically "Lyric Videos" or "Audio" 
// to avoid "Official Music Video" restriction (Error 150).
export const INITIAL_SONGS: Song[] = [
  {
    id: '1',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    thumbnail: 'https://i.ytimg.com/vi/_dK2tDK9grQ/hqdefault.jpg',
    videoId: '_dK2tDK9grQ' // Lyric Video
  },
  {
    id: '2',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    thumbnail: 'https://i.ytimg.com/vi/fHI8X4OXluQ/hqdefault.jpg',
    videoId: 'fHI8X4OXluQ' // Official Audio
  },
  {
    id: '3',
    title: 'Levitating',
    artist: 'Dua Lipa',
    thumbnail: 'https://i.ytimg.com/vi/35y_h270-dY/hqdefault.jpg',
    videoId: '35y_h270-dY' // Lyric Video
  },
  {
    id: '4',
    title: 'Peaches',
    artist: 'Justin Bieber',
    thumbnail: 'https://i.ytimg.com/vi/i7e8a9f-F6k/hqdefault.jpg',
    videoId: 'i7e8a9f-F6k' // Visualizer
  },
  {
    id: '5',
    title: 'Stay',
    artist: 'The Kid LAROI & Justin Bieber',
    thumbnail: 'https://i.ytimg.com/vi/yWRdK19bX9g/hqdefault.jpg',
    videoId: 'yWRdK19bX9g' // Lyric Video
  },
  {
    id: '6',
    title: 'Montero',
    artist: 'Lil Nas X',
    thumbnail: 'https://i.ytimg.com/vi/gJ9s3_91vKM/hqdefault.jpg',
    videoId: 'gJ9s3_91vKM' // Lyric Video
  }
];

export const MOCK_PLAYLISTS = [
  { id: 'p1', title: 'Chill Mix', cover: 'https://picsum.photos/300/300?random=10' },
  { id: 'p2', title: 'Top Hits', cover: 'https://picsum.photos/300/300?random=11' },
  { id: 'p3', title: 'Focus', cover: 'https://picsum.photos/300/300?random=12' },
  { id: 'p4', title: 'Workout', cover: 'https://picsum.photos/300/300?random=13' },
];
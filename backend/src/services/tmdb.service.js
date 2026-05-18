import axios from 'axios';

const tmdb = axios.create({
  baseURL: process.env.TMDB_BASE_URL,
  params: { api_key: process.env.TMDB_API_KEY, language: 'th-TH' },
});

const IMG = process.env.TMDB_IMAGE_BASE || 'https://image.tmdb.org/t/p/original';
const imgUrl = (path) => (path ? `${IMG}${path}` : null);

export async function searchMovies(query, page = 1) {
  const { data } = await tmdb.get('/search/movie', { params: { query, page } });
  return data;
}

export async function getMovieDetails(tmdbId) {
  const { data } = await tmdb.get(`/movie/${tmdbId}`, {
    params: { append_to_response: 'credits,videos,images' },
  });
  return data;
}

export async function getPopular(page = 1) {
  const { data } = await tmdb.get('/movie/popular', { params: { page } });
  return data;
}

export async function getGenres() {
  const { data } = await tmdb.get('/genre/movie/list');
  return data.genres;
}

// แปลงข้อมูล TMDB → schema ของเรา
export function mapTmdbMovie(tmdb, slug) {
  const trailer = tmdb.videos?.results?.find(v => v.site === 'YouTube' && v.type === 'Trailer');
  return {
    tmdbId: tmdb.id,
    imdbId: tmdb.imdb_id,
    source: 'TMDB',
    slug,
    title: tmdb.title,
    titleEn: tmdb.original_title,
    originalTitle: tmdb.original_title,
    tagline: tmdb.tagline,
    overview: tmdb.overview,
    posterUrl: imgUrl(tmdb.poster_path),
    backdropUrl: imgUrl(tmdb.backdrop_path),
    trailerUrl: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
    releaseDate: tmdb.release_date ? new Date(tmdb.release_date) : null,
    runtime: tmdb.runtime,
    status: (tmdb.status || 'RELEASED').toUpperCase().replace(/ /g, '_'),
    originalLanguage: tmdb.original_language,
    countries: tmdb.production_countries?.map(c => c.iso_3166_1) || [],
    director: tmdb.credits?.crew?.find(c => c.job === 'Director')?.name,
    cast: tmdb.credits?.cast?.slice(0, 15).map(c => ({
      name: c.name,
      role: c.character,
      photoUrl: imgUrl(c.profile_path),
    })),
    studio: tmdb.production_companies?.[0]?.name,
    budget: tmdb.budget ? BigInt(tmdb.budget) : null,
    revenue: tmdb.revenue ? BigInt(tmdb.revenue) : null,
    tmdbGenreIds: tmdb.genres?.map(g => g.id) || [],
  };
}

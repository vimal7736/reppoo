import axios from "axios";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL ?? "http://localhost:1337";
const API_TOKEN = process.env.NEXT_PUBLIC_STRAPI_API_TOKEN; 

const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('strapi_jwt');
};

const createAPIInstance = () => {
  const jwtToken = getAuthToken();
  const token = jwtToken || API_TOKEN; 

  return axios.create({
    baseURL: `${STRAPI_URL}/api`,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
};

export const strapiAPI = {
  getHero: async () => {
    const api = createAPIInstance();
    const { data } = await api.get("/hero?populate=*");
    return data?.data;
  },

  getAbout: async () => {
  const api = createAPIInstance();
  const { data } = await api.get("/about?populate=*");
  return data?.data;
},


  getTestimonials: async () => {
    const api = createAPIInstance();
    const { data } = await api.get("/testimonials?populate=*&sort=order:asc");
    return data?.data;
  },

  getFAQs: async () => {
    const api = createAPIInstance();
    const { data } = await api.get("/faqs?sort=order:asc");
    return data?.data;
  },

  getLandingPageData: async () => {
    const [hero, about, testimonials, faqs] = await Promise.all([
      strapiAPI.getHero(),
      strapiAPI.getAbout(),
      strapiAPI.getTestimonials(),
      strapiAPI.getFAQs(),
    ]);

    return { hero, about, testimonials, faqs };
  },
};

export const getStrapiMedia = (url?: string | null): string =>
  !url ? "" : url.startsWith("http") ? url : `${STRAPI_URL}${url}`;

export default strapiAPI;
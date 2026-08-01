import axios from 'axios';

// => Shared axios instance for all student-side authenticated requests.
// => Uses a relative baseURL so requests go through the Vite proxy and
// => keep SameSite: Strict cookie behavior intact, per project convention.
const axiosStudent = axios.create({
  baseURL: '/api',
  withCredentials: true, // => always send the JWT httpOnly cookie
});

// => Request interceptor: attaches the CSRF token on every outgoing
// => request, mirrors axiosAdmin.js. Checks localStorage first since a
// => Remember Me student's token lives there (30-day session survives tab
// => close); falls back to sessionStorage for non-Remember-Me students.
axiosStudent.interceptors.request.use((config) => {
  const csrfToken = localStorage.getItem('csrfToken') || sessionStorage.getItem('csrfToken');
  if (csrfToken) {
    config.headers['x-csrf-token'] = csrfToken;
  }
  return config;
});

// => Response interceptor: if the backend ever returns 401, the JWT cookie
// => has expired or been cleared server-side. The frontend's isLoggedIn
// => flag can go stale in that case, so this clears it and forces the
// => user back to /login instead of leaving them stuck on a dead dashboard.
axiosStudent.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // => clear both storage locations since Remember Me can put the
      // => flag in either localStorage or sessionStorage
      localStorage.removeItem('isLoggedIn');
      sessionStorage.removeItem('isLoggedIn');
      localStorage.removeItem('csrfToken');
      sessionStorage.removeItem('csrfToken');

      // => avoid redirect loop if the 401 came from the login page itself
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default axiosStudent;

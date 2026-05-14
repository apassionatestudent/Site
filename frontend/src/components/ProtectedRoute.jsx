// import { Navigate } from 'react-router-dom';

// // => Checks if a student is logged in by looking for the token in cookies
// // => If no token is found, redirects to /login instead of rendering the page
// const ProtectedRoute = ({ children }) => {

//     const token = document.cookie.split('; ').find(row => row.startsWith('token='));

//     if (!token) {

//         return <Navigate to="/login" replace />;
//     }

//     return children;
// };

// export default ProtectedRoute;

import { Navigate } from 'react-router-dom';

// => Checks if a student is logged in via the localStorage flag
// => The actual JWT is in an httpOnly cookie — JavaScript cannot read it directly
// => Real security is still enforced by protectStudent middleware on every API call
const ProtectedRoute = ({ children }) => {
    // => We check for the token cookie on the client side as a lightweight gate
    // => The real security is on the backend — every API call still requires a valid JWT
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

    // => replace: true removes the dashboard URL from browser history
    // => so pressing Back doesn't try to go back to the protected page
    if (!isLoggedIn) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
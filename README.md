# Reppoo AI health Project

This project is a **full-stack landing page application** with a **Next.js frontend** and a **Strapi backend**, both deployed on **Vercel**. The app demonstrates dynamic content management, responsive UI

---

## **Project Overview**

- **Frontend:** Next.js  
- **Backend:** Strapi 
- **Database:** SQLite
- **Hosting:** Vercel (both frontend and backend)

---

## **Features Implemented**

### Frontend (`reppoo-landing`)

- Landing page with dynamic sections  
- Testimonials section integrated with Strapi  
- Responsive design for mobile and desktop  
- API integration with backend Strapi CMS  
- Environment variables for API endpoints  

### Backend (`reppoo-backend`)

- Strapi CMS for managing content dynamically  
- File upload support (images, avatars)  
- Custom collections for testimonials, projects, etc.  
- REST API endpoints exposed for frontend consumption  
- CORS configured to allow frontend requests  

---

## **Folder Structure**
landing/
├─ reppoo-landing/ # Next.js frontend
│ ├─ pages/
│ ├─ public/
│ ├─ components/
│ ├─ package.json
│ └─ ...
├─ reppoo-backend/ # Strapi backend
│ ├─ api/
│ ├─ config/
│ ├─ uploads/
│ ├─ package.json
│ └─ ...
└─ README.md


---

## **Local Setup**

### Backend (Strapi)

1. Install dependencies:

```bash
cd reppoo-backend
npm install
npm run develop

# Admin panel: http://localhost:1337/admin


# frontend
cd reppoo-landing
npm install


# env.local
NEXT_PUBLIC_API_URL=http://localhost:1337
npm run dev
# Frontend available at http://localhost:3000

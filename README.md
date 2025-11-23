# Reppoo - AI Wellness Platform

A modern Next.js web application with Strapi CMS backend for managing wellness content and user authentication.



##  Prerequisites

- **Node.js** (v18.x or higher) - [Download here](https://nodejs.org/)
- **npm** (v9.x or higher) or **yarn** (v1.22.x or higher)
- **Strapi Backend** - Running on `http://localhost:1337` (or your configured URL)

---

##  Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/vimal7736/reppoo.git
cd reppoo-frontend
```

### Step 2: Install Dependencies

Using npm:
```bash
npm install
```




##  Environment Setup



Create a `.env.local` file in the root directory:


# Strapi Backend URL

NEXT_PUBLIC_STRAPI_URL=http://localhost:1337

NEXT_PUBLIC_STRAPI_API_TOKEN=d8b07b6b1b5b5c07d8b2345c852bac450cd5e9efa6717e96d180b7c07a72a2c68ef6e4bc6abb33b81fcffc13355871f7b38f657e2b7765badef73bff6efdc19da45344dee87a5c8b22aa39c2c396776dffc4104469363898572f7c3d3eef62429d4941b2901fdb5cc5d9a70eba184becdf766471b751222a6005484e8f1c686


```

**Important Notes:**
- Replace `http://localhost:1337` with your Strapi backend URL if different
- The API token can find above
- JWT tokens are stored in localStorage after user login

---

##  Running the Application

### Development Mode

```bash
npm run dev
```



The application will start at: **http://localhost:3000**



##  Admin Authentication

### Default Admin Credentials

When you first access the application, you'll be prompted to login:

```
Email: vimal@vimal.in
Password: vimal123

```


NEXT_PUBLIC_STRAPI_API_TOKEN=d8b07b6b1b5b5c07d8b2345c852bac450cd5e9efa6717e96d180b7c07a72a2c68ef6e4bc6abb33b81fcffc13355871f7b38f657e2b7765badef73bff6efdc19da45344dee87a5c8b22aa39c2c396776dffc4104469363898572f7c3d3eef62429d4941b2901fdb5cc5d9a70eba184becdf766471b751222a6005484e8f1c686

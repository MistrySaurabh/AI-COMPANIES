# AI Companies

A full-stack Companies CRUD application built with Node.js, Express, TypeScript, Mongoose, React, and Tailwind CSS.

## Prerequisites

- Node.js >= 18
- MongoDB running locally on port 27017 (or update the `MONGODB_URI` in `backend/.env`)

## Setup & Running

### Backend

```bash
cd backend
npm install
npm run dev
```

The API will start at `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The UI will start at `http://localhost:5173`.

## Environment Variables

`backend/.env`:

```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/ai-companies
```

## API Endpoints

| Method | Path                          | Description              |
|--------|-------------------------------|--------------------------|
| GET    | /api/companies                | List companies (paginated, filterable, sortable) |
| GET    | /api/companies/:id            | Get a single company     |
| POST   | /api/companies                | Create a company         |
| PUT    | /api/companies/:id            | Update a company         |
| DELETE | /api/companies/:id            | Delete a company         |
| GET    | /api/companies/filter-options | Get distinct cities & states |
| GET    | /api/health                   | Health check             |

### Query Parameters for GET /api/companies

| Param      | Default    | Description                        |
|------------|------------|------------------------------------|
| page       | 1          | Page number                        |
| limit      | 10         | Items per page (10/25/50/100)      |
| search     | ""         | Search across name, city, state, email |
| city       | ""         | Filter by city                     |
| state      | ""         | Filter by state                    |
| sortField  | createdAt  | Field to sort by                   |
| sortOrder  | desc       | asc or desc                        |

## Project Structure

```
AI-COMPANIES/
├── backend/
│   ├── src/
│   │   ├── models/Company.ts
│   │   ├── controllers/companyController.ts
│   │   ├── routes/companies.ts
│   │   └── index.ts
│   ├── .env
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── types/company.ts
    │   ├── services/companyService.ts
    │   ├── components/
    │   │   ├── Navbar.tsx
    │   │   ├── Pagination.tsx
    │   │   └── CompanyForm.tsx
    │   ├── pages/companies/
    │   │   ├── CompanyList.tsx
    │   │   ├── CompanyCreate.tsx
    │   │   ├── CompanyView.tsx
    │   │   └── CompanyEdit.tsx
    │   ├── App.tsx
    │   ├── main.tsx
    │   └── index.css
    ├── index.html
    ├── package.json
    ├── tailwind.config.js
    ├── postcss.config.js
    └── vite.config.ts
```

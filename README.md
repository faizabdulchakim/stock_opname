# 🚀 Node.js Express TypeScript REST API Boilerplate

Starter template & boilerplate modern untuk membangun REST API menggunakan **Node.js, Express, TypeScript, PostgreSQL, Prisma ORM, JWT Authentication, Zod Validation, Swagger (OpenAPI 3.0), dan Jest Unit Testing**.

---

## 🛠️ Tech Stack & Features

- ⚡ **Express & TypeScript**: Type-safe, scalable architecture.
- 🗄️ **PostgreSQL & Prisma ORM**: Database migration & Prisma Client generator.
- 🔐 **JWT Authentication**: Password hashing (`bcryptjs`), sign & verify token, auth guard middleware.
- 🛡️ **Zod Validation Middleware**: Centralized request payload/parameter validation.
- 📚 **Swagger UI Docs**: Interactive OpenAPI 3.0 documentation at `/api-docs`.
- 🧪 **Testing**: Jest + Supertest test suite.
- 🛡️ **Security**: Helmet, CORS, centralized Error Handling.

---

## 📁 Project Structure

```
stock_opname/
├── prisma/
│   └── schema.prisma            # Prisma Schema (PostgreSQL)
├── src/
│   ├── config/
│   │   ├── env.ts               # Environment variables
│   │   ├── prisma.ts            # Prisma client singleton
│   │   └── swagger.ts           # Swagger OpenAPI configuration
│   ├── controllers/
│   │   └── auth.controller.ts   # Auth controller (Register, Login, Me)
│   ├── middlewares/
│   │   ├── auth.middleware.ts   # JWT Authentication & RBAC Guard
│   │   ├── error.middleware.ts  # Centralized Error Handler (Zod, Prisma, HTTP)
│   │   └── validate.middleware.ts # Zod Validation Middleware
│   ├── routes/
│   │   ├── auth.routes.ts       # Auth routes + Swagger JSDoc
│   │   └── index.ts             # Routes aggregator & Health check
│   ├── schemas/
│   │   └── auth.schema.ts       # Zod schemas (Register, Login)
│   ├── services/
│   │   └── auth.service.ts      # Auth business logic
│   ├── utils/
│   │   ├── jwt.ts               # Sign & verify JWT token
│   │   └── response.ts          # Standardized API response helper
│   ├── app.ts                   # Express application
│   └── server.ts                # Server listener
├── tests/
│   └── auth.test.ts             # Unit & integration tests
├── .env.example
├── .gitignore
├── jest.config.ts
├── tsconfig.json
└── package.json
```

---

## 🚀 Quick Start

### 1. Setup Environment
Salin `.env.example` ke `.env`:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stock_opname_db?schema=public"
JWT_SECRET="supersecret_jwt_key_stock_opname_2026"
JWT_EXPIRES_IN="1d"
```

### 2. Database Migration & Generate Client
```bash
# Generate Prisma Client
npm run prisma:generate

# Jalankan migrasi schema ke PostgreSQL
npm run prisma:migrate
```

### 3. Jalankan Aplikasi
```bash
# Mode Development
npm run dev

# Build ke JavaScript
npm run build

# Mode Production
npm start
```

### 4. Swagger UI Documentation
Buka browser di:
👉 **`http://localhost:3000/api-docs`**

### 5. Menjalankan Test
```bash
npm test
```

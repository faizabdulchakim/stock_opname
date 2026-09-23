# Stock Opname Backend

## 1. Clone Repository
```bash
git clone git@github.com:faizabdulchakim/stock_opname.git
```

## 2. Enter Project Folder & Install Dependencies
```bash
cd stock_opname
npm install
```

## 3. Create `.env` in Root Folder
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stock_opname_db?schema=public"
JWT_SECRET="supersecret_jwt_key_stock_opname_2026"
JWT_EXPIRES_IN="1d"
```

## 4. DB Migration and Seed
```bash
npx prisma db push
npm run prisma:generate
npm run prisma:seed
```

## 5. Run API
```bash
npm run dev
```

API runs on port 3000:
- http://localhost:3000

### Default Accounts
- **Warehouse Manager:** `manager@warehouse.com` with password `password123`
- **Warehouse Staff:** `staff@warehouse.com` with password `password123`

### Swagger API Documentation
- http://localhost:3000/api-docs

## 6. Running Unit Test
```bash
npm test
```

---

## Tech Stacks
- **Runtime:** Node.js
- **Framework:** Express.js
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Auth:** JWT
- **Validation:** Zod
- **Unit Test:** Jest + Supertest
- **Documentation:** Swagger
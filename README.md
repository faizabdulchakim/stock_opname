stock opname Backend

1. clone
git@github.com:faizabdulchakim/stock_opname.git

2. enter project folder stock_opname
npm install

3. create .env in root foler
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stock_opname_db?schema=public"
JWT_SECRET="supersecret_jwt_key_stock_opname_2026"
JWT_EXPIRES_IN="1d"

4.DB Migration and seed
npx prisma db push
npm run prisma:generate
npm run prisma:seed

5. run API
npm run dev

API run on port 3000
http://localhost:3000

Default Account
Warehouse Manager = manager@warehouse.com with password	password123
Warehouse Staff	= staff@warehouse.com with password password123

Swagger API Documentation
http://localhost:3000/api-docs

6. running unit test
npm test
-------------------------------
Tech stacks:
Nodejs
Framework: Expressjs
ORM: Prisma
DB: PostgreSQL
Auth: JWT
Validation: Zod
Unit Test: Jest + supertest
Documentation: Swagger
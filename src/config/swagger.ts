import swaggerJSDoc from 'swagger-jsdoc';
import { config } from './env';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'REST API Boilerplate',
      version: '1.0.0',
      description: 'Clean Node.js Express TypeScript Boilerplate dengan Prisma ORM, PostgreSQL, JWT Auth, Zod Validation, Swagger, dan Jest',
      contact: {
        name: 'Developer Support',
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Masukkan JWT Token dengan format: Bearer <token>',
        },
      },
      schemas: {
        StandardResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string', example: 'Operation successful' },
            data: { type: 'object', nullable: true },
            errors: { type: 'array', items: { type: 'object' }, nullable: true },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
};

export const swaggerSpec = swaggerJSDoc(options);

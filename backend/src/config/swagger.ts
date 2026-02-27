import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Job Marketplace API',
      version: '1.0.0',
      description: 'Production-ready backend API for Job Marketplace'
    },
    servers: [{ url: '/api/v1', description: 'Base API' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: [
    './src/routes/*.{ts,js}',
    './src/modules/**/*.{ts,js}',
    './dist/src/routes/*.js',
    './dist/src/modules/**/*.js'
  ]
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;

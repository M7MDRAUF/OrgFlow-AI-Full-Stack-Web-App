import swaggerJsdoc from 'swagger-jsdoc';
import type { AppEnv } from '../app/env.js';

export function createSwaggerSpec(env: AppEnv): object {
  const options: swaggerJsdoc.Options = {
    definition: {
      openapi: '3.0.3',
      info: {
        title: 'OrgFlow AI API',
        version: '0.1.0',
        description:
          'Enterprise RBAC platform with AI-powered document retrieval. ' +
          'All endpoints require JWT authentication unless stated otherwise.',
      },
      servers: [
        {
          url: `http://localhost:${String(env.PORT)}${env.API_BASE_PATH}`,
          description: 'Local development',
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
        schemas: {
          ApiSuccessResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: true },
              data: { type: 'object' },
              meta: {
                type: 'object',
                properties: {
                  page: { type: 'integer' },
                  pageSize: { type: 'integer' },
                  total: { type: 'integer' },
                  hasMore: { type: 'boolean' },
                },
              },
            },
          },
          ApiErrorResponse: {
            type: 'object',
            properties: {
              success: { type: 'boolean', example: false },
              error: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  message: { type: 'string' },
                  details: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        path: { type: 'string' },
                        message: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    apis: ['./src/modules/**/*.routes.ts', './src/app/router.ts'],
  };

  return swaggerJsdoc(options);
}

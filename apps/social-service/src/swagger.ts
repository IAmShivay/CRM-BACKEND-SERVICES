import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CRM Platform - Social Service API",
      version: "1.0.0",
      description: "Social media accounts, posts, content generation, and OAuth API",
    },
    servers: [
      {
        url: "http://localhost:{port}",
        variables: {
          port: {
            default: "8005",
          },
        },
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);

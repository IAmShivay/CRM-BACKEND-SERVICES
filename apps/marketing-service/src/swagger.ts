import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CRM Platform - Marketing Service API",
      version: "1.0.0",
      description: "Campaigns, email sequences, SMS, and marketing automation API",
    },
    servers: [
      {
        url: "http://localhost:{port}",
        variables: {
          port: {
            default: "8007",
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

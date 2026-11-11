import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CRM Platform - WhatsApp Service API",
      version: "1.0.0",
      description: "WhatsApp messaging, templates, conversations, bot flows, and webhook API",
    },
    servers: [
      {
        url: "http://localhost:{port}",
        variables: {
          port: {
            default: "8004",
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

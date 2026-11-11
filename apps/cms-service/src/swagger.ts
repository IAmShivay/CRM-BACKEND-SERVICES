import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CRM Platform - CMS Service API",
      version: "1.0.0",
      description: "Blogs, categories, and FMCG food compliance API",
    },
    servers: [
      {
        url: "http://localhost:{port}",
        variables: {
          port: {
            default: "8010",
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

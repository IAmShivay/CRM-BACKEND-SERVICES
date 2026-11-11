import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CRM Platform - Collaboration Service API",
      version: "1.0.0",
      description: "Chat, projects, tasks, sprints, meetings, documents, notifications, and calendar API",
    },
    servers: [
      {
        url: "http://localhost:{port}",
        variables: {
          port: {
            default: "8008",
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

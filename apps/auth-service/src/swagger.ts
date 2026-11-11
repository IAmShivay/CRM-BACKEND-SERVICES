import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "CRM Platform - Auth Service API",
      version: "1.0.0",
      description: "Authentication, authorization, workspace, and user management API",
    },
    servers: [
      {
        url: "http://localhost:{port}",
        variables: {
          port: {
            default: "8001",
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
        cookieAuth: {
          type: "apiKey",
          in: "cookie",
          name: "auth_token",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string", format: "email" },
            fullName: { type: "string" },
            avatarUrl: { type: "string" },
            timezone: { type: "string" },
            emailConfirmed: { type: "boolean" },
            twoFactorEnabled: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        Workspace: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            slug: { type: "string" },
            description: { type: "string" },
            currency: { type: "string" },
            timezone: { type: "string" },
            planId: { type: "string" },
            subscriptionStatus: { type: "string" },
            settings: {
              type: "object",
              properties: {
                dateFormat: { type: "string" },
                timeFormat: { type: "string" },
                weekStartsOn: { type: "number" },
                language: { type: "string" },
              },
            },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Role: {
          type: "object",
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            permissions: { type: "array", items: { type: "string" } },
            isDefault: { type: "boolean" },
            memberCount: { type: "number" },
          },
        },
        Invitation: {
          type: "object",
          properties: {
            id: { type: "string" },
            email: { type: "string" },
            role: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string" },
              },
            },
            invitedAt: { type: "string", format: "date-time" },
            expiresAt: { type: "string", format: "date-time" },
            status: { type: "string" },
          },
        },
        Error: {
          type: "object",
          properties: {
            message: { type: "string" },
            errors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  field: { type: "string" },
                  message: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    paths: {
      "/api/auth/signup": {
        post: {
          tags: ["Auth"],
          summary: "Register a new user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password", "name"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 6 },
                    name: { type: "string" },
                    workspaceName: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            201: {
              description: "User created, verification required",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      requiresVerification: { type: "boolean" },
                      message: { type: "string" },
                      user: { $ref: "#/components/schemas/User" },
                    },
                  },
                },
              },
            },
            400: { description: "Validation error", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } },
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Log in a user",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "password"],
                  properties: {
                    email: { type: "string", format: "email" },
                    password: { type: "string" },
                    twoFactorToken: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Login successful",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      token: { type: "string" },
                      user: { $ref: "#/components/schemas/User" },
                      workspace: { $ref: "#/components/schemas/Workspace" },
                    },
                  },
                },
              },
            },
            401: { description: "Invalid credentials" },
            403: { description: "Email not verified" },
          },
        },
      },
      "/api/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Log out the current user",
          responses: {
            200: { description: "Logout successful" },
          },
        },
      },
      "/api/auth/forgot-password": {
        post: {
          tags: ["Auth"],
          summary: "Request a password reset",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email"],
                  properties: {
                    email: { type: "string", format: "email" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Reset email sent if account exists" },
          },
        },
      },
      "/api/auth/reset-password": {
        post: {
          tags: ["Auth"],
          summary: "Reset password with token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["token", "email", "password"],
                  properties: {
                    token: { type: "string" },
                    email: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Password reset successful" },
            400: { description: "Invalid or expired token" },
          },
        },
      },
      "/api/auth/verify-email": {
        post: {
          tags: ["Auth"],
          summary: "Verify email with OTP",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "otp"],
                  properties: {
                    email: { type: "string", format: "email" },
                    otp: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            200: {
              description: "Email verified, user authenticated",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      token: { type: "string" },
                      user: { $ref: "#/components/schemas/User" },
                      workspace: { $ref: "#/components/schemas/Workspace" },
                    },
                  },
                },
              },
            },
            400: { description: "Invalid or expired OTP" },
          },
        },
      },
      "/api/users/me": {
        get: {
          tags: ["Users"],
          summary: "Get current user profile",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: {
            200: {
              description: "User profile",
              content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
            },
            401: { description: "Not authenticated" },
          },
        },
        put: {
          tags: ["Users"],
          summary: "Update current user profile",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    fullName: { type: "string" },
                    timezone: { type: "string" },
                    avatarUrl: { type: "string" },
                    preferences: { type: "object" },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Profile updated" },
          },
        },
      },
      "/api/users/change-password": {
        post: {
          tags: ["Users"],
          summary: "Change password",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["currentPassword", "newPassword"],
                  properties: {
                    currentPassword: { type: "string" },
                    newPassword: { type: "string", minLength: 8 },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: "Password changed" },
            400: { description: "Invalid current password" },
          },
        },
      },
      "/api/workspaces": {
        get: {
          tags: ["Workspaces"],
          summary: "List user workspaces",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          responses: {
            200: {
              description: "List of workspaces",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      workspaces: { type: "array", items: { $ref: "#/components/schemas/Workspace" } },
                      total: { type: "number" },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Workspaces"],
          summary: "Create a new workspace",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name"],
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    currency: { type: "string" },
                    timezone: { type: "string" },
                    settings: { type: "object" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Workspace created" },
            409: { description: "Workspace name already exists" },
          },
        },
      },
      "/api/workspaces/{id}/members": {
        get: {
          tags: ["Workspaces"],
          summary: "Get workspace members",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          responses: {
            200: { description: "List of members" },
            403: { description: "Access denied" },
          },
        },
      },
      "/api/workspaces/{id}/invite": {
        post: {
          tags: ["Workspaces"],
          summary: "Invite a member to workspace",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "roleId"],
                  properties: {
                    email: { type: "string", format: "email" },
                    roleId: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Invitation created" },
            409: { description: "Already invited or member" },
          },
        },
      },
      "/api/workspaces/{id}/members/{memberId}": {
        patch: {
          tags: ["Workspaces"],
          summary: "Update member role",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [
            { in: "path", name: "id", required: true, schema: { type: "string" } },
            { in: "path", name: "memberId", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["roleId"],
                  properties: { roleId: { type: "string" } },
                },
              },
            },
          },
          responses: {
            200: { description: "Member role updated" },
          },
        },
        delete: {
          tags: ["Workspaces"],
          summary: "Remove a member from workspace",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [
            { in: "path", name: "id", required: true, schema: { type: "string" } },
            { in: "path", name: "memberId", required: true, schema: { type: "string" } },
          ],
          responses: {
            200: { description: "Member removed" },
            403: { description: "Cannot remove owner" },
          },
        },
      },
      "/api/roles/{id}": {
        get: {
          tags: ["Roles"],
          summary: "List workspace roles",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "Workspace ID" }],
          responses: {
            200: {
              description: "List of roles",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      roles: { type: "array", items: { $ref: "#/components/schemas/Role" } },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Roles"],
          summary: "Create a new role",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "Workspace ID" }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["name", "permissions"],
                  properties: {
                    name: { type: "string" },
                    description: { type: "string" },
                    permissions: { type: "array", items: { type: "string" } },
                  },
                },
              },
            },
          },
          responses: {
            201: { description: "Role created" },
            409: { description: "Role name already exists" },
          },
        },
      },
      "/api/roles/{id}/{roleId}": {
        put: {
          tags: ["Roles"],
          summary: "Update a role",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [
            { in: "path", name: "id", required: true, schema: { type: "string" }, description: "Workspace ID" },
            { in: "path", name: "roleId", required: true, schema: { type: "string" } },
          ],
          responses: { 200: { description: "Role updated" } },
        },
        delete: {
          tags: ["Roles"],
          summary: "Delete a role",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [
            { in: "path", name: "id", required: true, schema: { type: "string" }, description: "Workspace ID" },
            { in: "path", name: "roleId", required: true, schema: { type: "string" } },
          ],
          responses: {
            200: { description: "Role deleted" },
            400: { description: "Cannot delete default/Owner roles or roles with members" },
          },
        },
      },
      "/api/invites/{id}": {
        get: {
          tags: ["Invitations"],
          summary: "List pending invitations for a workspace",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [{ in: "path", name: "id", required: true, schema: { type: "string" }, description: "Workspace ID" }],
          responses: {
            200: {
              description: "List of invitations",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      invitations: { type: "array", items: { $ref: "#/components/schemas/Invitation" } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      "/api/invites/{id}/{inviteId}/resend": {
        post: {
          tags: ["Invitations"],
          summary: "Resend an invitation",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [
            { in: "path", name: "id", required: true, schema: { type: "string" }, description: "Workspace ID" },
            { in: "path", name: "inviteId", required: true, schema: { type: "string" } },
          ],
          responses: { 200: { description: "Invitation resent" } },
        },
      },
      "/api/invites/{id}/{inviteId}/cancel": {
        post: {
          tags: ["Invitations"],
          summary: "Cancel an invitation",
          security: [{ bearerAuth: [] }, { cookieAuth: [] }],
          parameters: [
            { in: "path", name: "id", required: true, schema: { type: "string" }, description: "Workspace ID" },
            { in: "path", name: "inviteId", required: true, schema: { type: "string" } },
          ],
          responses: { 200: { description: "Invitation cancelled" } },
        },
      },
      "/api/invites/accept": {
        post: {
          tags: ["Invitations"],
          summary: "Accept an invitation by token",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["token"],
                  properties: { token: { type: "string" } },
                },
              },
            },
          },
          responses: {
            200: { description: "Invitation accepted" },
            404: { description: "Invalid or expired invitation" },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);

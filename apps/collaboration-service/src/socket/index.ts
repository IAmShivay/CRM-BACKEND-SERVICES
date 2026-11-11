import type { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { parse as parseCookie } from "cookie";
import logger from "@crm-platform/logger";
import {
  SOCKET_PATH,
  SOCKET_PING_INTERVAL_MS,
  SOCKET_PING_TIMEOUT_MS,
  SOCKET_ROOM_PREFIX,
  SOCKET_CLIENT_EVENTS as C,
  SOCKET_SERVER_EVENTS as S,
} from "@crm-platform/shared-types";

interface SocketUser {
  userId: string;
  userName?: string;
  workspaceId: string;
  rooms: Set<string>;
}

interface TokenPayload {
  userId: string;
  email?: string;
}

let io: Server | null = null;

const now = () => new Date().toISOString();

const chatRoom = (chatRoomId: string) => `${SOCKET_ROOM_PREFIX.CHAT}${chatRoomId}`;
const workspaceRoom = (workspaceId: string) => `${SOCKET_ROOM_PREFIX.WORKSPACE}${workspaceId}`;
const docRoom = (documentId: string) => `${SOCKET_ROOM_PREFIX.DOCUMENT}${documentId}`;

function readToken(socket: Socket): string | undefined {
  const authToken = socket.handshake.auth?.token;
  if (typeof authToken === "string" && authToken) return authToken;
  const header = socket.handshake.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  const rawCookie = socket.handshake.headers.cookie;
  if (!rawCookie) return undefined;
  return parseCookie(rawCookie).auth_token;
}

function authenticate(socket: Socket, next: (err?: Error) => void) {
  const token = readToken(socket);
  if (!token) return next(new Error("Authentication required"));
  try {
    const secret = process.env.JWT_SECRET || "fallback-secret-key";
    const decoded = jwt.verify(token, secret) as TokenPayload;
    socket.data.authUserId = decoded.userId;
    next();
  } catch {
    next(new Error("Invalid or expired token"));
  }
}

function identified(socket: Socket): SocketUser | null {
  return socket.data.user?.userId ? (socket.data.user as SocketUser) : null;
}

function handleConnection(server: Server, socket: Socket) {
  socket.on(C.IDENTIFY_USER, (data: { userId?: string; userName?: string; workspaceId?: string }) => {
    if (!data?.userId || !data?.workspaceId) {
      socket.emit(S.ERROR, { message: "userId and workspaceId are required" });
      return;
    }
    if (data.userId !== socket.data.authUserId) {
      socket.emit(S.ERROR, { message: "userId does not match the authenticated user" });
      return;
    }
    const user: SocketUser = {
      userId: data.userId,
      userName: data.userName,
      workspaceId: data.workspaceId,
      rooms: new Set<string>(),
    };
    socket.data.user = user;
    socket.join(workspaceRoom(data.workspaceId));
    socket.emit(S.USER_IDENTIFIED, { success: true });
  });

  socket.on(C.JOIN_CHAT, (chatRoomId: string) => {
    if (!chatRoomId) return;
    socket.join(chatRoom(chatRoomId));
    const user = identified(socket);
    if (!user) return;
    user.rooms.add(chatRoomId);
    socket.emit(S.JOINED_CHAT, chatRoomId);
    if (user.userName) {
      socket.to(chatRoom(chatRoomId)).emit(S.USER_JOINED_ROOM, {
        userId: user.userId,
        userName: user.userName,
        timestamp: now(),
      });
    }
  });

  socket.on(C.LEAVE_CHAT, (chatRoomId: string) => {
    if (!chatRoomId) return;
    socket.leave(chatRoom(chatRoomId));
    const user = identified(socket);
    if (!user) return;
    user.rooms.delete(chatRoomId);
    if (user.userName) {
      socket.to(chatRoom(chatRoomId)).emit(S.USER_LEFT_ROOM, {
        userId: user.userId,
        userName: user.userName,
        timestamp: now(),
      });
    }
  });

  socket.on(C.SEND_MESSAGE, (data: Record<string, any>) => {
    const user = identified(socket);
    if (!user) return socket.emit(S.ERROR, { message: "Not identified" });
    if (!data?.chatRoomId) return;
    server.to(chatRoom(data.chatRoomId)).emit(S.NEW_MESSAGE, {
      chatRoomId: data.chatRoomId,
      content: data.content,
      type: data.type || "text",
      senderId: user.userId,
      senderName: user.userName,
      replyTo: data.replyTo,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      fileSize: data.fileSize,
      timestamp: now(),
      tempId: data.tempId,
    });
  });

  socket.on(C.TYPING_START, (data: { chatRoomId?: string }) => {
    const user = identified(socket);
    if (!user || !data?.chatRoomId) return;
    socket.to(chatRoom(data.chatRoomId)).emit(S.USER_TYPING, {
      userId: user.userId,
      userName: user.userName,
      chatRoomId: data.chatRoomId,
      timestamp: now(),
    });
  });

  socket.on(C.TYPING_STOP, (data: { chatRoomId?: string }) => {
    const user = identified(socket);
    if (!user || !data?.chatRoomId) return;
    socket.to(chatRoom(data.chatRoomId)).emit(S.USER_STOPPED_TYPING, {
      userId: user.userId,
      userName: user.userName,
      chatRoomId: data.chatRoomId,
    });
  });

  socket.on(C.ADD_REACTION, (data: { chatRoomId?: string; messageId?: string; emoji?: string }) => {
    const user = identified(socket);
    if (!user || !data?.chatRoomId) return;
    server.to(chatRoom(data.chatRoomId)).emit(S.MESSAGE_REACTION_ADDED, {
      messageId: data.messageId,
      emoji: data.emoji,
      userId: user.userId,
      userName: user.userName,
    });
  });

  socket.on(C.DELETE_MESSAGE, (data: { chatRoomId?: string; messageId?: string }) => {
    const user = identified(socket);
    if (!user || !data?.chatRoomId) return;
    server.to(chatRoom(data.chatRoomId)).emit(S.MESSAGE_DELETED, {
      messageId: data.messageId,
      deletedBy: user.userId,
    });
  });

  socket.on(C.USER_STATUS_CHANGE, (data: { status?: string }) => {
    const user = identified(socket);
    if (!user) return;
    socket.to(workspaceRoom(user.workspaceId)).emit(S.USER_STATUS_UPDATED, {
      userId: user.userId,
      userName: user.userName,
      status: data?.status,
      timestamp: now(),
    });
  });

  socket.on(C.MARK_MESSAGES_READ, (data: { chatRoomId?: string; messageIds?: string[] }) => {
    const user = identified(socket);
    if (!user || !data?.chatRoomId) return;
    socket.to(chatRoom(data.chatRoomId)).emit(S.MESSAGES_READ, {
      chatRoomId: data.chatRoomId,
      messageIds: data.messageIds,
      userId: user.userId,
      userName: user.userName,
      timestamp: now(),
    });
  });

  socket.on(C.CALL_INITIATE, (data: { chatRoomId?: string; meetingId?: string; callType?: string }) => {
    const user = identified(socket);
    if (!user || !data?.chatRoomId) return;
    server.to(chatRoom(data.chatRoomId)).emit(S.CALL_INCOMING, {
      meetingId: data.meetingId,
      chatRoomId: data.chatRoomId,
      callType: data.callType || "voice",
      callerId: user.userId,
      callerName: user.userName,
    });
  });

  socket.on(C.CALL_ACCEPT, (data: { chatRoomId?: string; meetingId?: string }) => {
    const user = identified(socket);
    if (!user || !data?.chatRoomId) return;
    server.to(chatRoom(data.chatRoomId)).emit(S.CALL_ACCEPTED, {
      meetingId: data.meetingId,
      userId: user.userId,
      userName: user.userName,
    });
  });

  socket.on(C.CALL_REJECT, (data: { chatRoomId?: string; meetingId?: string }) => {
    const user = identified(socket);
    if (!user || !data?.chatRoomId) return;
    server.to(chatRoom(data.chatRoomId)).emit(S.CALL_REJECTED, {
      meetingId: data.meetingId,
      userId: user.userId,
    });
  });

  socket.on(C.CALL_END, (data: { chatRoomId?: string; meetingId?: string }) => {
    const user = identified(socket);
    if (!user || !data?.chatRoomId) return;
    server.to(chatRoom(data.chatRoomId)).emit(S.CALL_ENDED, {
      meetingId: data.meetingId,
      endedBy: user.userId,
    });
  });

  socket.on(C.WEBRTC_OFFER, (data: { chatRoomId?: string; offer?: unknown }) => {
    if (!data?.chatRoomId) return;
    socket.to(chatRoom(data.chatRoomId)).emit(S.WEBRTC_OFFER, {
      offer: data.offer,
      from: socket.data.user?.userId,
    });
  });

  socket.on(C.WEBRTC_ANSWER, (data: { chatRoomId?: string; answer?: unknown }) => {
    if (!data?.chatRoomId) return;
    socket.to(chatRoom(data.chatRoomId)).emit(S.WEBRTC_ANSWER, {
      answer: data.answer,
      from: socket.data.user?.userId,
    });
  });

  socket.on(C.WEBRTC_ICE_CANDIDATE, (data: { chatRoomId?: string; candidate?: unknown }) => {
    if (!data?.chatRoomId) return;
    socket.to(chatRoom(data.chatRoomId)).emit(S.WEBRTC_ICE_CANDIDATE, {
      candidate: data.candidate,
      from: socket.data.user?.userId,
    });
  });

  socket.on(C.DOC_JOIN, (data: { documentId?: string }) => {
    const user = identified(socket);
    if (!user || !data?.documentId) return;
    socket.join(docRoom(data.documentId));
    socket.to(docRoom(data.documentId)).emit(S.DOC_USER_JOINED, {
      userId: user.userId,
      userName: user.userName,
    });
  });

  socket.on(C.DOC_LEAVE, (data: { documentId?: string }) => {
    if (!data?.documentId) return;
    socket.leave(docRoom(data.documentId));
    const user = identified(socket);
    if (!user) return;
    socket.to(docRoom(data.documentId)).emit(S.DOC_USER_LEFT, {
      userId: user.userId,
      userName: user.userName,
    });
  });

  socket.on(C.DOC_UPDATE, (data: { documentId?: string; update?: unknown }) => {
    const user = identified(socket);
    if (!user || !data?.documentId || !data.update) return;
    socket.to(docRoom(data.documentId)).emit(S.DOC_UPDATE, {
      update: data.update,
      userId: user.userId,
    });
  });

  socket.on(C.DOC_AWARENESS, (data: { documentId?: string; state?: unknown }) => {
    const user = identified(socket);
    if (!user || !data?.documentId) return;
    socket.to(docRoom(data.documentId)).emit(S.DOC_AWARENESS, {
      state: data.state,
      userId: user.userId,
      userName: user.userName,
    });
  });

  socket.on("disconnect", () => {
    const user = identified(socket);
    if (!user || !user.userName) return;
    user.rooms.forEach((chatRoomId) => {
      socket.to(chatRoom(chatRoomId)).emit(S.USER_LEFT_ROOM, {
        userId: user.userId,
        userName: user.userName,
        timestamp: now(),
      });
    });
    socket.to(workspaceRoom(user.workspaceId)).emit(S.USER_STATUS_UPDATED, {
      userId: user.userId,
      userName: user.userName,
      status: "offline",
      timestamp: now(),
    });
  });
}

export function initSocketServer(httpServer: HttpServer): Server {
  const origins = (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const server = new Server(httpServer, {
    path: SOCKET_PATH,
    addTrailingSlash: false,
    cors: { origin: origins, methods: ["GET", "POST"], credentials: true },
    transports: ["websocket", "polling"],
    pingTimeout: SOCKET_PING_TIMEOUT_MS,
    pingInterval: SOCKET_PING_INTERVAL_MS,
  });

  server.use(authenticate);
  server.on("connection", (socket) => {
    logger.info("Socket connected", { socketId: socket.id, userId: socket.data.authUserId });
    handleConnection(server, socket);
  });

  io = server;
  return server;
}

export function getIO(): Server | null {
  return io;
}

export function emitToChat(chatRoomId: string, event: string, payload: unknown) {
  io?.to(chatRoom(chatRoomId)).emit(event, payload);
}

export function emitToWorkspace(workspaceId: string, event: string, payload: unknown) {
  io?.to(workspaceRoom(workspaceId)).emit(event, payload);
}

export function closeSocketServer(): Promise<void> {
  return new Promise((resolve) => {
    const server = io;
    io = null;
    if (!server) return resolve();
    server.close(() => resolve());
  });
}

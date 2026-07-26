import http from 'http';
import dotenv from 'dotenv';
import app from './app';
import { initSocket } from './socket';

// Load env vars
dotenv.config();

const PORT = process.env.PORT || 4000;
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Graceful Shutdown
const gracefulShutdown = () => {
  console.log('Shutting down gracefully...');
  server.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

server.listen(PORT, () => {
  console.log(`🚀 Savory Server running on http://localhost:${PORT}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV}`);
});

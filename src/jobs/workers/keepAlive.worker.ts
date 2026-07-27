import http from 'http';
import https from 'https';

/**
 * Worker: Keep-Alive & Self-Ping Logger
 * Schedule: Heartbeat every 2 mins | Self-Ping HTTP every 10 mins
 * Purpose: Prints live ping logs in console and sends HTTP requests to /health to prevent free hosting platforms (Render/Railway) from sleeping.
 */
export const runHeartbeatLog = () => {
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  console.log(`⚡ [Cron:Ping] Server Heartbeat Active • ${now}`);
};

export const runSelfPingWorker = async (): Promise<{ status: string; url: string }> => {
  return new Promise((resolve) => {
    const port = process.env.PORT || 4000;
    const targetUrl = process.env.PUBLIC_SERVER_URL || `http://localhost:${port}/health`;

    const client = targetUrl.startsWith('https') ? https : http;

    client.get(targetUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`🌐 [Cron:SelfPing] HTTP Keep-Alive Ping successful to ${targetUrl} (Status: ${res.statusCode})`);
        resolve({ status: 'success', url: targetUrl });
      });
    }).on('error', (err) => {
      console.warn(`⚠️ [Cron:SelfPing] Self-Ping HTTP attempt failed to ${targetUrl}: ${err.message}`);
      resolve({ status: 'failed', url: targetUrl });
    });
  });
};

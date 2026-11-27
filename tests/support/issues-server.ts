import http from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Issue } from '@/domains/issues/issue.schema.ts';

export class GitLabIssuesMockServer {
  private server: http.Server | null = null;
  private port = 0;
  private issues = new Map<number, Issue>();
  private nextIid = 100;
  private nextId = 5000;

  async start(): Promise<string> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(0, '127.0.0.1', () => {
        const addr = this.server?.address() as AddressInfo;
        this.port = addr.port;
        resolve(`http://127.0.0.1:${this.port}/api/v4`);
      });

      this.server.on('error', reject);
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => resolve());
      } else {
        resolve();
      }
    });
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    const url = new URL(req.url || '/', `http://127.0.0.1:${this.port}`);
    const pathname = url.pathname;
    const method = req.method?.toUpperCase() || 'GET';
    const authHeader = req.headers['private-token'] as string | undefined;

    // Read full body
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const rawBody = Buffer.concat(chunks).toString('utf-8');
      let body: Record<string, any> = {};
      if (rawBody && (req.headers['content-type']?.includes('application/json') || rawBody.startsWith('{'))) {
        try {
          body = JSON.parse(rawBody);
        } catch {
          body = {};
        }
      }

      // 1. Health check: /api/v4/version
      if (pathname === '/api/v4/version' && method === 'GET') {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ version: '17.6.0-ee', revision: '883921abc' }));
        return;
      }

      // Check token
      if (authHeader === 'invalid_token_xyz') {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ message: '401 Unauthorized' }));
        return;
      }

      // 2. /api/v4/projects/:id/issues
      const listMatch = pathname.match(/^\/api\/v4\/projects\/([^/]+)\/issues\/?$/);
      if (listMatch) {
        const projectId = Number(listMatch[1]);
        if (method === 'GET') {
          const list = Array.from(this.issues.values()).filter((i) => i.project_id === projectId);
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(list));
          return;
        }

        if (method === 'POST') {
          // Negative boundary validations
          if (body.title === undefined) {
            res.writeHead(400, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ message: '400 (Bad request) "title" is missing' }));
            return;
          }

          if (body.title === '') {
            res.writeHead(400, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ message: '400 (Bad request) "title" is empty' }));
            return;
          }

          if (typeof body.title === 'string' && body.title.length > 255) {
            res.writeHead(400, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ message: '400 (Bad request) "title" is too long (maximum is 255 characters)' }));
            return;
          }

          const iid = ++this.nextIid;
          const id = ++this.nextId;
          const labels = typeof body.labels === 'string' ? body.labels.split(',').map((l: string) => l.trim()) : (body.labels || []);
          const created: Issue = {
            id,
            iid,
            project_id: projectId,
            title: String(body.title),
            description: body.description ? String(body.description) : null,
            state: 'opened',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            confidential: Boolean(body.confidential),
            labels,
            author: {
              id: 101,
              username: 'yeraldin_reporter',
              name: 'Yeraldin Vasquez',
            },
          };

          this.issues.set(iid, created);
          res.writeHead(201, { 'content-type': 'application/json', 'x-gitlab-meta': '{"status":"ok"}' });
          res.end(JSON.stringify(created));
          return;
        }
      }

      // 3. /api/v4/projects/:id/issues/:iid
      const singleMatch = pathname.match(/^\/api\/v4\/projects\/([^/]+)\/issues\/(\d+)\/?$/);
      if (singleMatch) {
        const projectId = Number(singleMatch[1]);
        const iid = Number(singleMatch[2]);
        const issue = this.issues.get(iid);

        if (method === 'GET') {
          if (!issue || issue.project_id !== projectId) {
            res.writeHead(404, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ message: '404 Not Found' }));
            return;
          }
          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(issue));
          return;
        }

        if (method === 'PUT') {
          if (!issue || issue.project_id !== projectId) {
            res.writeHead(404, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ message: '404 Not Found' }));
            return;
          }

          if (body.title !== undefined) issue.title = String(body.title);
          if (body.description !== undefined) issue.description = String(body.description);
          if (body.state_event === 'close') issue.state = 'closed';
          if (body.state_event === 'reopen') issue.state = 'opened';
          if (body.labels !== undefined) {
            issue.labels = typeof body.labels === 'string' ? body.labels.split(',').map((l: string) => l.trim()) : body.labels;
          }
          issue.updated_at = new Date().toISOString();
          this.issues.set(iid, issue);

          res.writeHead(200, { 'content-type': 'application/json' });
          res.end(JSON.stringify(issue));
          return;
        }

        if (method === 'DELETE') {
          if (authHeader === 'glpat-test-guest-token') {
            res.writeHead(403, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ message: '403 Forbidden - Insufficient permissions to delete issue' }));
            return;
          }

          if (!issue || issue.project_id !== projectId) {
            res.writeHead(404, { 'content-type': 'application/json' });
            res.end(JSON.stringify({ message: '404 Not Found' }));
            return;
          }

          this.issues.delete(iid);
          res.writeHead(204);
          res.end();
          return;
        }
      }

      // Default fallback
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ message: '404 Endpoint Not Handled' }));
    });
  }
}

// Proxy tipis n8n -> 9router. 9router membalas SSE bila body tanpa field `stream`,
// sedangkan klien OpenAI di n8n mengharapkan JSON. Proxy ini memaksa `stream: false`
// pada permintaan chat/completions dan meneruskan semuanya apa adanya.
import http from 'node:http';

const upstream = new URL(process.env.UPSTREAM ?? 'http://host.docker.internal:20128');
const port = Number(process.env.PORT ?? 20128);

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    let body = Buffer.concat(chunks);
    if (req.method === 'POST' && req.url?.includes('/chat/completions') && body.length > 0) {
      try {
        const json = JSON.parse(body.toString('utf8'));
        json.stream = false;
        delete json.stream_options;
        body = Buffer.from(JSON.stringify(json));
      } catch {
        // body bukan JSON: teruskan apa adanya
      }
    }
    const headers = { ...req.headers, host: upstream.host, 'content-length': String(body.length) };
    const out = http.request(
      { hostname: upstream.hostname, port: upstream.port, path: req.url, method: req.method, headers },
      (up) => {
        res.writeHead(up.statusCode ?? 502, up.headers);
        up.pipe(res);
      },
    );
    out.on('error', (err) => {
      res.writeHead(502, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: { message: `llm-proxy: ${err.message}` } }));
    });
    out.end(body);
  });
});

server.listen(port, '0.0.0.0', () => console.log(`llm-proxy :${port} -> ${upstream.origin}`));

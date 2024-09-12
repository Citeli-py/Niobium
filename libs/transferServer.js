import { time } from 'console';

const VaultHandler = require('./VaultHandler');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require("path");

export class TransferServer{
    constructor(vault, port) {
        this.port = port;
        this.vault = vault;
        this.vaultHandler = new VaultHandler(vault);
        this.server = null;

        this.conected = false;
        this.lastFileRequest = -1;
    }

    handleRequest(req, res) {
        // Adiciona o cabeçalho CORS
        res.setHeader('Access-Control-Allow-Origin', '*'); // Permite todas as origens. Você pode especificar uma origem específica em vez de '*'

        if (req.method === 'OPTIONS') {
            // Trata a requisição OPTIONS, que é enviada antes de uma requisição POST para checar permissões CORS
            res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
            res.writeHead(204);
            res.end();
            return;
        }

        const parsedUrl = url.parse(req.url, true);
        
        if (parsedUrl.pathname === '/files') {
            if (req.method === 'GET') {
                this.handleGetRequest(res);

            } else if (req.method === 'POST') {
                this.handlePostRequest(req, res);

            } else {
                res.writeHead(405, {'Content-Type': 'text/plain'});
                res.end('Method Not Allowed');
            }
        } else {
            res.writeHead(404, {'Content-Type': 'text/plain'});
            res.end('Not Found');
        }
    }

    handleGetRequest(res) {
        try {
            const info = this.vaultHandler.documentsInfo(); // Chama a função e obtém o objeto
            res.writeHead(200, {'Content-Type': 'application/json'});
            res.end(JSON.stringify(info));

            // Client has connected
            this.conected = true;
        } catch (error) {
            console.error(error);
            res.writeHead(500, {'Content-Type': 'text/plain'});
            res.end('Internal Server Error');
        }
    }

    handlePostRequest(req, res) {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const filesRequest = JSON.parse(body).file; // Converte o JSON recebido em objeto
                const filePath = path.join(this.vault, filesRequest.path, filesRequest.name);

                console.log(filesRequest, filePath);

                if (fs.existsSync(filePath)) {
                    res.writeHead(200, {
                        'Content-Type': 'application/octet-stream',
                        'Content-Disposition': `attachment; filename=${filesRequest.name}`
                    });
                    const fileStream = fs.createReadStream(filePath);
                    fileStream.pipe(res);
                } else {
                    res.writeHead(404, {'Content-Type': 'text/plain'});
                    res.end(`File ${filesRequest.name} not found`);
                }

                // Update lastFileRequest Time
                this.lastFileRequest = new Date().getTime()/1000; // Seconds

            } catch (error) {
                console.error(error);
                res.writeHead(400, {'Content-Type': 'text/plain'});
                res.end('Invalid JSON or Error processing files');
            }
        });
    }

    getIP(){
        const os = require('os');

        // Obtém as interfaces de rede
        const networkInterfaces = os.networkInterfaces();

        for (const interfaceName in networkInterfaces) {
            const addresses = networkInterfaces[interfaceName];
            
            for (const addressInfo of addresses) {
                if (addressInfo.family === 'IPv4' && !addressInfo.internal) {
                    return addressInfo.address;
                }
            }
        }

        return null;
    }

    startmsg(){
        return `Server running in http://${this.getIP()}:${this.port}/`;
    }


    start() {
        this.running = true;
        this.server = http.createServer((req, res) => this.handleRequest(req, res));

        this.server.listen(this.port, (err) => {
            if (err) {
                if (err.code === 'EADDRINUSE') {
                    console.error(`Port ${this.port} is beeing used. Please, change on settings.`);
                } else {
                    console.error(`Server Error: ${err.message}`);
                }
                
                this.running = false;
            } else {
                console.log(this.startmsg());
            }
        });
    }

    stop(){
        this.server.close();
        this.running = false;
        this.lastFileRequest = 0;
    }
};
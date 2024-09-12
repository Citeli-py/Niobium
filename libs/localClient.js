const axios = require('axios');
const fs = require('fs');
const VaultHandler = require('./VaultHandler');
const path = require("path");

export class LocalClient {
    constructor(vault, serverUrl) {
        this.serverUrl = serverUrl;
        this.vault = vault;
        this.vaultHandler = new VaultHandler(vault);
    }

    async getRemoteFiles(){
        try {
            const response = await axios({
                url: `${this.serverUrl}/files`,
                method: 'get',
                responseType: 'application/json'
            });
            
            return JSON.parse(response.data);

        } catch (error) {
            console.error(`Failed to get files info from server: ${error.message}`);
            return null;
        }
    }

    async pull(){
        const remote_vault = await this.getRemoteFiles();
        if (!remote_vault)
            return false;

        console.log("REMOTE VAULT => ", remote_vault);

        var pull_files = await this.vaultHandler.pullFiles(remote_vault.files)[0];
        this.downloadMultipleFiles(pull_files);

        return true;
    }

    async downloadFile(file) {
        try {
            const response = await axios({
                url: `${this.serverUrl}/files`,
                method: 'post',
                responseType: 'arraybuffer', // Recebe a resposta como um stream
                data: {"file": file}
            });
            
            const filePath = path.join(this.vault, file.path, file.name);

            // Remove the file if it exists
            if (fs.existsSync(filePath)){
                fs.unlinkSync(filePath);
                console.log(`Removido: ${filePath}`);
            }

            // Create directories if they don't exist
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            // Write file data
            const buffer = Buffer.from(response.data);
            fs.writeFileSync(filePath, buffer);

            console.log(`File ${filePath} downloaded successfully.`);

        } catch (error) {
            console.error(`Failed to download file: ${error.message}`);
        }
    }

    async downloadMultipleFiles(files) {
        if (files.length > 0) {
            files.forEach(file => {
                this.downloadFile(file);
            });
        }
    }
}

//module.exports = LocalClient;
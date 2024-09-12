const crypto = require('crypto')
const fs = require('fs');
const path = require('path');


class VaultHandler{

    constructor(vault_name){
        this.vault = vault_name;
    }

    documentsInfo(){

        const walkDir = (dir, data) => {
            const files = fs.readdirSync(dir);

            files.forEach((file) => {

                if (file[0] !== '.'){
                    console.log(dir);

                    const filePath = path.join(dir, file);
                    const stats = fs.statSync(filePath);

                    if (stats.isDirectory()) {
                        walkDir(filePath, data);
                    } else {
                        var buffer = fs.readFileSync(filePath);

                        const hash = crypto.createHash("md5")
                        hash.update(buffer)
                        
                        var relative_path = dir.slice(this.vault.length+1);
                        data.push({
                            "path": relative_path,
                            "name": file,
                            "content_hash": hash.digest("hex"),
                        })
                    }
                }
            });
        };
        let list = [];
        // Substituir vault pelo nome da vault
        // Na documentação do obsidian vai um Vault.getRoot().path
        walkDir(this.vault, list);
        return {"files": list};
    }

    removeLocalFiles(remove_files){
        console.log("Arquivos para remover => ", remove_files);

        remove_files.forEach((file) => {
            fs.unlinkSync(file);
            console.log(`Removed: ${file}`);
        });

        //this.removeEmptyDirectories(this.vault);
    }

    filesToRemove(remote_vault){
        // Começamos com uma lista com todos os arquivos locais e vamos removendo os que existem na remote vault
        var remove_files = this.documentsInfo().files;

        remove_files = remove_files.filter(local_file => 
            !remote_vault.some(remote_file => 
                path.join(remote_file.path, remote_file.name) === path.join(local_file.path, local_file.name)));

        console.log("Remove files => ", remove_files);
        return remove_files

    }

    pullFiles(remote_vault){
        // Essa função gera o json dos arquivos que faltam no cliente
        // E remove os arquivos que não existem ou foram modificados no emissor

        const local_vault = this.documentsInfo().files;

        console.log("LOCAL_VAULT => ",local_vault);

        // Transformar local_vault em hash map
        const local_vault_hashmap = new Map();
        local_vault.forEach((file_info) =>
            local_vault_hashmap.set(path.join(this.vault, file_info.path, file_info.name), file_info)
        );

        // Selecionar quais arquivos devem ser requisitados
        var pull_files = [];
        var modified_files = [];

        // Selecionar arquivos que só existem no remoto
        remote_vault.forEach((file_info) => {
            var filepath = path.join(this.vault, file_info.path, file_info.name);
            var local_file = local_vault_hashmap.get(filepath)

            if (local_file == null) // Não existe 
                pull_files.push({"path": file_info.path, "name":file_info.name});

            else if (local_file.content_hash != file_info.content_hash){ // Modified
                pull_files.push({"path": file_info.path, "name":file_info.name});
                modified_files.push({"path": file_info.path, "name":file_info.name});
            }
            
        });

        var remove_files = this.filesToRemove(remote_vault);

        console.log("PULL_FILES => ", pull_files);
        console.log("Modified_files => ", modified_files);
        console.log("Files to remove => ", remove_files);

        return {
            pull_files: pull_files,
            modified_files: modified_files,
            remove_files: remove_files
        };
    }

    // Função para remover diretórios vazios
    removeEmptyDirectories(directory) {
        const isDirEmpty = (dirPath) => {
            return fs.readdirSync(dirPath).length === 0;
        };

        const removeDirIfEmpty = (dirPath) => {
            if (isDirEmpty(dirPath)) {
                fs.rmdirSync(dirPath);
                console.log(`Diretório vazio removido: ${dirPath}`);
                return true;
            }
            return false;
        };

        const traverseAndRemove = (dirPath) => {
            if (!fs.existsSync(dirPath)) return;

            fs.readdirSync(dirPath).forEach((file) => {
                const fullPath = path.join(dirPath, file);

                if (fs.statSync(fullPath).isDirectory()) {
                    traverseAndRemove(fullPath);
                }
            });

            // Tenta remover o diretório atual se estiver vazio
            removeDirIfEmpty(dirPath);
        };

        // Iniciar a remoção a partir do diretório principal
        traverseAndRemove(directory);
    }
};

module.exports = VaultHandler;
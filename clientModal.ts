import { LocalClient } from "libs/localClient";
import { Modal, App, Notice } from "obsidian";
import { join, dirname, extname, basename } from "path";
import {unlinkSync, renameSync} from 'fs'

interface File{
    path: string;
    name: string;
    content_hash: string;
}

export class ClientModal extends Modal {
    client: LocalClient;
    waitingTimer: NodeJS.Timer | null;
    transferTimer: NodeJS.Timer| null;
    vault_path: string;

    constructor(app: App, vault: string, serverUrl: string) {
        super(app);
        this.client = new LocalClient(vault, serverUrl);
        this.waitingTimer = null;
        this.transferTimer = null;
        this.vault_path = vault;
    }

    selectfilesUl(contentEl: HTMLElement, files: File[], className: string){

        let checked: boolean = false
        if(className === 'remove_file')
            checked = true;

        const filesUl = contentEl.createEl('dl');
        files.forEach(file => {
            const fileInput = filesUl.createEl('dt');
            fileInput.style.fontWeight = "bold";
            fileInput.style.fontSize = "18px";

            const checkbox = fileInput.createEl('input', { type: 'checkbox', cls: className});
            checkbox.checked = checked; // Por padrão, desmarcado

            let filePath: string = join(file.path, file.name);
            fileInput.appendText(`${filePath}`);
        });

        // Selecionar Todos
        const selectAllLabel = contentEl.createEl('label');
        const selectAllCheckbox = selectAllLabel.createEl('input', { type: 'checkbox'});
        selectAllCheckbox.addEventListener('change', () => {
            const checkboxes = contentEl.querySelectorAll(`input[type="checkbox"].${className}`);
            checkboxes.forEach((checkbox: HTMLInputElement) => {
                checkbox.checked = selectAllCheckbox.checked;
            });
        });

        selectAllLabel.appendText('Selecionar Todos');
    }

    operateCheckedFiles(contentEl: HTMLElement, pull_files: File[]){
        // Deletar arquivos
        const checkboxesRemove = contentEl.querySelectorAll('input[type="checkbox"].remove_file');
        checkboxesRemove.forEach((checkbox: HTMLInputElement) => {
            
            if (checkbox.checked){
                let file = checkbox.parentElement?.textContent;
                if(file){
                    // Remove arquivos
                    unlinkSync(join(this.vault_path, file));
                    console.log("Removido: ", file);
                }
            }
        });


        // Manter arquivos antigos
        const checkboxesModified = contentEl.querySelectorAll('input[type="checkbox"].modified_file');
        checkboxesModified.forEach((checkbox: HTMLInputElement) => {
            
            if (checkbox.checked){
                let file = checkbox.parentElement?.textContent;
                console.log("ALterado=>",file)
                if(file){
                    let new_file_name: string = join(dirname(file), basename(file)+'_old'+extname(file));
                    renameSync(join(this.vault_path, file), join(this.vault_path, new_file_name));
                    console.log("Alterado: ", file, '=> ', new_file_name);
                }
            }
        });

        //Fazer o pull
        console.log(pull_files);
        this.client.downloadMultipleFiles(pull_files);
    }

    selectionScreen(contentEl: HTMLElement, modified_files: File[], remove_files: File[], pull_files: File[]){

        // Subtitle
        contentEl.createEl('h3', { text: 'Escolha quais arquivos alterados você deseja manter:' });

        // Modified Files
        this.selectfilesUl(contentEl, modified_files, "modified_file");

        // Informação adicional
        const warning: HTMLElement = contentEl.createEl('p');
        warning.innerHTML = '<i> Os arquivos antigos serão renomeados como <bold>arquivo_old</bold>. </i>';
  

        // Título para exclusão de arquivos
        contentEl.createEl('h3', { text: 'Do you want to remove this files?' });

        // Removed files
        this.selectfilesUl(contentEl, remove_files, "remove_file")

        // Botão de confirmação
        const buttonDiv = contentEl.createEl('div');
        buttonDiv.style.marginTop = "30px";

        const confirmButton = buttonDiv.createEl('button', { text: 'Confirmar' });
        confirmButton.addEventListener('click', () => {
            this.operateCheckedFiles(contentEl, pull_files);
            this.close();
        });
    }

    async onOpen() {
        const { contentEl } = this;

        // Exibe a mensagem inicial com o IP e a porta
        const statusText = contentEl.createEl("h2", { text: "Trying Connection..." });
        const serverText = contentEl.createEl("p", { text: `${this.client.serverUrl}` });
        
        const remote_vault = await this.client.getRemoteFiles();

        if (!remote_vault){
            // Alterar por uma tela
            new Notice("Server can't be reached!");
            this.close();
        }

        statusText.textContent = "Files selection";
        serverText.remove();
        
        // Obter os arquivos diferentes
        // Obter os arquivos que vão ser eliminados
        const { pull_files, modified_files, remove_files }  = this.client.vaultHandler.pullFiles(remote_vault.files);

        this.selectionScreen(contentEl, modified_files, remove_files, pull_files);

        // Coisa para colocar nas próximas alterações 
        // Pedir para confirmar as alterações
        // Se deseja remover arquivos
        // Selecionar quais arquivos devem ser alterados

        //this.close();
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();

        new Notice("Client Closed");

        // Clear intervals
        if (this.waitingTimer) 
            clearInterval(this.waitingTimer);
        

        if (this.transferTimer) 
            clearInterval(this.transferTimer);
        
    }
}

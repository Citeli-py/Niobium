import { TransferServer } from "libs/transferServer";
import { Modal, App, Notice } from "obsidian";

export class ServerModal extends Modal {
    server: TransferServer;
    waitingTimer: NodeJS.Timer | null;
    transferTimer: NodeJS.Timer| null;

    constructor(app: App, server: TransferServer) {
        super(app);
        this.server = server;
        this.waitingTimer = null;
        this.transferTimer = null;
    }

    private fileTransferingTimer(TimeOut: number){

        this.transferTimer = setInterval(async () => {
            let time = new Date().getTime()/1000;
            console.log(this.server.lastFileRequest, time - this.server.lastFileRequest, TimeOut);
            if ( (this.server.lastFileRequest > 0) && ((time - this.server.lastFileRequest) > TimeOut)) {
                this.server.stop(); 
                this.close();
            }
        }, 1000); 
    }

    private connectedTimer(statusText: HTMLHeadingElement){
        let TimeOut = 2; // seconds

        this.waitingTimer = setInterval(async () => {

            if ( (this.server.conected)) {
                statusText.textContent = "Transfering files...";

                if (this.waitingTimer) {
                    clearInterval(this.waitingTimer);
                    this.fileTransferingTimer(TimeOut);
                }
                
            }

        }, 1000); 
    }

    onOpen() {
        const { contentEl } = this;

        // Exibe a mensagem inicial com o IP e a porta
        const statusText = contentEl.createEl("h2", { text: "Waiting Connection..." });
        contentEl.createEl("p", { text: `${this.server.startmsg()}` });

        this.connectedTimer(statusText);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
        this.server.stop();
        new Notice("Server Closed");

        // Clear intervals
        if (this.waitingTimer) 
            clearInterval(this.waitingTimer);
        

        if (this.transferTimer) 
            clearInterval(this.transferTimer);
        
    }
}

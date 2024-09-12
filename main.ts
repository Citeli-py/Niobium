import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, FileSystemAdapter } from 'obsidian';
import { NiobiumSettingTab } from 'settings';
import {TransferServer} from './libs/transferServer'

import {ServerModal} from './serverModal'
import {ClientModal} from "./clientModal"

// Remember to rename these classes and interfaces!

interface MyPluginSettings {
	ServerIp: string;
	ServerPort: string;
}

const DEFAULT_SETTINGS: MyPluginSettings = {
	ServerIp: "localhost",
	ServerPort: "4141"
}



export default class Niobium extends Plugin {
	settings: MyPluginSettings;
	server: TransferServer;
	vault_path: string | null;

	private getVaultPath(){
		let adapter = this.app.vault.adapter;
		if (adapter instanceof FileSystemAdapter) {
			return adapter.getBasePath();
		}
		return null;
	}

	private transferServerHandler(){
		// Called when the user clicks the icon.
		if (!this.server.running){
			new Notice(this.server.startmsg());
			console.log("Vault => ", this.server.vault)
			this.server.start();

			if(!this.server.running)
				new Notice("Server Error! Change your port.")

			new ServerModal(this.app, this.server).open();

		} else{
			this.server.stop();
			new Notice("Server Stopped");

			const statusBarItemEl = this.addStatusBarItem();
			statusBarItemEl.setText('');
		}
	}

	private localClientHandler(){
		// Called when the user clicks the icon.
		new Notice('Connecting to server');

		if(this.vault_path !== null)
			new ClientModal(this.app, this.vault_path, `http://${this.settings.ServerIp}:${this.settings.ServerPort}`).open();
		
	}

	async onload() {
		await this.loadSettings();

		this.vault_path = this.getVaultPath();
		this.server = new TransferServer(this.vault_path, this.settings.ServerPort);

		// This creates an icon in the left ribbon.
		const openServerIconEL = this.addRibbonIcon('hard-drive-upload', 'Send files', (evt: MouseEvent) => {this.transferServerHandler()});
		// Perform additional things with the ribbon
		openServerIconEL.addClass('my-plugin-ribbon-class');

		// This creates an icon in the left ribbon.
		const connectServerIconEl = this.addRibbonIcon('hard-drive-download', 'Receive files', (evt: MouseEvent) => {this.localClientHandler()});
		// Perform additional things with the ribbon
		connectServerIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('alterado');

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new NiobiumSettingTab(this.app, this));

		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {
		this.server.stop();
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


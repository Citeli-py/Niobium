import Niobium from "./main";
import { App, PluginSettingTab, Setting} from 'obsidian';


export class NiobiumSettingTab extends PluginSettingTab {
	plugin: Niobium;

	constructor(app: App, plugin: Niobium) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('IP')
			.setDesc('Server IP')
			.addText(text => text
				.setPlaceholder('Enter the server ip')
				.setValue(this.plugin.settings.ServerIp)
				.onChange(async (value) => {
					this.plugin.settings.ServerIp = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
			.setName('PORT')
			.setDesc('Server Port')
			.addText(text => text
				.setPlaceholder('Enter the server port')
				.setValue(this.plugin.settings.ServerPort)
				.onChange(async (value) => {
					this.plugin.settings.ServerPort = value;
					await this.plugin.saveSettings();
				}));		
	}
}
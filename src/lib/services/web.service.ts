import {resolve} from 'path';

import {HelperService} from './helper.service';
import {FileService} from './file.service';
import {ProjectService} from './project.service';

export interface BuildHTMLOptions {
  titleSuffix?: string;
}

export class WebService {
  private cachedSkins?: string[];

  constructor(
    private helperService: HelperService,
    private fileService: FileService,
    private projectService: ProjectService
  ) {}

  async buildHTMLContent(main: string, options?: BuildHTMLOptions) {
    const {titleSuffix} = options || {};
    const exportPath = titleSuffix;
    const {name, description} = await this.projectService.readPackageDotJson();
    const {web} = await this.projectService.readDotUnistylusRCDotJson();
    const title = !titleSuffix ? name : `${name}/${titleSuffix}`;
    const cliVersion = require('../../../package.json').version;
    const skinStylesheets = await this.getSkinStylesheets();
    const customStylesheets = (web?.styles || [])
      .map(url => `<link rel="stylesheet" href="${url}">`)
      .join('\n');
    const customScripts = (web?.scripts || [])
      .map(url => `<script url="${url}"></script>`)
      .join('\n');
    const resetStylesheet =
      exportPath === 'reset'
        ? ''
        : '<link rel="stylesheet" href="/reset/index.css">';
    const coreStylesheet =
      exportPath === 'core'
        ? ''
        : '<link rel="stylesheet" href="/core/index.css">';
    const resetScript =
      exportPath === 'reset' ? '' : '<script src="/reset/index.js"></script>';
    const coreScript =
      exportPath === 'core' ? '' : '<script src="/core/index.js"></script>';
    const headerHtml = await this.getHeaderHtml();
    const footerHtml = await this.getFooterHtml();
    return this.helperService.untabCodeBlock(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link rel="icon" type="image/x-icon" href="https://unistylus.lamnhan.com/favicon.ico">
        <title>Unistylus: ${title}</title>
        <meta name="description" content="${description}">
        <!-- All skins -->
        ${skinStylesheets}
        <!-- Basic styles -->
        ${resetStylesheet}
        ${coreStylesheet}
        <!-- Global style -->
        <link rel="stylesheet" href="https://unpkg.com/@unistylus/cli@${cliVersion}/assets/styles/index.css">
        <!-- Main style -->
        <link rel="stylesheet" href="index.css">
        <!-- Custom styles -->
        ${customStylesheets}
      </head>
      <body>

        ${headerHtml}

        <main class="uw_global-major">
          ${main}
        </main>
        
        ${footerHtml}

        <!-- Basic scripts -->
        ${resetScript}
        ${coreScript}
        <!-- Global script -->
        <script src="https://unpkg.com/@unistylus/cli@${cliVersion}/assets/scripts/index.js"></script>
        <!-- Main script -->
        <script src="index.js"></script>
        <!-- Custom scripts -->
        ${customScripts}
      </body>
      </html>
    `);
  }

  private async getHeaderHtml() {
    const {
      name,
      repository: {url: githubRepo},
    } = await this.projectService.readPackageDotJson();
    const optionItems = (await this.getSkins())
      .map(name => {
        const value = name.replace('-default', '');
        const text = value.charAt(0).toUpperCase() + value.slice(1);
        return `<option value="${value}">${text}</option>`;
      })
      .join('\n');
    return `
      <header class="uw_global-header">
        <div class="brand">
          <a href="/">${name}</a>
        </div>
        <div class="skins">
          <select id="skin-selector">
            <option value="0" disabled>Select a skin</option>
            ${optionItems}
          </select>
        </div>
        <nav class="nav">
          <a href="/">Home</a>
          <a href="${githubRepo.replace('.git', '')}" target="_blank">Github</a>
        </nav>
      </header>
    `;
  }

  private async getFooterHtml() {
    const {author, homepage} = await this.projectService.readPackageDotJson();
    return `
      <footer class="uw_global-footer">
        <div class="text">Developed by <a href="${homepage}" target="_blank">${author}</a> with 💖. Powered by <a href="https://unistylus.lamnhan.com" target="_blank">Unistylus</a>.</div>
        <ul class="links">
        <li><a href="https://lamnhan.com" target="_blank">Lam Nhan</a></li>
        <li><a href="https://unistylus.lamnhan.com/collections" target="_blank">More like this?</a></li>
        </ul>
      </footer>
    `;
  }

  private async getSkins() {
    if (this.cachedSkins) {
      return this.cachedSkins;
    }
    const items = (
      await this.fileService.listDir(resolve('src', 'skins', 'properties'))
    ).map(name => name.replace(/_|(\.scss)/g, ''));
    const defaultSkinName = items.includes('light') ? 'light' : items[0];
    this.cachedSkins = items
      .map(name => (name === defaultSkinName ? `${name}-default` : name))
      .sort(name => (name.includes('-default') ? -1 : 1));
    return this.cachedSkins;
  }

  private async getSkinStylesheets() {
    return (await this.getSkins())
      .map(name => `<link rel="stylesheet" href="/skins/${name}.css">`)
      .join('\n');
  }
}

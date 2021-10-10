import {HelperService} from './helper.service';
import {ProjectService} from './project.service';

export interface BuildHTMLOptions {
  menu?: string;
  titleSuffix?: string;
}
export class WebService {
  constructor(
    private helperService: HelperService,
    private projectService: ProjectService
  ) {}

  async buildHTMLContent(main: string, options?: BuildHTMLOptions) {
    const {menu, titleSuffix} = options || {};
    const {name, description} = await this.projectService.readPackageDotJson();
    const title = !titleSuffix ? name : `${name}/${titleSuffix}`;
    const cliVersion = require('../../../package.json').version;
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
        <!-- Helper style -->
        <link rel="stylesheet" href="https://unpkg.com/@unistylus/core@latest/css/skins/light-default.css">
        <link rel="stylesheet" href="https://unpkg.com/${name}-css@latest/reset.css">
        <link rel="stylesheet" href="https://unpkg.com/${name}-css@latest/core.css">
        <!-- Global style -->
        <link rel="stylesheet" href="https://unpkg.com/@unistylus/cli@${cliVersion}/assets/styles/index.css">
        <!-- Main style -->
        <link rel="stylesheet" href="index.css">
      </head>
      <body>

        ${headerHtml}

        <section class="uw_global-major">
          ${!menu ? '' : `<sidebar class="uw_global-menu">${menu}</sidebar>`}
          <main class="uw_global-content">${main}</main>
        </section>
        
        ${footerHtml}

        <!-- Global script -->
        <script src="https://unpkg.com/@unistylus/cli@${cliVersion}/assets/scripts/index.js"></script>
        <!-- Main script -->
        <script src="index.js"></script>
      </body>
      </html>
    `);
  }

  private async getHeaderHtml() {
    const {
      name,
      repository: {url: githubRepo},
    } = await this.projectService.readPackageDotJson();
    return `
      <header class="uw_global-header">
        <div class="brand">
          <a href="/">${name}</a>
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
}

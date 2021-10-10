import {HelperService} from './helper.service';
import {ProjectService} from './project.service';

export class WebService {
  constructor(
    private helperService: HelperService,
    private projectService: ProjectService
  ) {}

  async buildHTMLContent(main: string, menu?: string) {
    const {name: unistylusName} =
      await this.projectService.readDotUnistylusRCDotJson();
    const cliVersion = require('../../../package.json').version;
    const headerHtml = this.getHeaderHtml();
    const footerHtml = this.getFooterHtml();
    return this.helperService.untabCodeBlock(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${unistylusName} - a Unistylus collection</title>
        <meta name="description" content="The Unistylus collection: ${unistylusName}, visit unistylus.lamnhan.com">
        <!-- Helper style -->
        <link rel="stylesheet" href="https://unpkg.com/@unistylus/core@latest/css/skins/light-default.css">
        <link rel="stylesheet" href="https://unpkg.com/@unistylus/${unistylusName}-css@latest/reset.css">
        <link rel="stylesheet" href="https://unpkg.com/@unistylus/${unistylusName}-css@latest/core.css">
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
        <script src="https://unpkg.com/@unistylus/cli@${cliVersion}/assets/styles/index.js"></script>
        <!-- Main script -->
        <script src="index.js"></script>
      </body>
      </html>
    `);
  }

  private getHeaderHtml() {
    return `
      <header class="uw_global-header"></header>
    `;
  }

  private getFooterHtml() {
    return `
      <footer class="uw_global-footer"></footer>
    `;
  }
}

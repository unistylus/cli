import {HelperService} from './helper.service';

export class WebService {
  constructor(private helperService: HelperService) {}

  buildHTMLContent(main: string, menu?: string) {
    const headerHtml = this.getHeaderHtml();
    const footerHtml = this.getFooterHtml();
    const menuHtml = !menu ? '' : `<sidebar class="menu">${menu}</sidebar>`;
    return this.helperService.untabCodeBlock(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta http-equiv="X-UA-Compatible" content="IE=edge">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Unistylus</title>
        <link rel="stylesheet" href="index.css">
      </head>
      <body>
        ${headerHtml}

        <section>
          ${menuHtml}
          <main>
            ${main}
          </main>
        </section>
        
        ${footerHtml}

        <script src="index.js"></script>
      </body>
      </html>
    `);
  }

  private getHeaderHtml() {
    return `
      <header></header>
    `;
  }

  private getFooterHtml() {
    return `
      <footer></footer>
    `;
  }
}

import * as marked from 'marked';
import * as prismjs from 'prismjs';
const loadLanguages = require('prismjs/components/');

loadLanguages(['css', 'scss', 'markup', 'bash']);

marked.setOptions({
  highlight: (code, lang) => {
    if (prismjs.languages[lang]) {
      return prismjs.highlight(code, prismjs.languages[lang], lang);
    } else {
      return code;
    }
  },
});

export class MarkdownService {
  constructor() {}

  render(input: string) {
    return marked(input);
  }
}

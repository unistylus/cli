import {resolve} from 'path';

import {FileService} from './file.service';

interface ConsumerInfo {
  collection: string;
  skins: string[];
  parts: string[];
}

export class ConsumerService {
  private cachedInfo?: ConsumerInfo;

  constructor(private fileService: FileService) {}

  async getInfo() {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }
    const unistylusDotScss = await this.fileService.readText(
      resolve('src', 'unistylus.scss')
    );
    return this.parseInfo(unistylusDotScss);
  }

  buildScss({collection, skins, parts}: ConsumerInfo) {
    const skinContent = skins
      .map(name => `@import '${collection}/skins/${name}';`)
      .join('\n');
    const partContent = parts
      .map(name => `@import '${collection}/${name}';`)
      .join('\n');
    return skinContent + '\n' + partContent + '\n';
  }

  private parseInfo(content: string): ConsumerInfo {
    const contentSample = (content.match(/@import '(.*?)';/) || [])[1];
    if (!contentSample) {
      throw new Error('The file src/unistylus.scss is not valid');
    }
    // collection
    const collection = (() => {
      if (!contentSample.includes('@')) {
        const [collection] = contentSample.split('/');
        return collection;
      }
      const [org, name] = contentSample.split('/');
      return `${org}/${name}`;
    })();
    // skins
    const skinRegExpGlobal = new RegExp("skins/(.*?)';", 'g');
    const skinRegExp = new RegExp("skins/(.*?)';");
    const skins = (content.match(skinRegExpGlobal) || [])
      .map(item => (item.match(skinRegExp) || [])[1])
      .filter(item => !!item);
    // parts
    const partRegExpGlobal = new RegExp(`${collection}/(.*?)';`, 'g');
    const partRegExp = new RegExp(`${collection}/(.*?)';`);
    const parts = (content.match(partRegExpGlobal) || [])
      .map(item => (item.match(partRegExp) || [])[1])
      .filter(item => !!item && !item.includes('skins/'));
    // result
    return {collection, skins, parts};
  }
}

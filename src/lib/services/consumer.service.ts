import {resolve} from 'path';

import {FileService} from './file.service';

interface ConsumerInfo {
  collection: string;
  skins: string[];
  parts: string[];
}

export class ConsumerService {
  private PATH = resolve('src', 'unistylus.scss');
  private cachedInfo?: ConsumerInfo;

  constructor(private fileService: FileService) {}

  async getInfo() {
    if (this.cachedInfo) {
      return this.cachedInfo;
    }
    const unistylusDotScss = await this.fileService.readText(this.PATH);
    return this.parseInfo(unistylusDotScss);
  }

  async changeCollection(name: string) {
    const info = {...(await this.getInfo()), collection: name};
    return this.fileService.createFile(this.PATH, this.buildScss(info));
  }

  async addThing(name: string) {
    const currentInfo = await this.getInfo();
    const isSkin = name.includes('skins/');
    let info: ConsumerInfo;
    if (isSkin) {
      const skins = [...currentInfo.skins];
      const skinName = name.replace('skins/', '');
      if (!skins.includes(skinName)) {
        skins.push(skinName);
      }
      info = {...currentInfo, skins};
    } else {
      const parts = [...currentInfo.parts];
      if (!parts.includes(name)) {
        parts.push(name);
      }
      info = {...currentInfo, parts};
    }
    return this.fileService.createFile(this.PATH, this.buildScss(info));
  }

  async removeThing(name: string) {
    const currentInfo = await this.getInfo();
    const isSkin = name.includes('skins/');
    let info: ConsumerInfo;
    if (isSkin) {
      const skins = [...currentInfo.skins];
      const skinName = name.replace('skins/', '');
      const i = skins.indexOf(skinName);
      if (i !== -1) {
        skins.splice(i, 1);
      }
      info = {...currentInfo, skins};
    } else {
      const parts = [...currentInfo.parts];
      const i = parts.indexOf(name);
      if (i !== -1) {
        parts.splice(i, 1);
      }
      info = {...currentInfo, parts};
    }
    return this.fileService.createFile(this.PATH, this.buildScss(info));
  }

  private buildScss({collection, skins, parts}: ConsumerInfo) {
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

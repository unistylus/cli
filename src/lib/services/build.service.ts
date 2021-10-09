import {resolve} from 'path';

import {FileService} from './file.service';

export class BuildService {
  constructor(private fileService: FileService) {}

  async buildWeb(out: string, src: string) {
    // save Unistylus part
    await this.saveParts(src);
    // save index.html
    await this.saveIndex(out);
  }

  async saveIndex(dir: string) {
    this.fileService.createFile(resolve(dir, 'index.html'), 'index.html');
  }

  async saveParts(srcPath: string) {
    const names = await this.fileService.listDir(srcPath);
    await Promise.all(
      names.map(name => {
        // I. a file
        if (name.indexOf('.scss') !== -1) {
          return this.saveFile(name);
        }
        // II. a folder
        else {
          return this.saveFolder(name);
        }
      })
    );
  }

  async saveFile(path: string) {
    console.log('Save file: ' + path);
  }

  async saveFolder(path: string) {
    console.log('Save folder: ' + path);
  }
}

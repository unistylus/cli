import {resolve} from 'path';
import {blue} from 'chalk';
import {ensureDir} from 'fs-extra';

import {OK} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';

export class CleanCommand {
  constructor(private fileService: FileService) {}

  async run(path: string) {
    if (await this.fileService.exists(resolve(path))) {
      await this.fileService.clearDir(resolve(path));
      console.log(OK + 'Clean the folder: ' + blue(path));
    } else {
      await ensureDir(resolve(path));
      console.log(OK + 'Create the folder: ' + blue(path));
    }
  }
}

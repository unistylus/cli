import {resolve} from 'path';
import {blue} from 'chalk';

import {OK} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';

interface CopyOptions {
  src?: string;
  out?: string;
  clean?: boolean;
}

export class CopyCommand {
  constructor(private fileService: FileService) {}

  async run(items: string[], options: CopyOptions) {
    const src = options.src || '.';
    const out = options.out || 'dist';
    if (options.clean) {
      await this.fileService.clearDir(resolve(out));
    }
    await this.fileService.copies(items, out, src);
    console.log(OK + 'Items copied: ' + blue(items.join(', ')));
  }
}

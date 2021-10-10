import {resolve} from 'path';

import {OK} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {BuildService} from '../../lib/services/build.service';

interface BuildCommandOptions {
  out?: string;
}

export class BuildCommand {
  constructor(
    private fileService: FileService,
    private buildService: BuildService
  ) {}

  async run(options: BuildCommandOptions) {
    const {out = 'docs'} = options;
    // clear out
    await this.fileService.clearDir(resolve(out));
    // build web
    await this.buildService.buildWeb(out);
    // done
    console.log(OK + 'Web saved to: ' + out);
  }
}

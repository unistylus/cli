import * as chokidar from 'chokidar';

import {OK} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {BuildService} from '../../lib/services/build.service';

interface ServeCommandOptions {
  src?: string;
  out?: string;
}

export class ServeCommand {
  constructor(
    private fileService: FileService,
    private buildService: BuildService
  ) {}

  async run(options: ServeCommandOptions) {
    const {src = 'src', out = 'test'} = options;
    // initial build
    await this.buildService.buildWeb(out, src);
    // watch for file changes
    chokidar.watch(src).on('all', (event, path) => {
      // console.log(event, path);
    });
  }
}

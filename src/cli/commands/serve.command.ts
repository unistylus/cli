import * as chokidar from 'chokidar';

import {OK} from '../../lib/services/message.service';
import {BuildService} from '../../lib/services/build.service';

interface ServeCommandOptions {
  out?: string;
}

export class ServeCommand {
  constructor(private buildService: BuildService) {}

  async run(options: ServeCommandOptions) {
    const {out = 'test'} = options;
    await this.buildService.buildWeb(out);
    // watch for file changes
    chokidar.watch('src').on('all', (event, path) => {
      // console.log(event, path);
    });
  }
}

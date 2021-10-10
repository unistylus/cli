import {resolve} from 'path';
import {blue} from 'chalk';
import * as chokidar from 'chokidar';
import * as liveServer from 'live-server';

import {OK, INFO} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {BuildService} from '../../lib/services/build.service';

interface ServeCommandOptions {
  out?: string;
}

export class ServeCommand {
  constructor(
    private fileService: FileService,
    private buildService: BuildService
  ) {}

  async run(options: ServeCommandOptions) {
    const {out = 'test'} = options;
    // clear out
    await this.fileService.clearDir(resolve(out));
    // initial build
    await this.buildService.buildWeb(out);
    // launch live server
    liveServer.start({
      root: out,
      port: 3000,
      open: false,
      logLevel: 0,
    });
    // watch for file changes
    // TODO: for now, just rebuild -> optimize later
    chokidar.watch('src', {ignoreInitial: true}).on('all', () => {
      this.buildService.buildWeb(out);
      console.log(INFO + 'Reload dev server!');
    });
    // server is running
    console.log(
      OK + 'Development server started at: ' + blue('localhost:3000')
    );
  }
}

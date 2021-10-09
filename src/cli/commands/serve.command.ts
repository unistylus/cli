import * as chokidar from 'chokidar';

import {OK} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {ProjectService} from '../../lib/services/project.service';
import {BuildService} from '../../lib/services/build.service';

interface ServeCommandOptions {
  path?: string;
  out?: string;
}

export class ServeCommand {
  constructor(
    private fileService: FileService,
    private projectService: ProjectService,
    private buildService: BuildService
  ) {}

  async run(options: ServeCommandOptions) {
    const {path: customPath = '.', out = 'test'} = options;
    const {src = 'src', variables = {}} =
      await this.projectService.readDotUnistylusRCDotJson(customPath);
    await this.buildService.buildWeb(src, out, {
      ...this.projectService.defaultVariables,
      ...variables,
    });
    // watch for file changes
    chokidar.watch(src).on('all', (event, path) => {
      // console.log(event, path);
    });
  }
}

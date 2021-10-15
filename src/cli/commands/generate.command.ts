import {resolve} from 'path';
import {blue} from 'chalk';

import {OK} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {ProjectService} from '../../lib/services/project.service';
import {BuildService} from '../../lib/services/build.service';

export class GenerateCommand {
  constructor(
    private fileService: FileService,
    private projectService: ProjectService,
    private buildService: BuildService
  ) {}

  async run() {
    // read configs
    const {out = 'dist'} =
      await this.projectService.readDotUnistylusRCDotJson();
    // clear out
    await this.fileService.clearDir(resolve(out));
    // copy resources
    await this.buildService.buildSass(out);
    // result
    console.log(OK + 'Collection generated to: ' + blue(out));
  }
}

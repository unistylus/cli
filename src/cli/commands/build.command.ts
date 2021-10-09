import {OK} from '../../lib/services/message.service';
import {ProjectService} from '../../lib/services/project.service';
import {BuildService} from '../../lib/services/build.service';

interface BuildCommandOptions {
  path?: string;
  out?: string;
}

export class BuildCommand {
  constructor(
    private projectService: ProjectService,
    private buildService: BuildService
  ) {}

  async run(options: BuildCommandOptions) {
    const {path: customPath = '.', out = 'docs'} = options;
    const {src = 'src', variables = {}} =
      await this.projectService.readDotUnistylusRCDotJson(customPath);
    await this.buildService.buildWeb(src, out, {
      ...this.projectService.defaultVariables,
      ...variables,
    });
    console.log(OK + 'Web saved to: ' + out);
  }
}

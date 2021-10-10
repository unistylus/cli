import {OK} from '../../lib/services/message.service';
import {BuildService} from '../../lib/services/build.service';

interface BuildCommandOptions {
  out?: string;
}

export class BuildCommand {
  constructor(private buildService: BuildService) {}

  async run(options: BuildCommandOptions) {
    const {out = 'docs'} = options;
    await this.buildService.buildWeb(out);
    console.log(OK + 'Web saved to: ' + out);
  }
}

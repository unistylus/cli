import {OK} from '../../lib/services/message.service';
import {BuildService} from '../../lib/services/build.service';

interface BuildCommandOptions {
  src?: string;
  out?: string;
}

export class BuildCommand {
  constructor(private buildService: BuildService) {}

  async run(options: BuildCommandOptions) {
    const {src = 'src', out = 'docs'} = options;
    await this.buildService.buildWeb(out, src);
    console.log(OK + 'Web saved to: ' + out);
  }
}

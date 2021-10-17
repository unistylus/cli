import {resolve} from 'path';
import {blue} from 'chalk';

import {ERROR, OK} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {ConsumerService} from '../../lib/services/consumer.service';

export class RemoveCommand {
  constructor(
    private fileService: FileService,
    private consumerService: ConsumerService
  ) {}

  async run(name: string) {
    const consumerPath = resolve('src', 'unistylus.scss');
    if (!(await this.fileService.exists(consumerPath))) {
      return console.log(ERROR + 'No src/unistylus.scss found.');
    }
    await this.consumerService.removeThing(name);
    console.log(OK + `Remove ${blue(name)} from src/unistylus.scss`);
  }
}

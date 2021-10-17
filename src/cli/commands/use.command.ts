import {resolve} from 'path';
import {blue, yellow} from 'chalk';

import {ERROR, OK} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {ConsumerService} from '../../lib/services/consumer.service';

export class UseCommand {
  constructor(
    private fileService: FileService,
    private consumerService: ConsumerService
  ) {}

  async run(name: string) {
    const consumerPath = resolve('src', 'unistylus.scss');
    if (!(await this.fileService.exists(consumerPath))) {
      return console.log(ERROR + 'No src/unistylus.scss found.');
    }
    if (
      !(await this.fileService.exists(
        resolve('node_modules', name, 'package.json')
      ))
    ) {
      return console.log(
        ERROR +
          `No node_modules/${name} found, install first: $ ` +
          yellow(`unistylus i ${name}`)
      );
    }
    const info = {...(await this.consumerService.getInfo()), collection: name};
    await this.fileService.createFile(
      consumerPath,
      this.consumerService.buildScss(info)
    );
    console.log('NOTE: Some parts may not exists in the new collection!');
    console.log(OK + 'Change Unistylus collection: ', blue(name));
  }
}

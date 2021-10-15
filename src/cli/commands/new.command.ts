import {execSync} from 'child_process';
import {resolve} from 'path';
import {blue} from 'chalk';
import {capitalCase} from 'change-case';

import {OK} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {DownloadService} from '../../lib/services/download.service';

interface NewCommandOptions {
  skipGit?: boolean;
  skipInstall?: boolean;
}

export class NewCommand {
  constructor(
    private fileService: FileService,
    private downloadService: DownloadService
  ) {}

  async run(
    name: string,
    description = 'New Unistylus collection',
    commandOptions: NewCommandOptions
  ) {
    const resourceUrl =
      'https://github.com/unistylus/bootstrap/archive/latest.zip';
    const validProjectName = name
      .toLowerCase()
      .replace(/[^a-zA-Z0-9-]/g, ' ')
      .replace(/ /g, '-');
    const projectPath = resolve(validProjectName);
    // create
    await this.create(resourceUrl, projectPath);
    // modify
    await this.modify(projectPath, validProjectName, description);
    // install dependencies
    if (!commandOptions.skipInstall) {
      execSync('npm install', {stdio: 'inherit', cwd: projectPath});
    }
    // init git
    if (!commandOptions.skipGit) {
      execSync('git init', {stdio: 'inherit', cwd: projectPath});
    }
    // result
    console.log(
      OK + 'New Unistylus collection saved to: ' + blue(validProjectName)
    );
  }

  async create(resourceUrl: string, projectPath: string) {
    await this.downloadService.downloadAndUnzip(
      resourceUrl,
      projectPath + '/download.zip'
    );
  }

  async modify(projectPath: string, name: string, description: string) {
    // content
    await this.modifyContent(projectPath, name, description);
  }

  async modifyContent(projectPath: string, name: string, description: string) {
    const nameCapitalized = capitalCase(name);
    // .unistylusrc.json
    await this.fileService.changeContent(
      resolve(projectPath, '.unistylusrc.json'),
      {
        bootstrap: name,
      },
      true
    );
    // package-css.json
    const packageCSSPath = resolve(projectPath, 'package-css.json');
    await this.fileService.changeContent(
      packageCSSPath,
      {
        'The Unistylus Bootstrap collection': description,
        bootstrap: name,
        Bootstrap: nameCapitalized,
      },
      true
    );
    await this.fileService.changeContent(packageCSSPath, content =>
      content.replace(/"version(.*?),/g, '"version": "0.0.1",')
    );
    // package.json
    const packagePath = resolve(projectPath, 'package.json');
    await this.fileService.changeContent(
      packagePath,
      {
        'The Unistylus Bootstrap collection': description,
        bootstrap: name,
        Bootstrap: nameCapitalized,
      },
      true
    );
    await this.fileService.changeContent(packagePath, content =>
      content.replace(/"version(.*?),/g, '"version": "0.0.1",')
    );
    // README.md
    await this.fileService.changeContent(
      resolve(projectPath, 'README.md'),
      {
        bootstrap: name,
        Bootstrap: nameCapitalized,
      },
      true
    );
  }
}

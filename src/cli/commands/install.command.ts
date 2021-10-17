import {execSync} from 'child_process';

export class InstallCommand {
  constructor() {}

  run(name: string) {
    console.log('Install the package using NPM, could take a while.');
    execSync(`npm install ${name}`);
  }
}

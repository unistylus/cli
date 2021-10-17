import {execSync} from 'child_process';

export class UninstallCommand {
  constructor() {}

  run(name: string) {
    console.log('Uninstall the package using NPM, could take a while.');
    execSync(`npm uninstall ${name}`);
  }
}

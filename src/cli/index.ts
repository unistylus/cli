import {red} from 'chalk';
import {Command} from 'commander';
import {Lib as UnistylusModule} from '../lib/index';
import {InitCommand} from './commands/init.command';
import {GenerateCommand} from './commands/generate.command';
import {CleanCommand} from './commands/clean.command';
import {CopyCommand} from './commands/copy.command';

export class Cli {
  private unistylusModule: UnistylusModule;
  initCommand: InitCommand;
  generateCommand: GenerateCommand;
  cleanCommand: CleanCommand;
  copyCommand: CopyCommand;

  commander = ['unistylus', 'Tools for the Unistylus framework.'];

  /**
   * @param path? - Custom path to the project
   */
  initCommandDef: CommandDef = [
    ['init [path]', 'i'],
    'Add Unistylus tools to a project.',
  ];

  /**
   * @param path? - Custom path to the project
   */
  generateCommandDef: CommandDef = [
    ['generate [path]', 'g'],
    'Generate content.',
    ['-a, --api', 'Output the API.'],
  ];

  cleanCommandDef: CommandDef = [
    ['clean <path>', 'del', 'd'],
    'Clean a folder.',
  ];

  /**
   * @param out - Destination
   * @param items...? - List of items
   */
  copyCommandDef: CommandDef = [
    ['copy [items...]', 'c'],
    'Copy resources',
    ['-s, --src [value]', 'Source of items.'],
    ['-o, --out [value]', 'Copy destination.'],
    ['-c, --clean', 'Clean the output first.'],
  ];

  constructor() {
    this.unistylusModule = new UnistylusModule();
    this.initCommand = new InitCommand(
      this.unistylusModule.fileService,
      this.unistylusModule.projectService
    );
    this.generateCommand = new GenerateCommand(
      this.unistylusModule.fileService,
      this.unistylusModule.downloadService,
      this.unistylusModule.projectService
    );
    this.cleanCommand = new CleanCommand(this.unistylusModule.fileService);
    this.copyCommand = new CopyCommand(this.unistylusModule.fileService);
  }

  getApp() {
    const commander = new Command();

    // general
    const [command, description] = this.commander;
    commander
      .version(require('../../package.json').version, '-v, --version')
      .name(`${command}`)
      .usage('[options] [command]')
      .description(description);

    // init
    (() => {
      const [[command, ...aliases], description] = this.initCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .description(description)
        .action(path => this.initCommand.run(path));
    })();

    // generate
    (() => {
      const [[command, ...aliases], description, apiOpt] = this.generateCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .description(description)
        .option(...apiOpt)
        .action((path, options) => this.generateCommand.run(path, options));
    })();

    // copy
    (() => {
      const [[command, ...aliases], description, srcOpt, outOpt, cleanOpt] =
        this.copyCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .description(description)
        .option(...srcOpt)
        .option(...outOpt)
        .option(...cleanOpt)
        .action((items, options) => this.copyCommand.run(items, options));
    })();

    // clean
    (() => {
      const [[command, ...aliases], description] = this.cleanCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .description(description)
        .action(path => this.cleanCommand.run(path));
    })();

    // help
    commander
      .command('help')
      .description('Display help.')
      .action(() => commander.outputHelp());

    // *
    commander
      .command('*')
      .description('Any other command is not supported.')
      .action(cmd => console.error(red(`Unknown command '${cmd.args[0]}'`)));

    return commander;
  }
}

type CommandDef = [string | string[], string, ...Array<[string, string]>];

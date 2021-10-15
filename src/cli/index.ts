import {red} from 'chalk';
import {Command} from 'commander';
import {Lib as UnistylusModule} from '../lib/index';
import {NewCommand} from './commands/new.command';
import {GenerateCommand} from './commands/generate.command';
import {CleanCommand} from './commands/clean.command';
import {CopyCommand} from './commands/copy.command';
import {ServeCommand} from './commands/serve.command';
import {BuildCommand} from './commands/build.command';

export class Cli {
  private unistylusModule: UnistylusModule;
  newCommand: NewCommand;
  generateCommand: GenerateCommand;
  cleanCommand: CleanCommand;
  copyCommand: CopyCommand;
  serveCommand: ServeCommand;
  buildCommand: BuildCommand;

  commander = ['unistylus', 'Tools for the Unistylus framework.'];

  /**
   * @param name - The collection name
   * @param description? - The description
   */
  newCommandDef: CommandDef = [
    ['new <name> [description]', 'n'],
    'Create a new collection.',
    ['-i, --skip-install', 'Do not install dependency packages.'],
    ['-g, --skip-git', 'Do not initialize a git repository.'],
  ];

  generateCommandDef: CommandDef = [['generate', 'g'], 'Generate content.'];

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

  serveCommandDef: CommandDef = [
    ['serve', 's'],
    'Serve the collection for development.',
    ['-o, --out [value]', 'Custom output folder.'],
  ];

  buildCommandDef: CommandDef = [
    ['build', 'b'],
    'Build web.',
    ['-o, --out [value]', 'Custom output folder.'],
    ['-a, --api', 'Output the API.'],
  ];

  constructor() {
    this.unistylusModule = new UnistylusModule();
    this.newCommand = new NewCommand(
      this.unistylusModule.fileService,
      this.unistylusModule.downloadService
    );
    this.generateCommand = new GenerateCommand(
      this.unistylusModule.fileService,
      this.unistylusModule.projectService,
      this.unistylusModule.buildService
    );
    this.cleanCommand = new CleanCommand(this.unistylusModule.fileService);
    this.copyCommand = new CopyCommand(this.unistylusModule.fileService);
    this.serveCommand = new ServeCommand(
      this.unistylusModule.fileService,
      this.unistylusModule.buildService
    );
    this.buildCommand = new BuildCommand(
      this.unistylusModule.fileService,
      this.unistylusModule.buildService
    );
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

    // new
    (() => {
      const [[command, ...aliases], description, skipInstallOpt, skipGitOpt] =
        this.newCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .option(...skipInstallOpt)
        .option(...skipGitOpt)
        .description(description)
        .action((name, description, options) =>
          this.newCommand.run(name, description, options)
        );
    })();

    // generate
    (() => {
      const [[command, ...aliases], description] = this.generateCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .description(description)
        .action(() => this.generateCommand.run());
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

    // serve
    (() => {
      const [[command, ...aliases], description, outOpt] = this.serveCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .option(...outOpt)
        .description(description)
        .action(options => this.serveCommand.run(options));
    })();

    // build
    (() => {
      const [[command, ...aliases], description, outOpt, apiOpt] =
        this.buildCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .option(...outOpt)
        .option(...apiOpt)
        .description(description)
        .action(options => this.buildCommand.run(options));
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

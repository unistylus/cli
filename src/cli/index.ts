import {red} from 'chalk';
import {Command} from 'commander';
import {Lib as UnistylusModule} from '../lib/index';
import {NewCommand} from './commands/new.command';
import {GenerateCommand} from './commands/generate.command';
import {CleanCommand} from './commands/clean.command';
import {CopyCommand} from './commands/copy.command';
import {ServeCommand} from './commands/serve.command';
import {BuildCommand} from './commands/build.command';
import {JsCommand} from './commands/js.command';
import {InstallCommand} from './commands/install.command';
import {UninstallCommand} from './commands/uninstall.command';
import {UseCommand} from './commands/use.command';
import {AddCommand} from './commands/add.command';
import {RemoveCommand} from './commands/remove.command';

export class Cli {
  private unistylusModule: UnistylusModule;
  newCommand: NewCommand;
  generateCommand: GenerateCommand;
  cleanCommand: CleanCommand;
  copyCommand: CopyCommand;
  serveCommand: ServeCommand;
  buildCommand: BuildCommand;
  jsCommand: JsCommand;
  installCommand: InstallCommand;
  uninstallCommand: UninstallCommand;
  useCommand: UseCommand;
  addCommand: AddCommand;
  removeCommand: RemoveCommand;

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

  jsCommandDef: CommandDef = ['js', 'Build js package.'];

  /**
   * @param name - Name of the collection to be added
   */
  installCommandDef: CommandDef = [
    ['install <name>', 'i'],
    'Install a collection.',
  ];

  /**
   * @param name - Name of the collection to be removed
   */
  uninstallCommandDef: CommandDef = [
    ['uninstall <name>', 'un'],
    'Install a collection.',
  ];

  /**
   * @param name - Name of the collection to changed to
   */
  useCommandDef: CommandDef = [['use <name>', 'u'], 'Use a collection.'];

  /**
   * @param name - Name of the skin or part
   */
  addCommandDef: CommandDef = [['add <name>', 'a'], 'Add a skin or a part.'];

  /**
   * @param name - Name of the skin or part
   */
  removeCommandDef: CommandDef = [
    ['remove <name>', 'r'],
    'Remove a skin or a part.',
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
    this.jsCommand = new JsCommand(
      this.unistylusModule.fileService,
      this.unistylusModule.projectService
    );
    this.installCommand = new InstallCommand();
    this.uninstallCommand = new UninstallCommand();
    this.useCommand = new UseCommand(
      this.unistylusModule.fileService,
      this.unistylusModule.consumerService
    );
    this.addCommand = new AddCommand(
      this.unistylusModule.fileService,
      this.unistylusModule.consumerService
    );
    this.removeCommand = new RemoveCommand(
      this.unistylusModule.fileService,
      this.unistylusModule.consumerService
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

    // js
    (() => {
      const [command, description] = this.jsCommandDef;
      commander
        .command(command as string)
        .description(description)
        .action(() => this.jsCommand.run());
    })();

    // install
    (() => {
      const [[command, ...aliases], description] = this.installCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .description(description)
        .action(name => this.installCommand.run(name));
    })();

    // uninstall
    (() => {
      const [[command, ...aliases], description] = this.uninstallCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .description(description)
        .action(name => this.uninstallCommand.run(name));
    })();

    // use
    (() => {
      const [[command, ...aliases], description] = this.useCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .description(description)
        .action(name => this.useCommand.run(name));
    })();

    // add
    (() => {
      const [[command, ...aliases], description] = this.addCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .description(description)
        .action(name => this.addCommand.run(name));
    })();

    // remove
    (() => {
      const [[command, ...aliases], description] = this.removeCommandDef;
      commander
        .command(command)
        .aliases(aliases)
        .description(description)
        .action(name => this.removeCommand.run(name));
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

import {resolve} from 'path';
import {blue} from 'chalk';

import {OK} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {DownloadService} from '../../lib/services/download.service';
import {
  SoulGeneratingVariables,
  ProjectService,
} from '../../lib/services/project.service';

export interface GenerateOptions {
  api?: boolean;
}

export class GenerateCommand {
  constructor(
    private fileService: FileService,
    private downloadService: DownloadService,
    private projectService: ProjectService
  ) {}

  async run(customPath = '.', options: GenerateOptions) {
    // read configs
    const {
      src = 'src',
      out = 'dist',
      copies = [],
      variables = {},
    } = await this.projectService.readDotUnistylusRCDotJson(customPath);
    // clear out
    await this.fileService.clearDir(resolve(out));
    // copy resources
    await this.fileService.copies(copies, out, src);
    // generate souls
    const apiList = await this.generateSoul(src, out, {
      ...this.projectService.defaultVariables,
      ...variables,
    });
    // save api
    if (options.api) {
      await this.fileService.createJson(
        resolve(out, 'api.json'),
        apiList,
        true
      );
    }
    // result
    console.log(OK + 'Soul generated to: ' + blue(out));
  }

  async generateSoul(
    src: string,
    out: string,
    variables: SoulGeneratingVariables
  ) {
    const exportList = [] as Array<string | string[]>;

    // reset.scss
    const resetFile = 'reset.scss';
    if (await this.fileService.exists(resolve(src, resetFile))) {
      await this.fileService.copy(
        resolve(src, resetFile),
        resolve(out, resetFile)
      );
    } else {
      await this.downloadService.downloadText(
        'https://raw.githubusercontent.com/lamnhan/unistylus-material/main/src/reset.scss',
        `${out}/${resetFile}`
      );
    }
    exportList.push('reset');

    // core.scss
    const coreFile = 'core.scss';
    if (await this.fileService.exists(resolve(src, coreFile))) {
      await this.fileService.copy(
        resolve(src, coreFile),
        resolve(out, coreFile)
      );
    } else {
      await this.downloadService.downloadText(
        'https://raw.githubusercontent.com/lamnhan/unistylus-bootstrap/main/src/core.scss',
        `${out}/${coreFile}`
      );
    }
    exportList.push('core');

    // content
    const contentExportList = await this.createParts(
      'content',
      src,
      out,
      variables
    );
    exportList.push(...contentExportList);

    // form
    const formExportList = await this.createParts('form', src, out, variables);
    exportList.push(...formExportList);

    // components
    const componentsExportList = await this.createParts(
      'components',
      src,
      out,
      variables
    );
    exportList.push(...componentsExportList);

    // utilities
    const utilitiesExportList = await this.createParts(
      'utilities',
      src,
      out,
      variables
    );
    exportList.push(...utilitiesExportList);

    // full.scss
    await this.fileService.createFile(
      resolve(out, 'full.scss'),
      exportList
        .filter(item => typeof item === 'string')
        .map(name => `@import './${name}';`)
        .join('\n')
    );

    // api result
    return exportList;
  }

  async createParts(
    partGroup: string,
    src: string,
    out: string,
    variables: SoulGeneratingVariables
  ) {
    const exportList = [] as Array<string | string[]>;
    // prepare
    const soulPath = resolve(src);
    const soulOutPath = resolve(out);
    const contentPath = resolve(soulPath, partGroup);
    const contentOutPath = resolve(soulOutPath, partGroup);
    // if there is a source
    if (await this.fileService.exists(contentPath)) {
      const names = await this.fileService.listDir(contentPath);
      await Promise.all(
        names.map(name => {
          // I - a file (copy)
          if (name.indexOf('.scss') !== -1) {
            exportList.push(`${partGroup}/${name.replace('.scss', '')}`);
            return this.fileService.copy(
              resolve(contentPath, name),
              resolve(contentOutPath, name)
            );
          }
          // II - a folder
          else {
            return (async () => {
              const childNames = await this.fileService.listDir(
                contentPath + '/' + name
              );
              // II.1 - single definition
              if (childNames.length === 1 && childNames[0] === `${name}.scss`) {
                // save main
                const baseContent = await this.fileService.readText(
                  resolve(contentPath, name, `${name}.scss`)
                );
                await this.fileService.createFile(
                  resolve(contentOutPath, `${name}.scss`),
                  baseContent.replace('[base]', `.${name}`)
                );
                exportList.push(`${partGroup}/${name}`);
              }
              // II.2 - with variations
              else {
                const variantIncludes = [] as string[];
                // II.2.A - default.scss
                if (childNames.indexOf('default.scss') !== -1) {
                  const defaultContent = await this.fileService.readText(
                    resolve(contentPath, name, 'default.scss')
                  );
                  const finalDefaultContent = defaultContent.replace(
                    '[default]',
                    `.${name}, .${name}-default`
                  );
                  await Promise.all([
                    this.fileService.createFile(
                      resolve(contentOutPath, `${name}.scss`),
                      finalDefaultContent
                    ),
                    this.fileService.createFile(
                      resolve(contentOutPath, `${name}-default.scss`),
                      finalDefaultContent
                    ),
                  ]);
                  variantIncludes.push(`${name}-default`);
                }
                // II.2.B - other variants
                await Promise.all(
                  Object.keys(variables).map(variableKey =>
                    (async () => {
                      const variableValue = variables[variableKey];
                      // variable value must exits and = array or object
                      // and, the template file exists
                      if (
                        variableValue &&
                        childNames.indexOf(`${variableKey}.scss`) !== -1
                      ) {
                        // get the variant content
                        const variantContent = await this.fileService.readText(
                          resolve(contentPath, name, `${variableKey}.scss`)
                        );
                        // single variant
                        if (variableKey.indexOf('_and_') === -1) {
                          await Promise.all(
                            (variableValue instanceof Array
                              ? variableValue
                              : Object.keys(variableValue)
                            ).map((code: string | number) =>
                              (async () => {
                                // prepare replacements
                                const value =
                                  variableValue instanceof Array
                                    ? code
                                    : variableValue[code];
                                const key =
                                  variableValue instanceof Array
                                    ? (value as string)
                                    : (code as string);
                                // save files
                                await this.fileService.createFile(
                                  resolve(
                                    contentOutPath,
                                    `${name}-${key}.scss`
                                  ),
                                  variantContent
                                    .replace('[variant]', `.${name}-${key}`)
                                    .replace(/(#{\$key})/g, '' + key)
                                    .replace(/(#{\$value})/g, '' + value)
                                );
                                variantIncludes.push(`${name}-${key}`);
                              })()
                            )
                          );
                        }
                        // combined variant
                        else {
                          const variantKeys = variableKey.split('_and_');
                          // maximum 3 levels deep
                          if (variantKeys.length <= 3) {
                            const loop1VariableValue =
                              variables[variantKeys[0]];
                            const loop2VariableValue =
                              variables[variantKeys[1]];
                            const loop3VariableValue =
                              variables[variantKeys[2]];
                            if (loop1VariableValue && loop2VariableValue) {
                              const loop1 =
                                loop1VariableValue instanceof Array
                                  ? loop1VariableValue
                                  : Object.keys(loop1VariableValue);
                              const loop2 =
                                loop2VariableValue instanceof Array
                                  ? loop2VariableValue
                                  : Object.keys(loop2VariableValue);
                              for (let i = 0; i < loop1.length; i++) {
                                const code1 = loop1[i];
                                const value1 =
                                  loop1VariableValue instanceof Array
                                    ? code1
                                    : loop1VariableValue[code1];
                                const key1 =
                                  loop1VariableValue instanceof Array
                                    ? (value1 as string)
                                    : (code1 as string);
                                for (let j = 0; j < loop2.length; j++) {
                                  const code2 = loop2[j];
                                  const value2 =
                                    loop2VariableValue instanceof Array
                                      ? code2
                                      : loop2VariableValue[code2];
                                  const key2 =
                                    loop2VariableValue instanceof Array
                                      ? (value2 as string)
                                      : (code2 as string);
                                  // 2 levels
                                  if (!loop3VariableValue) {
                                    // save files
                                    await this.fileService.createFile(
                                      resolve(
                                        contentOutPath,
                                        `${name}-${key1}-${key2}.scss`
                                      ),
                                      variantContent
                                        .replace(
                                          '[variant]',
                                          `.${name}-${key1}-${key2}`
                                        )
                                        .replace(/(#{\$key1})/g, '' + key1)
                                        .replace(/(#{\$value1})/g, '' + value1)
                                        .replace(/(#{\$key2})/g, '' + key2)
                                        .replace(/(#{\$value2})/g, '' + value2)
                                    );
                                    variantIncludes.push(
                                      `${name}-${key1}-${key2}`
                                    );
                                  }
                                  // 3 levels
                                  else {
                                    const loop3 =
                                      loop3VariableValue instanceof Array
                                        ? loop3VariableValue
                                        : Object.keys(loop3VariableValue);
                                    for (let k = 0; k < loop3.length; k++) {
                                      const code3 = loop3[k];
                                      const value3 =
                                        loop3VariableValue instanceof Array
                                          ? code3
                                          : loop3VariableValue[code3];
                                      const key3 =
                                        loop3VariableValue instanceof Array
                                          ? (value3 as string)
                                          : (code3 as string);
                                      // save files
                                      await this.fileService.createFile(
                                        resolve(
                                          contentOutPath,
                                          `${name}-${key1}-${key2}-${key3}.scss`
                                        ),
                                        variantContent
                                          .replace(
                                            '[variant]',
                                            `.${name}-${key1}-${key2}-${key3}`
                                          )
                                          .replace(/(#{\$key1})/g, '' + key1)
                                          .replace(
                                            /(#{\$value1})/g,
                                            '' + value1
                                          )
                                          .replace(/(#{\$key2})/g, '' + key2)
                                          .replace(
                                            /(#{\$value2})/g,
                                            '' + value2
                                          )
                                          .replace(/(#{\$key3})/g, '' + key3)
                                          .replace(
                                            /(#{\$value3})/g,
                                            '' + value3
                                          )
                                      );
                                      variantIncludes.push(
                                        `${name}-${key1}-${key2}-${key3}`
                                      );
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    })()
                  )
                );
                // II.2.C - save main
                await this.fileService.createFile(
                  resolve(contentOutPath, `${name}-all.scss`),
                  variantIncludes
                    .map(variant => `@import './${variant}';`)
                    .join('\n')
                );
                exportList.push(`${partGroup}/${name}-all`);
                exportList.push(variantIncludes);
              }
            })();
          }
        })
      );
    }
    // save the export list
    return exportList;
  }
}

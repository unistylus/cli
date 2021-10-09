import {resolve} from 'path';
import {promisify} from 'util';
import {render} from 'sass';
const sassRender = promisify(render);

import {FileService} from './file.service';
import {
  SoulGeneratingVariables,
  ProcessPartsByGroupResult,
} from './project.service';
import {WebService} from './web.service';

export class BuildService {
  constructor(
    private fileService: FileService,
    private webService: WebService
  ) {}

  async buildWeb(src: string, out: string, variables: SoulGeneratingVariables) {
    const processedResult = await this.processParts(src, out, variables);
    // save Unistylus part
    await this.saveWebParts(processedResult);
    // save index.html
    await this.saveWebIndex(processedResult, out);
  }

  private async saveWebIndex(
    processedResult: ProcessPartsByGroupResult[],
    out: string
  ) {
    const indexContent = this.webService.buildIndex(processedResult);
    this.fileService.createFile(resolve(out, 'index.html'), indexContent);
  }

  private async saveWebParts(processedResult: ProcessPartsByGroupResult[]) {
    const menu = this.webService.buildMenu(processedResult);
    // save files
    await Promise.all(
      processedResult.map(({exportPath, scssPath, scssContent}) => {
        // ignore
        if (exportPath.includes('-all')) {
          return Promise.resolve();
        }
        // save file
        return this.saveWebFile(
          scssPath.replace('.scss', ''),
          menu,
          scssContent
        );
      })
    );
  }

  async processParts(
    src: string,
    out: string,
    variables: SoulGeneratingVariables
  ) {
    const processedResult = [] as ProcessPartsByGroupResult[];
    // content
    const contentGroupResult = await this.processPartsByGroup(
      'content',
      src,
      out,
      variables
    );
    processedResult.push(...contentGroupResult);
    // form
    const formGroupResult = await this.processPartsByGroup(
      'form',
      src,
      out,
      variables
    );
    processedResult.push(...formGroupResult);
    // components
    const componentsGroupResult = await this.processPartsByGroup(
      'components',
      src,
      out,
      variables
    );
    processedResult.push(...componentsGroupResult);
    // utilities
    const utilitiesGroupResult = await this.processPartsByGroup(
      'utilities',
      src,
      out,
      variables
    );
    processedResult.push(...utilitiesGroupResult);
    // result
    return processedResult;
  }

  private async processPartsByGroup(
    partGroup: string,
    src: string,
    out: string,
    variables: SoulGeneratingVariables
  ) {
    const soulPath = resolve(src);
    const soulOutPath = resolve(out);
    const contentPath = resolve(soulPath, partGroup);
    const contentOutPath = resolve(soulOutPath, partGroup);
    // no source
    if (!(await this.fileService.exists(contentPath))) {
      return [];
    }
    // if there is a source
    const result = [] as ProcessPartsByGroupResult[];
    const names = await this.fileService.listDir(contentPath);
    await Promise.all(
      names.map(async name => {
        // I - a file
        if (name.indexOf('.scss') !== -1) {
          result.push({
            exportPath: `${partGroup}/${name.replace('.scss', '')}`,
            scssPath: resolve(contentOutPath, name),
            scssContent: await this.fileService.readText(
              resolve(contentPath, name)
            ),
          });
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
              result.push({
                exportPath: `${partGroup}/${name}`,
                scssPath: resolve(contentOutPath, `${name}.scss`),
                scssContent: baseContent.replace('[base]', `.${name}`),
              });
            }
            // II.2 - with variations
            else {
              const subResult = [] as Array<ProcessPartsByGroupResult>;
              // II.2.A - default.scss
              if (childNames.indexOf('default.scss') !== -1) {
                const defaultContent = await this.fileService.readText(
                  resolve(contentPath, name, 'default.scss')
                );
                subResult.push({
                  exportPath: name,
                  scssPath: resolve(contentOutPath, `${name}.scss`),
                  scssContent: defaultContent.replace('[default]', `.${name}`),
                });
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
                              subResult.push({
                                exportPath: `${name}-${key}`,
                                scssPath: resolve(
                                  contentOutPath,
                                  `${name}-${key}.scss`
                                ),
                                scssContent: variantContent
                                  .replace('[variant]', `.${name}-${key}`)
                                  .replace(/(#{\$key})/g, '' + key)
                                  .replace(/(#{\$value})/g, '' + value),
                              });
                            })()
                          )
                        );
                      }
                      // combined variant
                      else {
                        const variantKeys = variableKey.split('_and_');
                        // maximum 3 levels deep
                        if (variantKeys.length <= 3) {
                          const loop1VariableValue = variables[variantKeys[0]];
                          const loop2VariableValue = variables[variantKeys[1]];
                          const loop3VariableValue = variables[variantKeys[2]];
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
                                  subResult.push({
                                    exportPath: `${name}-${key1}-${key2}`,
                                    scssPath: resolve(
                                      contentOutPath,
                                      `${name}-${key1}-${key2}.scss`
                                    ),
                                    scssContent: variantContent
                                      .replace(
                                        '[variant]',
                                        `.${name}-${key1}-${key2}`
                                      )
                                      .replace(/(#{\$key1})/g, '' + key1)
                                      .replace(/(#{\$value1})/g, '' + value1)
                                      .replace(/(#{\$key2})/g, '' + key2)
                                      .replace(/(#{\$value2})/g, '' + value2),
                                  });
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
                                    subResult.push({
                                      exportPath: `${name}-${key1}-${key2}-${key3}`,
                                      scssPath: resolve(
                                        contentOutPath,
                                        `${name}-${key1}-${key2}-${key3}.scss`
                                      ),
                                      scssContent: variantContent
                                        .replace(
                                          '[variant]',
                                          `.${name}-${key1}-${key2}-${key3}`
                                        )
                                        .replace(/(#{\$key1})/g, '' + key1)
                                        .replace(/(#{\$value1})/g, '' + value1)
                                        .replace(/(#{\$key2})/g, '' + key2)
                                        .replace(/(#{\$value2})/g, '' + value2)
                                        .replace(/(#{\$key3})/g, '' + key3)
                                        .replace(/(#{\$value3})/g, '' + value3),
                                    });
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
              // II.2.C - all file
              result.push(
                {
                  exportPath: `${partGroup}/${name}-all`,
                  scssPath: resolve(contentOutPath, `${name}-all.scss`),
                  scssContent: subResult
                    .map(item => `@import './${item.exportPath}';`)
                    .join('\n'),
                },
                ...subResult
              );
            }
          })();
        }
      })
    );
    // result
    return result;
  }

  private async saveWebFile(outDir: string, menu: string, scss: string) {
    // html
    const html = 'TODO: ...';
    this.fileService.createFile(
      resolve(outDir, 'index.html'),
      this.webService.buildHTMLContent(html, menu)
    );
    // css
    const {css: cssBuffer} = await sassRender({data: scss});
    await this.fileService.createFile(
      resolve(outDir, 'index.css'),
      cssBuffer.toString()
    );
    // js
    await this.fileService.createFile(
      resolve(outDir, 'index.js'),
      'console.log("No JS available!")'
    );
  }
}

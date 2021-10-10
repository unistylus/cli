import {resolve} from 'path';
import {promisify} from 'util';
import {render} from 'sass';
const sassRender = promisify(render);

import {HelperService} from './helper.service';
import {FileService} from './file.service';
import {DownloadService} from './download.service';
import {
  ProjectService,
  PartProcessedResult,
  PartProcessedItem,
} from './project.service';
import {WebService} from './web.service';

export class BuildService {
  constructor(
    private helperService: HelperService,
    private fileService: FileService,
    private downloadService: DownloadService,
    private projectService: ProjectService,
    private webService: WebService
  ) {}

  async buildWeb(out: string) {
    const processedResult = await this.processParts(out);
    // save Unistylus parts
    await this.saveWebParts(processedResult);
    // save index.html
    await this.saveWebIndex(processedResult, out);
  }

  async processParts(out: string) {
    const processedResult = [] as PartProcessedResult;
    // reset.scss
    const resetProcessedResult = await this.processPartByIndividual(
      out,
      'reset.scss',
      'https://raw.githubusercontent.com/lamnhan/unistylus-material/main/src/reset.scss'
    );
    processedResult.push(resetProcessedResult);
    // core.scss
    const coreProcessedResult = await this.processPartByIndividual(
      out,
      'core.scss',
      'https://raw.githubusercontent.com/lamnhan/unistylus-bootstrap/main/src/core.scss'
    );
    processedResult.push(coreProcessedResult);
    // by groups
    const groups = (await this.fileService.listDir('src'))
      .filter(path => path.indexOf('.scss') === -1)
      .map(path => path.replace(/\\/g, '/').split('/').pop() as string);
    await Promise.all(
      groups.map(group =>
        (async () => {
          const contentGroupResult = await this.processPartsByGroup(group, out);
          processedResult.push(...contentGroupResult);
        })()
      )
    );
    // result
    return processedResult;
  }

  private async processPartByIndividual(
    out: string,
    file: string,
    remoteUrl: string
  ) {
    const scssContent = (await this.fileService.exists(resolve('src', file)))
      ? await this.fileService.readText(resolve('src', file))
      : await this.downloadService.fetchText(remoteUrl);
    return {
      exportPath: file.replace('.scss', ''),
      scssPath: resolve(out, file),
      scssContent,
    } as PartProcessedItem;
  }

  private async processPartsByGroup(partGroup: string, out: string) {
    const {variables: customVariables = {}} =
      await this.projectService.readDotUnistylusRCDotJson();
    const soulPath = resolve('src');
    const soulOutPath = resolve(out);
    const contentPath = resolve(soulPath, partGroup);
    const contentOutPath = resolve(soulOutPath, partGroup);
    const variables = {
      ...this.projectService.defaultVariables,
      ...customVariables,
    };
    // no source
    if (!(await this.fileService.exists(contentPath))) {
      return [];
    }
    // if there is a source
    const result = [] as PartProcessedResult;
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
              const subResult = [] as PartProcessedItem[];
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
                subResult.map(item => {
                  item.exportPath = `${partGroup}/${item.exportPath}`;
                  return item;
                })
              );
            }
          })();
        }
      })
    );
    // result
    return result;
  }

  private async saveWebIndex(
    processedResult: PartProcessedResult,
    out: string
  ) {
    const indexContent = 'TODO: ...';
    this.fileService.createFile(resolve(out, 'index.html'), indexContent);
  }

  private async saveWebParts(processedResult: PartProcessedResult) {
    await Promise.all(
      this.helperService
        .flatNestedArray<PartProcessedItem>(processedResult)
        .map(
          processedItem =>
            processedItem.exportPath.includes('-all')
              ? this.createWebFileAll(processedItem, processedResult) // all (parent)
              : this.createWebFileIndividual(processedItem, processedResult) // individual file (child)
        )
    );
  }

  private async createWebFileAll(
    processedItem: PartProcessedItem,
    processedResult: PartProcessedResult
  ) {
    const {scssPath} = processedItem;
    const outDir = scssPath.replace('.scss', '');
    // main
    const main = 'TODO: ...';
    this.fileService.createFile(
      resolve(outDir, 'index.html'),
      await this.webService.buildHTMLContent(main)
    );
  }

  private async createWebFileIndividual(
    processedItem: PartProcessedItem,
    processedResult: PartProcessedResult
  ) {
    const {exportPath, scssPath, scssContent} = processedItem;
    const outDir = scssPath.replace('.scss', '');
    // html
    const templateName = exportPath.split('-').shift() as string;
    const vendorTemplatePath = resolve(
      'node_modules',
      '@unistylus',
      'cli',
      'assets',
      'templates',
      `${templateName}.html`
    );
    const customTemplatePath = resolve(
      'unistylus',
      'templates',
      `${templateName}.html`
    );
    const templatePath = (await this.fileService.exists(vendorTemplatePath))
      ? vendorTemplatePath
      : (await this.fileService.exists(customTemplatePath))
      ? customTemplatePath
      : '';
    const html = !templatePath
      ? '<p>No template found!</p>'
      : (await this.fileService.readText(templatePath)).replace(
          /\[class\]/g,
          exportPath.split('/').pop() as string
        );
    this.fileService.createFile(
      resolve(outDir, 'index.html'),
      await this.webService.buildHTMLContent(html, {
        titleSuffix: exportPath,
        menu: '', // TODO: ...
      })
    );
    // css
    const {css: cssBuffer} = await sassRender({data: scssContent});
    await this.fileService.createFile(
      resolve(outDir, 'index.css'),
      cssBuffer.toString()
    );
    // js
    await this.fileService.createFile(
      resolve(outDir, 'index.js'),
      '// No JS available!'
    );
  }
}

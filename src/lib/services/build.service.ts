import {resolve} from 'path';
import {promisify} from 'util';
import {render} from 'sass';
const sassRender = promisify(render);
import * as ts from 'typescript';

import {HelperService} from './helper.service';
import {FileService} from './file.service';
import {DownloadService} from './download.service';
import {MarkdownService} from './markdown.service';
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
    private markdownService: MarkdownService,
    private projectService: ProjectService,
    private webService: WebService
  ) {}

  async buildSource(out: string) {
    const {copies} = await this.projectService.readDotUnistylusRCDotJson();
    const processedResult = await this.processParts(out);
    // save parts
    await this.saveSourceParts(processedResult);
    // full.scss
    await this.fileService.createFile(
      resolve(out, 'full.scss'),
      processedResult
        .filter(item => !(item instanceof Array))
        .map(item => `@use './${(item as PartProcessedItem).exportPath}';`)
        .join('\n')
    );
    // full.ts
    await this.fileService.createFile(
      resolve(out, 'full.ts'),
      processedResult
        .filter(item => !(item instanceof Array) && item.tsContent)
        .map(
          item =>
            `import './${(item as PartProcessedItem).exportPath.replace(
              '-all',
              ''
            )}';`
        )
        .join('\n')
    );
    // copy resources
    if (copies) {
      await this.fileService.copies(copies, out, 'src');
    }
  }

  async buildWeb(out: string, withAPI = false) {
    const {webCopies} = await this.projectService.readDotUnistylusRCDotJson();
    const processedResult = await this.processParts(out);
    // save parts
    await this.saveWebParts(processedResult);
    // save index.html
    await this.saveWebIndex(processedResult, out);
    // save group indexes
    await this.saveWebGroupIndexes(processedResult, out);
    // save api
    if (withAPI) {
      const apiList = processedResult.map(item => {
        if (!(item instanceof Array)) {
          return item.exportPath;
        }
        return item.map(subItem => subItem.exportPath);
      });
      await this.fileService.createJson(
        resolve(out, 'api.json'),
        apiList,
        true
      );
    }
    // copies resources
    if (webCopies) {
      await this.fileService.copies(webCopies, out);
    }
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
    await Promise.all(
      (
        await this.getPartGroups()
      ).map(group =>
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
      ...(await this.getTsData(file, out)),
    } as PartProcessedItem;
  }

  private async processPartsByGroup(partGroup: string, out: string) {
    const {variables: customVariables = {}} =
      await this.projectService.readDotUnistylusRCDotJson();
    const scssPath = resolve('src');
    const scssOutPath = resolve(out);
    const contentPath = resolve(scssPath, partGroup);
    const contentOutPath = resolve(scssOutPath, partGroup);
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
    const names = (await this.fileService.listDir(contentPath)).filter(
      name => !name.includes('.ts')
    );
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
            ...(await this.getTsData(`${partGroup}/${name}`, contentOutPath)),
          });
        }
        // II - a folder
        else {
          return (async () => {
            const childNames = await this.fileService.listDir(
              contentPath + '/' + name
            );
            // II.1 - single definition
            if (childNames[0] === `${name}.scss`) {
              // save main
              const baseContent = await this.fileService.readText(
                resolve(contentPath, name, `${name}.scss`)
              );
              result.push({
                exportPath: `${partGroup}/${name}`,
                scssPath: resolve(contentOutPath, `${name}.scss`),
                scssContent: baseContent.replace('[base]', `.${name}`),
                ...(await this.getTsData(
                  `${partGroup}/${name}/${name}`,
                  contentOutPath
                )),
              });
            }
            // II.2 - with variations
            else {
              const subResult = [] as PartProcessedItem[];
              const sharedTsData = await this.getTsData(
                `${partGroup}/${name}/${name}`,
                contentOutPath
              );
              // II.2.A - default.scss
              if (childNames.indexOf('default.scss') !== -1) {
                const defaultContent = await this.fileService.readText(
                  resolve(contentPath, name, 'default.scss')
                );
                subResult.push({
                  exportPath: name,
                  scssPath: resolve(contentOutPath, `${name}.scss`),
                  scssContent: defaultContent.replace('[default]', `.${name}`),
                  ...sharedTsData,
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
                                ...sharedTsData,
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
                                    ...sharedTsData,
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
                                      ...sharedTsData,
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
                    .map(item => `@use './${item.exportPath}';`)
                    .join('\n'),
                  ...sharedTsData,
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

  private async saveSourceParts(processedResult: PartProcessedResult) {
    await Promise.all(
      this.helperService
        .flatNestedArray<PartProcessedItem>(processedResult)
        .map(async processedItem => {
          await this.fileService.createFile(
            processedItem.scssPath,
            processedItem.scssContent
          );
          if (
            processedItem.tsPath &&
            processedItem.tsContent &&
            !(await this.fileService.exists(processedItem.tsPath)) // ignore if already exists (for variants)
          ) {
            await this.fileService.createFile(
              processedItem.tsPath,
              processedItem.tsContent
            );
          }
        })
    );
  }

  private async saveWebIndex(
    processedResult: PartProcessedResult,
    out: string
  ) {
    const recordItems: Record<string, 'folder' | 'file'> = {};
    processedResult
      .filter(item => !(item instanceof Array))
      .forEach(item => {
        const {exportPath} = item as PartProcessedItem;
        if (exportPath.includes('/')) {
          const group = exportPath.split('/').shift() as string;
          if (recordItems[group]) return;
          recordItems[group] = 'folder';
        } else {
          const single = `${exportPath}.scss`;
          if (recordItems[single]) return;
          recordItems[single] = 'file';
        }
      });
    const ulItems = Object.keys(recordItems)
      .sort((a, b) => (a.includes('.scss') ? (a > b ? 1 : -1) : 1))
      .map(name => {
        const type = recordItems[name];
        return `
          <li class="${type}">
            <a href="/${name.replace('.scss', '')}">${name}</a>
          </li>
        `;
      })
      .join('\n');
    const {name: packageName, version: packageVersion} =
      await this.projectService.readPackageDotJson();
    const installContent = this.markdownService.render(
      this.helperService.untabCodeBlock(`
      Install the package:

      \`\`\`bash
      npm i ${packageName}
      \`\`\`

      Or, include CDN links:

      \`\`\`html
      <!-- CSS -->
      <link rel="stylesheet" href="https://unpkg.com/${packageName}-css@${packageVersion}/core.css">

      <!-- JS -->
      <script src="https://unpkg.com/${packageName}-js@${packageVersion}/core.js"></script>
      \`\`\`
      `)
    );
    // html
    const main = this.helperService.untabCodeBlock(`
      <section class="section">
        <div class="head">Browse groups</div>
        <div class="body">
          <ul>
            ${ulItems}
          </ul>
        </div>
      </section>
      <section class="section">
        <div class="head">Install</div>
        <div class="body">
          ${installContent}
        </div>
      </section>
    `);
    await this.fileService.createFile(
      resolve(out, 'index.html'),
      await this.webService.buildHTMLContent(main)
    );
    // css
    await this.fileService.createFile(
      resolve(out, 'index.css'),
      this.helperService.untabCodeBlock(`
      ul {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-wrap: nowrap;
      }
      ul li {
        margin-right: 1rem;
      }
      `)
    );
    // js
    await this.fileService.createFile(
      resolve(out, 'index.js'),
      '// no scripts'
    );
  }

  private async saveWebGroupIndexes(
    processedResult: PartProcessedResult,
    out: string
  ) {
    const builder = async (group: string) => {
      const ulItems = processedResult
        .filter(
          item =>
            !(item instanceof Array) &&
            (item as PartProcessedItem).exportPath.includes(`${group}/`)
        )
        .sort((a, b) => {
          const aPath = (a as PartProcessedItem).exportPath
            .split('/')
            .pop() as string;
          const bPath = (b as PartProcessedItem).exportPath
            .split('/')
            .pop() as string;
          return aPath > bPath ? 1 : aPath < bPath ? -1 : 0;
        })
        .map(item => {
          const {exportPath} = item as PartProcessedItem;
          const name = (exportPath.split('/').pop() as string).replace(
            '-all',
            ''
          );
          return `
            <li>
              <a href="/${exportPath.replace('.scss', '')}">${name}</a>
            </li>
          `;
        })
        .join('\n');
      // html
      const main = this.helperService.untabCodeBlock(`
        <section class="section">
          <div class="head">Browse parts</div>
          <div class="body">
            <ul>
              ${ulItems}
            </ul>
          </div>
        </section>   
      `);
      await this.fileService.createFile(
        resolve(out, group, 'index.html'),
        await this.webService.buildHTMLContent(main, {titleSuffix: group})
      );
      // css
      await this.fileService.createFile(
        resolve(out, group, 'index.css'),
        '// no styles'
      );
      // js
      await this.fileService.createFile(
        resolve(out, group, 'index.js'),
        '// no scripts'
      );
    };
    return Promise.all(
      (await this.getPartGroups()).map(group => builder(group))
    );
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
    const {exportPath, scssPath} = processedItem;
    const outDir = scssPath.replace('.scss', '');
    // get index of the processed item
    let itemIndex = 0;
    processedResult.forEach((item, i) => {
      if (
        !(item instanceof Array) &&
        item.exportPath === processedItem.exportPath
      ) {
        itemIndex = i;
      }
    });
    // extract children
    const childItems = processedResult[itemIndex + 1] as PartProcessedItem[];
    const ulItems = (!(childItems instanceof Array) ? [] : childItems)
      .map(item => {
        const name = item.exportPath.split('/').pop() as string;
        return `
          <li><a href="/${item.exportPath}">${name}</a></li>
        `;
      })
      .join('\n');
    const usageHtml = await this.getUsage(exportPath);
    // html
    const main = this.helperService.untabCodeBlock(`
      <section class="section">
        <div class="head">Part variants</div>
        <div class="body">
          <ul>
            ${ulItems}
          </ul>
        </div>
      </section>
      <section class="section">
        <div class="head">Usage - <strong>NOT RECOMMENED</strong></div>
        <div class="body">
          ${usageHtml}
        </div>
      </section>
    `);
    await this.fileService.createFile(
      resolve(outDir, 'index.html'),
      await this.webService.buildHTMLContent(main, {
        titleSuffix: exportPath.replace('-all', ''),
      })
    );
    // css
    await this.fileService.createFile(
      resolve(outDir, 'index.css'),
      '// no styles'
    );
    // js
    await this.fileService.createFile(
      resolve(outDir, 'index.js'),
      '// no scripts'
    );
  }

  private async createWebFileIndividual(
    processedItem: PartProcessedItem,
    processedResult: PartProcessedResult
  ) {
    const {exportPath, scssPath, scssContent, tsContent} = processedItem;
    const outDir = scssPath.replace('.scss', '');
    // html
    const templatePath = await this.getTemplatePath(exportPath);
    const templateHTML = !templatePath
      ? '<p>No preview available!</p>'
      : (await this.fileService.readText(templatePath)).replace(
          /\[class\]/g,
          exportPath.split('/').pop() as string
        );
    const usageHtml = await this.getUsage(exportPath, templateHTML);
    const main = this.helperService.untabCodeBlock(`
      <section class="section preview">
        <div class="head">Preview</div>
        <div class="body">
          <div class="inner">
            ${templateHTML}
          </div>
        </div>
      </section>
      <section class="section">
        <div class="head">Usage</div>
        <div class="body">
          ${usageHtml}
        </div>
      </section>
    `);
    this.fileService.createFile(
      resolve(outDir, 'index.html'),
      await this.webService.buildHTMLContent(main, {
        titleSuffix: exportPath,
      })
    );
    // css
    const {css: cssBuffer} = await sassRender({
      data: scssContent,
      includePaths: ['src', 'node_modules'],
    });
    await this.fileService.createFile(
      resolve(outDir, 'index.css'),
      cssBuffer.toString()
    );
    // js
    let jsContent = '// No JS';
    if (tsContent) {
      const transpileResult = ts.transpileModule(tsContent, {
        compilerOptions: {
          module: ts.ModuleKind.None,
          target: ts.ScriptTarget.ES5,
        },
      });
      jsContent = transpileResult.outputText;
    }
    await this.fileService.createFile(resolve(outDir, 'index.js'), jsContent);
  }

  private async getPartGroups() {
    const {excludes: customExcludes = []} =
      await this.projectService.readDotUnistylusRCDotJson();
    const excludes = [...customExcludes, 'skins'];
    return (await this.fileService.listDir('src'))
      .filter(path => !path.includes('.scss') && !path.includes('.ts'))
      .map(path => path.replace(/\\/g, '/').split('/').pop() as string)
      .filter(group => !excludes.includes(group));
  }

  private getTemplatePath(exportPath: string) {
    const posibleTemplatePaths: string[] = [];
    const exportPathDirs = exportPath.split('/');
    const exportPathFileSplits = (exportPathDirs.pop() as string).split('-');
    const exportPathPrefix = !exportPathDirs.length
      ? ''
      : exportPathDirs.join('/') + '/';
    exportPathFileSplits.forEach((_, i) => {
      const templateName =
        exportPathPrefix + exportPathFileSplits.slice(0, i + 1).join('-');
      posibleTemplatePaths.push(
        // custom
        resolve('unistylus', 'templates', `${templateName}.html`),
        // vendor templates
        resolve(
          'node_modules',
          '@unistylus',
          'cli',
          'assets',
          'templates',
          `${templateName}.html`
        )
      );
    });
    // check template
    return this.fileService.anyExists(posibleTemplatePaths);
  }

  private async getUsage(exportPath: string, html?: string) {
    const {name, version} = await this.projectService.readPackageDotJson();
    return this.markdownService.render(
      this.helperService.untabCodeBlock(
        `
        - Step 1: **Import the style**

        Using the CLI:

        \`\`\`bash
        unistylus add "${exportPath}"
        \`\`\`

        Or, include SCSS:

        \`\`\`scss
        @use '${name}/${exportPath}';
        \`\`\`

        Or, include CSS:

        \`\`\`html
        <link rel="stylesheet" href="https://unpkg.com/${name}-css@${version}/${exportPath}.css">
        \`\`\`

        - Step 2: **Use the class**

        \`\`\`html
        ${html || '<!-- See the list of classes above. -->'}
        \`\`\`
        `,
        8
      )
    );
  }

  private async getTsData(fileOrFolder: string, outPath: string) {
    let tsData: undefined | {tsPath: string; tsContent: string};
    const tsSrcPath = resolve('src', fileOrFolder.replace('.scss', '') + '.ts');
    if (await this.fileService.exists(tsSrcPath)) {
      const pathSegments = fileOrFolder.split('/');
      const tsLocation = pathSegments.pop() as string;
      tsData = {
        tsPath: resolve(outPath, tsLocation.replace('.scss', '') + '.ts'),
        tsContent: await this.fileService.readText(tsSrcPath),
      };
    }
    return tsData;
  }
}

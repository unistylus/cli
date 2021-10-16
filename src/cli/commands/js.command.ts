import {execSync} from 'child_process';
import {resolve} from 'path';
import {rollup} from 'rollup';
import {minify} from 'terser';

import {ERROR} from '../../lib/services/message.service';
import {FileService} from '../../lib/services/file.service';
import {ProjectService} from '../../lib/services/project.service';

export class JsCommand {
  constructor(
    private fileService: FileService,
    private projectService: ProjectService
  ) {}

  async run() {
    const {out = 'dist'} =
      await this.projectService.readDotUnistylusRCDotJson();
    // clear out
    await this.fileService.clearDir(resolve(`${out}-js`));
    // transpile ts
    execSync('npx tsc -p tsconfig.prod.json');
    // bundle js
    await this.bundleJs(out);
  }

  private async bundleJs(out: string) {
    const jsFiles = (
      await this.fileService.listDirDeep(resolve(`${out}-js`, 'esm'))
    )
      .filter(path => path.endsWith('.js'))
      .map(path =>
        (path.split('esm').pop() as string).replace(/\\/g, '/').substr(1)
      );
    return Promise.all(
      jsFiles.map(async path => {
        try {
          // bundle
          const bundle = await rollup({
            input: resolve(`${out}-js`, 'esm', path),
          });
          const {output} = await bundle.generate({
            format: 'iife',
            sourcemap: true,
          });
          const codeChunks: string[] = [];
          for (const chunkOrAsset of output) {
            if (chunkOrAsset.type !== 'asset') {
              codeChunks.push(chunkOrAsset.code);
            }
          }
          // minify
          const {code = '', map} = await minify(codeChunks.join('\n'), {
            sourceMap: {
              filename: path,
              url: `${path}.map`,
            },
          });
          // save files
          await this.fileService.createFile(resolve(`${out}-js`, path), code);
          await this.fileService.createFile(
            resolve(`${out}-js`, `${path}.map`),
            !map ? '' : typeof map === 'string' ? map : JSON.stringify(map)
          );
          // done
          await bundle.close();
        } catch (e) {
          console.log(ERROR + 'Bundle failed.');
        }
      })
    );
  }
}

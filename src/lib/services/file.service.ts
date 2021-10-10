import {resolve} from 'path';
import {
  pathExists,
  readFile,
  readJson,
  writeJson,
  outputFile,
  remove,
  ensureDir,
  copy as fsCopy,
  readdir,
} from 'fs-extra';
import * as recursiveReaddir from 'recursive-readdir';
import * as del from 'del';

export class FileService {
  constructor() {}

  exists(path: string) {
    return pathExists(path);
  }

  async anyExists(paths: string[]) {
    let result = '';
    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      if (await this.exists(path)) {
        result = path;
        break;
      }
    }
    return result;
  }

  readText(filePath: string) {
    return readFile(filePath, 'utf8');
  }

  createFile(filePath: string, content: string) {
    return outputFile(filePath, content);
  }

  readJson<T>(filePath: string) {
    return readJson(filePath) as Promise<T>;
  }

  createJson<T>(filePath: string, jsonData: T, compact = false) {
    return writeJson(filePath, jsonData, {spaces: compact ? 0 : 2});
  }

  removeFiles(paths: string[]) {
    return Promise.all(paths.map(filePath => remove(filePath)));
  }

  copy(src: string, dest: string) {
    return fsCopy(src, dest);
  }

  copies(copies: string[] | Record<string, string>, dest: string, src = '.') {
    return Promise.all(
      copies instanceof Array
        ? copies.map(path => fsCopy(resolve(src, path), resolve(dest, path)))
        : Object.keys(copies).map(key =>
            fsCopy(resolve(src, key), resolve(dest, copies[key]))
          )
    );
  }

  async clearDir(path: string) {
    await del(path);
    return ensureDir(path);
  }

  async changeContent(
    filePath: string,
    modifier: {[str: string]: string} | ((content: string) => string),
    multipleReplaces = false
  ) {
    let content = await readFile(filePath, 'utf8');
    if (modifier instanceof Function) {
      content = modifier(content);
    } else {
      Object.keys(modifier).forEach(
        str =>
          (content = content.replace(
            !multipleReplaces ? str : new RegExp(str, 'g'),
            modifier[str]
          ))
      );
    }
    return outputFile(filePath, content);
  }

  listDir(path: string) {
    return readdir(path);
  }

  listDirDeep(path: string, ignores: string[] = []) {
    return recursiveReaddir(path, ignores);
  }
}

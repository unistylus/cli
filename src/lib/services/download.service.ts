import {resolve} from 'path';
import axios from 'axios';

import {FileService} from './file.service';

export class DownloadService {
  constructor(private fileService: FileService) {}

  async downloadText(url: string, filePath: string) {
    const response = await axios({
      method: 'GET',
      url,
      responseType: 'text',
    });
    await this.fileService.createFile(resolve(filePath), response.data);
  }
}

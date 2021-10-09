import {MessageService} from './services/message.service';
import {FileService} from './services/file.service';
import {DownloadService} from './services/download.service';
import {ProjectService} from './services/project.service';
import {BuildService} from './services/build.service';

export class Lib {
  messageService: MessageService;
  fileService: FileService;
  downloadService: DownloadService;
  projectService: ProjectService;
  buildService: BuildService;

  constructor() {
    this.messageService = new MessageService();
    this.fileService = new FileService();
    this.downloadService = new DownloadService(this.fileService);
    this.projectService = new ProjectService(this.fileService);
    this.buildService = new BuildService(this.fileService);
  }
}

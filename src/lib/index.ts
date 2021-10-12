import {HelperService} from './services/helper.service';
import {MessageService} from './services/message.service';
import {FileService} from './services/file.service';
import {DownloadService} from './services/download.service';
import {ProjectService} from './services/project.service';
import {BuildService} from './services/build.service';
import {WebService} from './services/web.service';

export class Lib {
  helperService: HelperService;
  messageService: MessageService;
  fileService: FileService;
  downloadService: DownloadService;
  projectService: ProjectService;
  buildService: BuildService;
  webService: WebService;

  constructor() {
    this.helperService = new HelperService();
    this.messageService = new MessageService();
    this.fileService = new FileService();
    this.downloadService = new DownloadService(this.fileService);
    this.projectService = new ProjectService(this.fileService);
    this.webService = new WebService(
      this.helperService,
      this.fileService,
      this.projectService
    );
    this.buildService = new BuildService(
      this.helperService,
      this.fileService,
      this.downloadService,
      this.projectService,
      this.webService
    );
  }
}

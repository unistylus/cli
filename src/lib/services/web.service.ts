import {ProcessPartsByGroupResult} from './project.service';

export class WebService {
  constructor() {}

  buildHTMLContent(main: string, menu: string) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <link rel="stylesheet" href="index.css">
</head>
<body>

  <sidebar>
${menu}
  </sidebar>

  <main>
${main}
  </main>

  <script src="index.js"></script>
</body>
</html>
    `;
  }

  buildMenu(processedResult: ProcessPartsByGroupResult[]) {
    return 'TODO: menu ...';
  }

  buildIndex(processedResult: ProcessPartsByGroupResult[]) {
    return 'TODO: index ...';
  }
}

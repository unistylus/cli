import {resolve} from 'path';

import {FileService} from './file.service';

export interface DotUnistylusRCDotJson {
  name: string;
  out?: string;
  copies?: string[];
  variables?: SoulGeneratingVariables;
}

export interface SoulGeneratingVariables
  extends Record<
    string,
    undefined | string[] | number[] | Record<string, number>
  > {
  fonts?: string[];
  directions?: string[];
  size_steps?: Record<string, number>;
  size_variants?: Record<string, number>;
  palettes?: string[];
  palette_variants?: string[];
  palettes_and_palette_variants?: never[];
  directions_and_size_steps?: never[];
  palettes_and_size_steps?: never[];
  palettes_and_size_variants?: never[];
}

export type PartProcessedResult = Array<
  PartProcessedItem | PartProcessedItem[]
>;

export interface PartProcessedItem {
  exportPath: string;
  scssPath: string;
  scssContent: string;
}

export class ProjectService {
  public readonly rcFile = '.unistylusrc.json';
  public readonly defaultVariables: SoulGeneratingVariables = {
    fonts: ['head', 'body', 'quote', 'code'],
    directions: ['top', 'right', 'bottom', 'left'],
    size_steps: {'1x': 1, '2x': 2, '3x': 3, '4x': 4, '5x': 5, '6x': 6, '7x': 7},
    size_variants: {xs: 0.6, sm: 0.8, lg: 1.2, xl: 1.5},
    palettes: [
      'primary',
      'secondary',
      'tertiary',
      'success',
      'warning',
      'danger',
      'dark',
      'medium',
      'light',
      'background',
      'foreground',
    ],
    palette_variants: ['contrast', 'shade', 'tint'],
    palettes_and_palette_variants: [],
    directions_and_size_steps: [],
    palettes_and_size_steps: [],
    palettes_and_size_variants: [],
  };

  private cachedRCJson?: DotUnistylusRCDotJson;

  constructor(private fileService: FileService) {}

  isValid(projectPath = '.') {
    return this.fileService.exists(resolve(projectPath, this.rcFile));
  }

  createDotUnistylusRCDotJson(projectPath = '.') {
    return this.fileService.createJson(resolve(projectPath, this.rcFile), {
      name: 'foo',
      out: 'dist',
    });
  }

  async readDotUnistylusRCDotJson(projectPath = '.') {
    if (this.cachedRCJson) {
      return this.cachedRCJson;
    }
    this.cachedRCJson = await this.fileService.readJson<DotUnistylusRCDotJson>(
      resolve(projectPath, this.rcFile)
    );
    return this.cachedRCJson as DotUnistylusRCDotJson;
  }
}

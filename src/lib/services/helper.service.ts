export class HelperService {
  constructor() {}

  untabCodeBlock(code: string, totalSpaces = 6) {
    return code.replace(new RegExp(`(\n {${totalSpaces}})`, 'g'), '\n');
  }

  flatNestedArray<Type>(input: Array<Type | Type[]>) {
    return input.reduce(
      (result, item) =>
        (result as Type[]).concat(item instanceof Array ? item : [item]),
      [] as Type[]
    ) as Type[];
  }
}

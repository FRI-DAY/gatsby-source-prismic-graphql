export function parseQueryString(qs: string = '', delimiter: string = '&'): Map<string, string> {
  return new Map(
    qs.split(delimiter).map(item => {
      const [key, ...value] = item.split('=').map(part => {
        try {
          return decodeURIComponent(part.trim());
        } catch (ex) {
          return part.trim();
        }
      });
      return [key, value.join('=')] as [string, string];
    })
  );
}

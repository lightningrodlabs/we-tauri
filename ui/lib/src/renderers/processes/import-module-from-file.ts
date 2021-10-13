export function esm(templateStrings: any, ...substitutions: any) {
  let js = templateStrings.raw[0];
  for (let i = 0; i < substitutions.length; i++) {
    js += substitutions[i] + templateStrings.raw[i + 1];
  }
  return (
    'data:text/javascript;base64,' + btoa(unescape(encodeURIComponent(js)))
  );
}
export async function importModuleFromFile(file: File) {
  const text = await file.text();
  // prettier-ignore
  const module = await import(esm`${text}`);

  return module;
}

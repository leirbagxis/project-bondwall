export const renderTemplate = (text, variables) => {
  return text.replace(/{{(.*?)}}/g, (_, key) => variables[key.trim()] ?? '');
}

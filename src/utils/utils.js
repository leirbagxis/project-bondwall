export const renderTemplate = (text, variables) => {
  return text.replace(/{{(.*?)}}/g, (_, key) => variables[key.trim()] ?? '');
}

export function buildKeyboard(buttonsConfig, variables = {}) {
  if (!Array.isArray(buttonsConfig)) return [];

  return buttonsConfig.map(row => {
    if (!Array.isArray(row)) return [];
    return row.map(btn => ({
      text: renderTemplate(btn.label, variables),
      callback_data: renderTemplate(btn.callback, variables)
    }));
  });
}

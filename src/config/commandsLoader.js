import fs from 'fs';
import YAML from 'yaml';

let commands = [];

export function loadCommands() {
  const file = fs.readFileSync('./src/config/commands.yml', 'utf-8');
  if (!file) throw new Error('Arquivo commands.yml está vazio!');
  commands = YAML.parse(file);
  if (!Array.isArray(commands)) throw new Error('Formato inválido no YAML!');
}

export function getCommand(name) {
  return commands.find(cmd => cmd.name === name);
}
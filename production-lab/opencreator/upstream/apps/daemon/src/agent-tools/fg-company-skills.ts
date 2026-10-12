import { lstat, readFile, readdir, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve, sep } from 'node:path';

const namePattern = /^fg-[a-z0-9][a-z0-9-]{0,99}$/;

/** Read only the deployment's packaged company skills, never personal homes. */
export function companySkillReader(root: string | undefined) {
  async function read(name: string, resource = 'SKILL.md', offset = 0, maxChars = 8000) {
    if (!root || !namePattern.test(name) || isAbsolute(resource)
      || resource.split(/[\\/]/).some(part => part === '..' || part === '')
      || !resource.endsWith('.md')) throw new Error('Company skill resource is not allowed');
    if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(maxChars)
      || maxChars < 1 || maxChars > 12000) throw new Error('Company skill range is invalid');
    const canonicalRoot = await realpath(root);
    const skillRoot = resolve(canonicalRoot, name);
    if (!(await lstat(skillRoot)).isDirectory() || (await lstat(skillRoot)).isSymbolicLink()) {
      throw new Error('Company skill directory is not allowed');
    }
    const path = await realpath(resolve(skillRoot, resource));
    const withinSkill = relative(skillRoot, path);
    if (!withinSkill || isAbsolute(withinSkill) || withinSkill === '..' || withinSkill.startsWith('..' + sep)) {
      throw new Error('Company skill resource is not allowed');
    }
    const file = await lstat(path);
    if (!file.isFile() || file.size > 2 * 1024 * 1024) throw new Error('Company skill resource is invalid');
    const text = await readFile(path, 'utf8');
    if (offset > text.length) throw new Error('Company skill range is invalid');
    const content = text.slice(offset, offset + maxChars);
    return { name, resource, content, offset, nextOffset: offset + content.length,
      totalChars: text.length, hasMore: offset + content.length < text.length };
  }
  return {
    read,
    async list() {
      if (!root) throw new Error('Company skills are unavailable');
      const entries = await readdir(root, { withFileTypes: true });
      const skills = [];
      for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
        if (!entry.isDirectory() || !namePattern.test(entry.name)) continue;
        const skill = await read(entry.name);
        const description = /^description:\s*(.+)$/m.exec(skill.content)?.[1] ?? '';
        skills.push({ name: entry.name, description: description.slice(0, 180) });
      }
      return { skills };
    }
  };
}

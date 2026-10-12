import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Fastify from 'fastify';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { companySkillReader } from '../../src/agent-tools/fg-company-skills.js';
import { createCreatorToolDefinitions } from '../../src/agent-tools/creator-tools.js';
import { createAgentCapabilityTokenStore } from '../../src/agent-tools/capability-token.js';
import { AGENT_CREATOR_MCP_ROUTE, registerCreatorMcpRoute } from '../../src/agent-tools/mcp-routes.js';

describe('packaged company skill reader', () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'fg-skills-'));
    await mkdir(join(root, 'fg-cover', 'references'), { recursive: true });
    await writeFile(join(root, 'fg-cover', 'SKILL.md'), '---\nname: fg-cover\ndescription: Cover rules\n---\nRead references/layout.md.');
    await writeFile(join(root, 'fg-cover', 'references', 'layout.md'), 'Keep the subject inside the safe area.');
  });
  afterEach(async () => { vi.unstubAllEnvs(); await rm(root, { recursive: true, force: true }); });

  it('lists only company skills and paginates the actual referenced Markdown', async () => {
    await mkdir(join(root, 'personal-skill'));
    const reader = companySkillReader(root);
    expect(await reader.list()).toEqual({ skills: [{ name: 'fg-cover', description: 'Cover rules' }] });
    const first = await reader.read('fg-cover', 'references/layout.md', 0, 7);
    const rest = await reader.read('fg-cover', 'references/layout.md', first.nextOffset);
    expect(first.content + rest.content).toBe('Keep the subject inside the safe area.');
    expect(first.hasMore).toBe(true);
    expect(rest.hasMore).toBe(false);
    expect(rest.nextOffset).toBe(rest.totalChars);
  });

  it.each(['../fg-cover', 'personal-skill', 'fg-cover/../../secret'])('rejects invalid skill name %s', async name => {
    await expect(companySkillReader(root).read(name)).rejects.toThrow('not allowed');
  });

  it.each(['../secret.md', 'references/../../secret.md', '/etc/passwd.md', 'references\\..\\secret.md', 'secret.json', 'references//layout.md'])('rejects invalid resource %s', async resource => {
    await expect(companySkillReader(root).read('fg-cover', resource)).rejects.toThrow('not allowed');
  });

  it('rejects linked skill directories and resources escaping their skill', async () => {
    await writeFile(join(root, 'secret.md'), 'Not a company skill resource');
    await symlink(join(root, 'secret.md'), join(root, 'fg-cover', 'linked.md'));
    await symlink(join(root, 'fg-cover'), join(root, 'fg-linked'), 'dir');
    await expect(companySkillReader(root).read('fg-cover', 'linked.md')).rejects.toThrow('not allowed');
    await expect(companySkillReader(root).read('fg-linked')).rejects.toThrow('not allowed');
    expect((await companySkillReader(root).list()).skills).toHaveLength(1);
  });

  it('fails closed without the packaged root and rejects oversized or invalid ranges', async () => {
    await expect(companySkillReader(undefined).list()).rejects.toThrow('unavailable');
    await expect(companySkillReader(undefined).read('fg-cover')).rejects.toThrow('not allowed');
    await writeFile(join(root, 'fg-cover', 'large.md'), 'x'.repeat(2 * 1024 * 1024 + 1));
    await expect(companySkillReader(root).read('fg-cover', 'large.md')).rejects.toThrow('invalid');
    for (const [offset, max] of [[-1, 8000], [0, 12001], [10000, 8000], [1.5, 8000]]) {
      await expect(companySkillReader(root).read('fg-cover', 'SKILL.md', offset, max)).rejects.toThrow('invalid');
    }
  });

  it('reads through strict tool schemas without requesting another runtime endpoint', async () => {
    const request = vi.fn();
    const tools = createCreatorToolDefinitions({ request, companySkillRoot: root });
    expect((await tools.creator_read_company_skill.execute({ name: 'fg-cover' })).content).toContain('Cover rules');
    await expect(tools.creator_read_company_skill.execute({ name: 'fg-cover', jobId: 'other-job' })).rejects.toThrow();
    expect(request).not.toHaveBeenCalled();
  });

  it('exposes Skill tools only to an active job-bound Creator capability', async () => {
    vi.stubEnv('FG_COMPANY_SKILL_ROOT', root);
    const capabilities = createAgentCapabilityTokenStore();
    const server = Fastify();
    await registerCreatorMcpRoute(server, { capabilities, getBaseUrl: () => 'http://127.0.0.1:1' });
    const address = await server.listen({ host: '127.0.0.1', port: 0 });
    const clients: Client[] = [];
    async function connect(token: string) {
      const client = new Client({ name: 'company-skill-test', version: '1' });
      clients.push(client);
      await client.connect(new StreamableHTTPClientTransport(new URL(AGENT_CREATOR_MCP_ROUTE, address), {
        requestInit: { headers: { authorization: 'Bearer ' + token } }
      }));
      return client;
    }
    try {
      const grant = capabilities.issue({ runId: 'run-1', threadId: 'thread-1', jobId: 'job-1', createdBy: 'api', scopes: ['creator:context'] });
      const client = await connect(grant.token);
      expect((await client.listTools()).tools.map(tool => tool.name)).toContain('creator_read_company_skill');
      const result = await client.callTool({ name: 'creator_read_company_skill', arguments: { name: 'fg-cover' } });
      expect(result.isError).not.toBe(true);
      expect(JSON.stringify(result)).toContain('Cover rules');
      const denied = await client.callTool({ name: 'creator_read_company_skill', arguments: { name: 'fg-cover', resource: '../secret.md' } });
      expect(denied.isError).toBe(true);
      capabilities.revokeRun('run-1');
      await expect(client.listTools()).rejects.toThrow();

      const noJob = capabilities.issue({ runId: 'run-2', threadId: 'thread-2', createdBy: 'api', scopes: ['creator:context'] });
      expect((await (await connect(noJob.token)).listTools()).tools.map(tool => tool.name)).not.toContain('creator_read_company_skill');
      const wrongScope = capabilities.issue({ runId: 'run-3', threadId: 'thread-3', jobId: 'job-3', createdBy: 'api', scopes: ['creator:artifact:read'] });
      expect((await (await connect(wrongScope.token)).listTools()).tools.map(tool => tool.name)).not.toContain('creator_list_company_skills');
      const unauthorized = await fetch(new URL(AGENT_CREATOR_MCP_ROUTE, address), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) });
      expect(unauthorized.status).toBe(401);
    } finally {
      await Promise.all(clients.map(client => client.close()));
      capabilities.close();
      await server.close();
    }
  });
});

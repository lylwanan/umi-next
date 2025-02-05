import { Env, Service } from '@umijs/core';
import { rimraf } from '@umijs/utils';
import { existsSync } from 'fs';
import { join, normalize } from 'path';
import { PageGenerator } from './page';

const fixtures = join(__dirname, '../../../fixtures');
const cwd = join(fixtures, 'generate');

async function runGenerator(args: any) {
  const service = new Service({
    cwd,
    env: Env.test,
    plugins: [require.resolve('./page')],
  });
  await service.run({
    name: 'generate',
    args,
  });
}

test('generate page', async () => {
  await runGenerator({
    _: ['generate', 'page', 'index'],
    dir: true,
  });
  expect(existsSync(join(cwd, 'pages', 'index', 'index.tsx'))).toEqual(true);
  expect(existsSync(join(cwd, 'pages', 'index', 'index.less'))).toEqual(true);
  rimraf.sync(join(cwd, 'pages'));
});

test('Generator not found', async () => {
  await expect(
    runGenerator({
      _: ['generate', 'foo'],
    }),
  ).rejects.toThrow(/Generator foo not found/);
});

describe('page generator', function () {
  describe('in Non dir Mode', function () {
    it('generate page files page', async () => {
      await expectPageGeneratorArgsMatchesGeneratedFiles(
        { _: ['page', 'foo'], dir: false },
        [
          {
            target: '/pages/foo.tsx',
            path: 'templates/generate/page/index.tsx.tpl',
            name: 'foo',
            baseDir: '/pages/',
          },
          {
            target: '/pages/foo.less',
            path: 'templates/generate/page/index.less.tpl',
            name: 'foo',
            baseDir: '/pages/',
          },
        ],
      );
    });

    it('generate nested folder and page files', async () => {
      await expectPageGeneratorArgsMatchesGeneratedFiles(
        { _: ['page', 'foo/bar'], dir: false },
        [
          {
            target: '/pages/foo/bar.tsx',
            path: 'templates/generate/page/index.tsx.tpl',
            name: 'bar',
            baseDir: '/pages/',
          },
          {
            target: '/pages/foo/bar.less',
            path: 'templates/generate/page/index.less.tpl',
            name: 'bar',
            baseDir: '/pages/',
          },
        ],
      );
    });
  });

  describe('in dir mode', function () {
    it('generate index files in folder', async () => {
      await expectPageGeneratorArgsMatchesGeneratedFiles(
        { _: ['page', 'foo'], dir: true },
        [
          {
            target: '/pages/foo',
            path: 'templates/generate/page',
            name: 'index',
          },
        ],
      );
    });

    it('generate nested folder and index files', async () => {
      await expectPageGeneratorArgsMatchesGeneratedFiles(
        { _: ['page', 'foo/bar'], dir: true },
        [
          {
            target: '/pages/foo/bar',
            path: 'templates/generate/page',
            name: 'index',
          },
        ],
      );
    });
  });

  async function expectPageGeneratorArgsMatchesGeneratedFiles(
    args: { _: string[]; dir: boolean },
    fileGenerations: {
      name: string;
      target: string;
      path: string;
      baseDir?: string;
    }[],
  ) {
    const generateFile = jest.fn().mockResolvedValue(null);
    const g = new PageGenerator({
      absPagesPath: normalize('/pages/'),
      args,
      generateFile,
    });

    await g.run();

    expect(generateFile).toBeCalledTimes(fileGenerations.length);
    for (const [i, f] of fileGenerations.entries()) {
      expect(generateFile).toHaveBeenNthCalledWith(i + 1, {
        data: { name: f.name, color: expect.anything(), cssExt: '.less' },
        target: normalize(f.target),
        path: expect.stringContaining(normalize(f.path)),
        baseDir: f.baseDir ? normalize(f.baseDir) : undefined,
      });
    }
  }
});

describe('page generate in interactive way', function () {
  it('generate index page when no answer', async () => {
    const generateFile = jest.fn().mockResolvedValue(null);
    const prompts = jest.fn();

    const g = new PageGenerator({
      absPagesPath: '/pages/',
      args: { _: [] },
      generateFile,
    });

    g.setPrompter(prompts as any);
    prompts.mockResolvedValueOnce({ name: '' });
    prompts.mockResolvedValueOnce({ mode: 'file' });

    await g.run();

    expect(g.getDirMode()).toEqual(false);
    expect(prompts).toBeCalledTimes(2);
    expect(prompts).toHaveBeenNthCalledWith(1, {
      type: 'text',
      name: 'name',
      message: 'What is the name of page?',
    });
    expect(prompts).toHaveBeenNthCalledWith(2, {
      type: 'select',
      name: 'mode',
      message: 'How dou you want page files to be created?',
      choices: [
        { title: normalize('index/index.{tsx,less}'), value: 'dir' },
        { title: normalize('index.{tsx,less}'), value: 'file' },
      ],
      initial: 0,
    });
  });

  it('generate index page when answer file name', async () => {
    const generateFile = jest.fn().mockResolvedValue(null);
    const prompts = jest.fn();
    const g = new PageGenerator({
      absPagesPath: '/pages/',
      args: { _: [] },
      generateFile,
    });

    g.setPrompter(prompts as any);
    prompts.mockResolvedValueOnce({ name: 'aaa/bbb' });
    prompts.mockResolvedValueOnce({ mode: 'dir' });

    await g.run();

    expect(g.getDirMode()).toEqual(true);
    expect(prompts).toBeCalledTimes(2);
    expect(prompts).toHaveBeenNthCalledWith(1, {
      type: 'text',
      name: 'name',
      message: 'What is the name of page?',
    });
    expect(prompts).toHaveBeenNthCalledWith(2, {
      type: 'select',
      name: 'mode',
      message: 'How dou you want page files to be created?',
      choices: [
        { title: normalize('aaa/bbb/index.{tsx,less}'), value: 'dir' },
        { title: normalize('aaa/bbb.{tsx,less}'), value: 'file' },
      ],
      initial: 0,
    });
  });
});

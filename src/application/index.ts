import {
  apply,
  chain,
  url,
  move,
  template,
  mergeWith,
  TemplateOptions,
  schematic,
  noop,
  Tree,
} from '@angular-devkit/schematics';

import { stringUtils, FileNotFoundException } from '../utils';
import { Schema as ApplicationOptions } from './schema';
import { getNsCli } from '../ns-cli-utils';

export default function (options: ApplicationOptions) {
  const appPath = options.name;
  const sourcedir = options.sourceDir;
  const routing = options.routing && !options.minimal;

  return chain([
    mergeWith(
      apply(url('./_package_json'), [
        template(<TemplateOptions>{
          name: options.name,
          utils: stringUtils,
        }),
        move(appPath),
      ]),
    ),

    (tree: Tree) => {
      const packageJsonPath = `${appPath}/package.json`;
      const packageJson = tree.get(packageJsonPath);
      if (!packageJson) {
        throw new FileNotFoundException(packageJsonPath);

      }
      const packageJsonContent = packageJson.content.toString();
      const nsConfigContent = getNsConfig(options);
      const projectDataOptions = getProjectDataOptions(packageJsonContent, nsConfigContent);

      options = Object.assign({}, options, projectDataOptions);
    },

    mergeWith(
      apply(url('./_files'), [
        template(<TemplateOptions>{
          ...options as any,
          utils: stringUtils,
          routing,
          sourcedir,
          dot: '.',
        }),
        move(appPath),
      ]),
    ),

    routing ?
      mergeWith(
        apply(url('./_routing-files'), [
          template(<TemplateOptions>{
            ...options as any,
            utils: stringUtils,
            routing,
            sourcedir,
            dot: '.',
          }),
          move(appPath),
        ]),
      ) :
      noop(),

    schematic('ng-cli-config', {
      path: appPath,
      style: options.style,
      sourceDir: options.sourceDir,
    }),
    schematic('app-resources', {
      path: `${appPath}/${sourcedir}`,
    }),
    schematic('styling', {
      appPath,
      sourceDir: sourcedir,
      extension: options.style,
      theme: options.theme,
    }),
  ])
}

const getNsConfig = (options: ApplicationOptions) => {
  const cli = getNsCli();

  const nsConfData = {};
  if (options.sourceDir) {
    nsConfData[cli.constants.CONFIG_NS_APP_ENTRY] = options.sourceDir;
  }

  if (options.appResourcesDir) {
    nsConfData[cli.constants.CONFIG_NS_APP_RESOURCES_ENTRY] = options.appResourcesDir;
  }

  const nsConfigContent = cli.projectDataService.getNsConfigDefaultContent(nsConfData);

  return nsConfigContent;
};

const getProjectDataOptions = (packageJsonContent: string, nsConfigContent: string) => {
  const cli = getNsCli();
  const projectData = cli.projectDataService.getProjectDataFromContent(packageJsonContent, nsConfigContent); 

  return {
    sourceDir: projectData.getAppDirectoryRelativePath(),
    appResourcesDir: projectData.getAppResourcesRelativeDirectoryPath(),
  };
};

import { getPath } from 'global-modules-path';

export const getNsCli = () => {
    const cliPath = getPath('nativescript', 'tns');
    const cli = require(cliPath);

    return cli;
}

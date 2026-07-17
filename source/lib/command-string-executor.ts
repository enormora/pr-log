import { execa, parseCommandString } from 'execa';
import type { GitCommandExecutor } from './git-command-runner.ts';

type CommandStringExecutorOptions = {
    readonly workingDirectory: string;
};

export function createCommandStringExecutor(options: CommandStringExecutorOptions): GitCommandExecutor {
    return async function executeCommandString(command) {
        const [ file, ...commandArguments ] = parseCommandString(command);

        if (file === undefined) {
            throw new TypeError('Cannot execute an empty command');
        }

        return execa(file, commandArguments, { cwd: options.workingDirectory });
    };
}

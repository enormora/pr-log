export type CommandLineInterfaceErrorReporterOptions = {
    readonly isTracingEnabled: boolean;
};

export type CommandLineInterfaceErrorReporter = (
    error: Readonly<Error>,
    options: CommandLineInterfaceErrorReporterOptions
) => void;

export type CommandLineInterfaceErrorReporterDependencies = {
    readonly writeError: (message: string | undefined) => void;
    readonly setExitCode: (exitCode: number) => void;
};

export function createCommandLineInterfaceErrorReporter(
    dependencies: CommandLineInterfaceErrorReporterDependencies
): CommandLineInterfaceErrorReporter {
    const { writeError, setExitCode } = dependencies;

    return function reportCommandLineInterfaceError(error, options) {
        const message = options.isTracingEnabled ? error.stack : `Error: ${error.message}`;

        writeError(message);
        setExitCode(1);
    };
}

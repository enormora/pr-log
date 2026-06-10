export type ErrorReporterOptions = {
    readonly isTracingEnabled: boolean;
};

export type ErrorReporter = (error: Readonly<Error>, options: ErrorReporterOptions) => void;

export type ErrorReporterDependencies = {
    readonly writeError: (message: string | undefined) => void;
    readonly setExitCode: (exitCode: number) => void;
};

export function createErrorReporter(dependencies: ErrorReporterDependencies): ErrorReporter {
    const { writeError, setExitCode } = dependencies;

    return function reportError(error, options) {
        const message = options.isTracingEnabled ? error.stack : `Error: ${error.message}`;

        writeError(message);
        setExitCode(1);
    };
}

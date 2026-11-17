import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http';
import type {
    DeterministicGitHubApiScenario,
    DeterministicGitHubChangedFile,
    DeterministicGitHubErrorResponse,
    DeterministicGitHubFilePage,
    DeterministicGitHubPullRequestFiles
} from './deterministic-github-api-scenarios.ts';

export type DeterministicGitHubApiRequest = {
    readonly method: string;
    readonly path: string;
    readonly search: string;
};

export type DeterministicGitHubApiServer = {
    readonly baseUrl: string;
    readonly requests: () => readonly DeterministicGitHubApiRequest[];
    readonly stop: () => Promise<void>;
};

const okStatus = 200;
const notFoundStatus = 404;

type DeterministicGitHubApiState = {
    readonly baseUrl: () => string;
    readonly filesByPullRequestId: ReadonlyMap<number, DeterministicGitHubPullRequestFiles>;
    readonly recordRequest: (request: DeterministicGitHubApiRequest) => void;
};

type PullRequestFilesRoute = {
    readonly pullRequestId: number;
    readonly page: number;
    readonly path: string;
};

function changedFileResponse(file: DeterministicGitHubChangedFile): Record<string, unknown> {
    return {
        filename: file.path,
        previous_filename: file.previousPath ?? null,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes
    };
}

function writeJson(response: ServerResponse, statusCode: number, body: unknown, headers: Headers): void {
    response.writeHead(statusCode, {
        'content-type': 'application/json',
        ...Object.fromEntries(headers)
    });
    response.end(JSON.stringify(body));
}

function pullRequestFilesRoute(request: IncomingMessage, url: URL): PullRequestFilesRoute | undefined {
    const match = /^\/repos\/[^/]+\/[^/]+\/pulls\/(?<pullRequestId>\d+)\/files$/u.exec(url.pathname);

    if (request.method !== 'GET' || match?.groups?.pullRequestId === undefined) {
        return undefined;
    }

    return {
        pullRequestId: Number.parseInt(match.groups.pullRequestId, 10),
        page: Number.parseInt(url.searchParams.get('page') ?? '1', 10),
        path: url.pathname
    };
}

function pageAt(pullRequestFiles: DeterministicGitHubPullRequestFiles, page: number): DeterministicGitHubFilePage {
    return pullRequestFiles.pages[page - 1] ?? { files: [] };
}

function responseHeaders(
    state: DeterministicGitHubApiState,
    filesRoute: PullRequestFilesRoute,
    pullRequestFiles: DeterministicGitHubPullRequestFiles
): Headers {
    const headers = new Headers();

    if (filesRoute.page < pullRequestFiles.pages.length) {
        headers.set(
            'link',
            `<${state.baseUrl()}${filesRoute.path}?page=${filesRoute.page + 1}>; rel="next"`
        );
    }

    return headers;
}

function writeError(response: ServerResponse, error: DeterministicGitHubErrorResponse): void {
    writeJson(response, error.status, error.body, new Headers());
}

function routePullRequestFiles(
    state: DeterministicGitHubApiState,
    request: IncomingMessage,
    url: URL,
    response: ServerResponse
): boolean {
    const filesRoute = pullRequestFilesRoute(request, url);

    if (filesRoute === undefined) {
        return false;
    }

    const pullRequestFiles = state.filesByPullRequestId.get(filesRoute.pullRequestId);

    if (pullRequestFiles?.error !== undefined) {
        writeError(response, pullRequestFiles.error);
        return true;
    }

    const effectivePullRequestFiles = pullRequestFiles ?? {
        pullRequestId: filesRoute.pullRequestId,
        pages: [],
        error: undefined
    };
    writeJson(
        response,
        okStatus,
        pageAt(effectivePullRequestFiles, filesRoute.page).files.map(changedFileResponse),
        responseHeaders(state, filesRoute, effectivePullRequestFiles)
    );
    return true;
}

function requestUrl(request: IncomingMessage): URL {
    return new URL(request.url ?? '/', 'http://localhost');
}

function route(state: DeterministicGitHubApiState, request: IncomingMessage, response: ServerResponse): void {
    const url = requestUrl(request);
    state.recordRequest({
        method: request.method ?? 'GET',
        path: url.pathname,
        search: url.search
    });

    if (routePullRequestFiles(state, request, url, response)) {
        return;
    }

    writeJson(response, notFoundStatus, { message: 'not found' }, new Headers());
}

function filesByPullRequestId(
    scenario: DeterministicGitHubApiScenario
): ReadonlyMap<number, DeterministicGitHubPullRequestFiles> {
    return new Map(scenario.pullRequestFiles.map(function (pullRequestFiles) {
        return [ pullRequestFiles.pullRequestId, pullRequestFiles ];
    }));
}

async function listen(server: Server): Promise<void> {
    await new Promise<void>(function (resolve) {
        server.listen(0, '127.0.0.1', resolve);
    });
}

async function close(server: Server): Promise<void> {
    await new Promise<void>(function (resolve) {
        server.close(function () {
            resolve();
        });
    });
}

function baseUrl(server: Server): string {
    return `http://127.0.0.1:${Reflect.get(new Object(server.address()), 'port')}`;
}

export async function createDeterministicGitHubApiServer(
    scenario: DeterministicGitHubApiScenario
): Promise<DeterministicGitHubApiServer> {
    let requests: readonly DeterministicGitHubApiRequest[] = [];
    const server = createServer(function (request, response) {
        route(
            {
                baseUrl() {
                    return baseUrl(server);
                },
                filesByPullRequestId: filesByPullRequestId(scenario),
                recordRequest(recordedRequest) {
                    requests = [ ...requests, recordedRequest ];
                }
            },
            request,
            response
        );
    });

    await listen(server);

    return {
        baseUrl: baseUrl(server),
        requests() {
            return requests;
        },
        async stop() {
            await close(server);
        }
    };
}

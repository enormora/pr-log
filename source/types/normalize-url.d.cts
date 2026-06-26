declare module 'normalize-url' {
    namespace normalizeUrl {
        type Options = {
            readonly defaultProtocol?: string;
            readonly forceHttp?: boolean;
            readonly forceHttps?: boolean;
            readonly normalizeProtocol?: boolean;
            readonly removeDirectoryIndex?: boolean | readonly (RegExp | string)[];
            readonly removeQueryParameters?: boolean | readonly (RegExp | string)[];
            readonly removeSingleSlash?: boolean;
            readonly removeTrailingSlash?: boolean;
            readonly sortQueryParameters?: boolean;
            readonly stripAuthentication?: boolean;
            readonly stripHash?: boolean;
            readonly stripProtocol?: boolean;
            readonly stripTextFragment?: boolean;
            readonly stripWWW?: boolean;
        };
    }

    function normalizeUrl(url: string, options?: normalizeUrl.Options): string;

    export = normalizeUrl;
}

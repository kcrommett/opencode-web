import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";

describe("validateProjectWorktrees", () => {
    let validateProjectWorktrees: any;
    let httpApi: any;

    beforeEach(async () => {
        mock.module("./opencode-http-api", () => ({
            listFiles: mock(),
            OpencodeHttpError: class extends Error {
                public status: number;
                constructor(message?: string, status: number = 500) {
                    super(message);
                    this.status = status;
                }
            },
            updateConfigFileLocal: mock(),
            readConfigFromScope: mock(),
            getAgents: mock(),
            getProviders: mock(),
            getSessions: mock(),
            getSession: mock(),
            createSession: mock(),
            deleteSession: mock(),
            updateSession: mock(),
            getMessages: mock(),
            getMessage: mock(),
            getSessionTodos: mock(),
            sendMessage: mock(),
            abortSession: mock(),
            shareSession: mock(),
            unshareSession: mock(),
            forkSession: mock(),
            revertMessage: mock(),
            unrevertSession: mock(),
            runCommand: mock(),
            findFiles: mock(),
            findInFiles: mock(),
            findSymbols: mock(),
            readFile: mock(),
            getFileStatus: mock(),
            getFileDiff: mock(),
            respondToPermission: mock(),
            getConfig: mock(),
            getSessionChildren: mock(),
            initSession: mock(),
            summarizeSession: mock(),
            appendPrompt: mock(),
            submitPrompt: mock(),
            clearPrompt: mock(),
            executeCommand: mock(),
            showToast: mock(),
            openTuiHelp: mock(),
            openTuiSessions: mock(),
            openTuiThemes: mock(),
            openTuiModels: mock(),
            publishTuiEvent: mock(),
            getNextTuiControlRequest: mock(),
            respondToTuiControl: mock(),
            listProjects: mock(),
            getCurrentProject: mock(),
            getCurrentPath: mock(),
            getToolIds: mock(),
            getTools: mock(),
            getCommands: mock(),
            updateConfig: mock(),
            setAuth: mock(),
            getLspStatus: mock(),
            getFormatterStatus: mock(),
            logEvent: mock(),
            getMcpStatus: mock(),
        }));

        mock.module("@tanstack/react-start", () => ({
            createServerFn: () => {
                let validator = (d: any) => d;
                const builder = {
                    inputValidator: (v: any) => { validator = v; return builder; },
                    handler: (h: any) => async (input: any) => {
                        const data = validator(input);
                        return h({ data });
                    }
                };
                return builder;
            }
        }));

        mock.module("./config-file", () => ({
            updateConfigFileLocal: mock(),
            readConfigFromScope: mock(),
        }));

        // Import modules dynamically to ensure mocks are applied
        httpApi = await import("./opencode-http-api");
        const serverFns = await import("./opencode-server-fns");
        validateProjectWorktrees = serverFns.validateProjectWorktrees;

        // Clear mock history
        (httpApi.listFiles as any).mockClear();
    });

    afterEach(() => {
        mock.restore();
    });

    it("should return 'ok' for existing directories", async () => {
        const listFilesMock = httpApi.listFiles as unknown as ReturnType<typeof mock>;
        listFilesMock.mockResolvedValue([]); // Simulate success

        const result = await validateProjectWorktrees({
            worktrees: ["/path/to/existing"],
        });

        expect(result.existing["/path/to/existing"]).toBe("ok");
    });

    it("should return 'missing' for non-existing directories", async () => {
        const listFilesMock = httpApi.listFiles as unknown as ReturnType<typeof mock>;
        listFilesMock.mockRejectedValue(new Error("Failed to list files: Not Found"));

        const result = await validateProjectWorktrees({
            worktrees: ["/path/to/missing"],
        });

        expect(result.existing["/path/to/missing"]).toBe("missing");
    });

    it("should handle mixed results", async () => {
        const listFilesMock = httpApi.listFiles as unknown as ReturnType<typeof mock>;
        listFilesMock.mockImplementation(async (_path: string, directory?: string) => {
            if (directory === "/path/to/existing") return [];
            throw new Error("Not Found");
        });

        const result = await validateProjectWorktrees({
            worktrees: ["/path/to/existing", "/path/to/missing"],
        });

        expect(result.existing["/path/to/existing"]).toBe("ok");
        expect(result.existing["/path/to/missing"]).toBe("missing");
    });

    it("should deduplicate paths", async () => {
        const listFilesMock = httpApi.listFiles as unknown as ReturnType<typeof mock>;
        listFilesMock.mockResolvedValue([]);

        const result = await validateProjectWorktrees({
            worktrees: ["/path/to/same", "/path/to/same"],
        });

        expect(Object.keys(result.existing)).toHaveLength(1);
        expect(listFilesMock).toHaveBeenCalledTimes(1);
    });

    it("should handle an undefined payload by returning an empty map", async () => {
        const listFilesMock = httpApi.listFiles as unknown as ReturnType<typeof mock>;
        listFilesMock.mockResolvedValue([]);

        const result = await validateProjectWorktrees();

        expect(result.existing).toEqual({});
        expect(listFilesMock).not.toHaveBeenCalled();
    });

    it("should return 'missing' for internal server errors to hide dead worktrees", async () => {
        const listFilesMock = httpApi.listFiles as unknown as ReturnType<typeof mock>;
        listFilesMock.mockRejectedValue(new Error("Failed to list files: Internal Server Error"));

        const result = await validateProjectWorktrees({
            worktrees: ["/path/to/erroring"],
        });

        expect(result.existing["/path/to/erroring"]).toBe("missing");
    });
});

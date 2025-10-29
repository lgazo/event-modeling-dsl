
export type Logger = {
    debug: (message: string, ctx?: unknown) => void;
}

export type LoggerDep = {
  log: Logger;
}

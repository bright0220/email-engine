type Done = (err?: Error) => void;
declare module 'tor-request' {
  export function renewTorSession(done: Done): void;
  export const TorControlPort: {password: string; port: number};
}
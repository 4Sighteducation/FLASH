// Minimal TypeScript shims so VS Code doesn't show "red" for Supabase Edge Functions.
// These files run on Deno in Supabase Edge Runtime (not in the React Native app).

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};

declare function btoa(data: string): string;
declare function atob(data: string): string;

declare module 'https://deno.land/std@0.168.0/http/server.ts' {
  export function serve(handler: (req: Request) => Response | Promise<Response>): void;
}

declare module 'https://esm.sh/@supabase/supabase-js@2.38.4' {
  // Keep this permissive; we only need editor sanity, not full typing fidelity here.
  export function createClient(url: string, key: string): any;
}



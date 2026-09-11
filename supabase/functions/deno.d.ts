/// <reference types="@types/deno" />

declare module "npm:@supabase/supabase-js@2" {
  export * from "@supabase/supabase-js";
}

declare module "npm:*" {
  const content: any;
  export default content;
}

declare module "@supabase/supabase-js" {
  export function createClient(supabaseUrl: string, supabaseKey: string, options?: any): any;
  export type SupabaseClient = any;
}

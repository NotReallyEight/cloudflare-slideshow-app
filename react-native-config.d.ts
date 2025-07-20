declare module 'react-native-config' {
  export interface NativeConfig {
    SUPABASE_URL?: string;
    SUPABASE_KEY?: string;
    API_URL?: string;
    BEARER_TOKEN?: string;
  }

  export const Config: NativeConfig;
  export default Config;
}

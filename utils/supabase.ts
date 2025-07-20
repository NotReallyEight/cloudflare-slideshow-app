import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../database.types';
import Config from 'react-native-config';

export const supabase = createClient<Database>(
  Config.SUPABASE_URL || '',
  Config.SUPABASE_KEY || '',
);

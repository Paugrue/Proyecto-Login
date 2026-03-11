import { supabase } from './src/supabaseClient';

export class ProfileService {

    static async getMyProfile() {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .single();

        if (error) throw error;
        return data;
    }

    static async updateProfile(updates) {
        const { data, error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', (await supabase.auth.getUser()).data.user.id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}